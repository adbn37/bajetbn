import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as bwipjs from '@bwip-js/browser';
import { BarcodeCameraScanner } from '../../components/BarcodeCameraScanner';
import { CollectionItemPhoto } from '../../components/CollectionItemPhoto';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listSpaceMembers } from '../../repositories/collaborationRepository';
import {
  adjustCollectionItemQuantity,
  archiveCollectionItem,
  createCollectionInternalCode,
  createCollectionItem,
  findCollectionItemByBarcode,
  listCollectionItems,
  restoreCollectionItem,
  uploadCollectionItemPhoto,
  updateCollectionItem,
  type CollectionItemInput,
} from '../../repositories/collectionRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { CollectionItem, CollectionItemCondition, Space, SpaceMember } from '../../types/models';
import { prepareCollectionPhoto, type PreparedCollectionPhoto } from '../../utils/collectionPhotos';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

const conditions: Array<{ value: CollectionItemCondition; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'sealed', label: 'Sealed' },
  { value: 'open_box', label: 'Open box' },
  { value: 'used', label: 'Used' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'other', label: 'Other' },
];

const editableRoles = new Set(['owner', 'admin', 'contributor']);

function conditionLabel(value: CollectionItemCondition) {
  return conditions.find((item) => item.value === value)?.label || 'Other';
}

function timestampValue(value?: { toMillis?: () => number } | null) {
  return value?.toMillis?.() || 0;
}

type CollectionPageMode = 'inventory' | 'add';

export function CollectionInventoryPage() {
  return <CollectionPage mode="inventory" />;
}

export function CollectionAddItemPage() {
  return <CollectionPage mode="add" />;
}

function CollectionPage({ mode }: { mode: CollectionPageMode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<CollectionItem | null>(null);
  const [createBarcode, setCreateBarcode] = useState<string | null>(null);
  const [labelItems, setLabelItems] = useState<CollectionItem[] | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CollectionItem | null>(null);

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError('');
    try {
      const spaces = await listSpaces(user.uid);
      const nextSpace = spaces.find((item) => item.id === spaceId) || null;
      setSpace(nextSpace);
      if (!nextSpace || nextSpace.type !== 'collection') {
        setMembers([]);
        setItems([]);
        return;
      }
      const [nextMembers, nextItems] = await Promise.all([
        listSpaceMembers(spaceId),
        listCollectionItems(spaceId, true),
      ]);
      setMembers(nextMembers);
      setItems(nextItems);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  // The route loader owns this page's loading-state lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const currentMember = members.find((item) => item.uid === user?.uid);
  const canEdit = Boolean(currentMember && editableRoles.has(currentMember.role) && !space?.archivedAt);
  const activeItems = useMemo(() => items.filter((item) => !item.archivedAt), [items]);
  const archivedItems = useMemo(() => items.filter((item) => Boolean(item.archivedAt)), [items]);
  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const source = showArchived ? archivedItems : activeItems;
    if (!needle) return source;
    return source.filter((item) => [
      item.name,
      item.category,
      item.brand,
      item.series,
      item.variant,
      item.storageLocation,
      item.internalCode,
      ...item.barcodes,
      ...item.tags,
    ].some((value) => value?.toLowerCase().includes(needle)));
  }, [activeItems, archivedItems, search, showArchived]);

  const quantityTotal = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCostMinor = activeItems.reduce((sum, item) => sum + (item.purchasePriceMinor || 0) * item.quantity, 0);
  const totalValueMinor = activeItems.reduce((sum, item) => sum + (item.estimatedValueMinor || 0) * item.quantity, 0);

  const handleBarcode = useCallback(async (rawValue: string) => {
    if (!space || space.type !== 'collection') return;
    const barcode = rawValue.trim();
    if (!barcode) return;
    setError('');
    setNotice('');
    try {
      const match = await findCollectionItemByBarcode(space.id, barcode);
      if (match) {
        navigate(`/spaces/${space.id}/collection/items/${match.id}`);
        return;
      }
      if (mode === 'inventory') {
        setError('No existing item uses this barcode. Open Add item if you want to save it.');
        return;
      }
      if (!canEdit) {
        setError('Barcode not found. Ask the Space owner or manager to add this item.');
        return;
      }
      setCreateBarcode(barcode);
      setEditing(null);
      setNotice('Unknown barcode. Add the item details to save it.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }, [canEdit, mode, navigate, space]);

  const submitManualBarcode = (event: FormEvent) => {
    event.preventDefault();
    const value = manualBarcode.trim();
    if (!value) return;
    setManualBarcode('');
    void handleBarcode(value);
  };

  const runArchive = async (item: CollectionItem) => {
    setBusyId(item.id); setError('');
    try {
      await archiveCollectionItem(item.id);
      setArchiveTarget(null);
      await load();
      setNotice(`${item.name} archived.`);
    }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  };

  const runRestore = async (item: CollectionItem) => {
    setBusyId(item.id); setError('');
    try {
      await restoreCollectionItem(item.id);
      await load();
      setNotice(`${item.name} restored.`);
    }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  };

  const runAddOne = async (item: CollectionItem) => {
    setBusyId(item.id); setError('');
    try {
      await adjustCollectionItemQuantity({
	        spaceId,
        itemId: item.id,
        createdBy: user?.uid || '',
        delta: 1,
        reason: 'acquired',
        note: 'Quick +1 from inventory',
      });
      await load();
      setNotice(`${item.name} quantity increased.`);
    }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  };

  if (loading) return <main className="page"><div className="loading-panel">Loading collection...</div></main>;

  if (!space || space.type !== 'collection') {
    return <main className="page">
      <PageHeader eyebrow="Collection" title="Collection Space not found" description="Open a Collection Space before using barcode inventory." />
      {error && <div className="notice error">{error}</div>}
      <Link className="button primary" to="/spaces">Back to Spaces</Link>
    </main>;
  }

  return <main className="page collection-page">
    <PageHeader
      eyebrow={mode === 'add' ? 'Add collection item' : 'Collection inventory'}
      title={mode === 'add' ? 'Add item' : space.name}
      description={mode === 'add'
        ? `Scan or enter a barcode to add an item to ${space.name}.`
        : 'Search, review, label, and safely manage your saved collectibles.'}
      action={mode === 'add'
        ? <Link className="button secondary" to={`/spaces/${space.id}/collection`}>Back to Inventory</Link>
        : <div className="button-row">
          {canEdit && <Link className="button primary" to={`/spaces/${space.id}/collection/add`}>Add item</Link>}
          <Link className="button secondary" to={`/spaces/${space.id}`}>Back to Space</Link>
        </div>}
    />

    {space.archivedAt && <div className="notice">This Space is archived. Collection records are view-only until the Space is restored.</div>}
    {!space.archivedAt && !canEdit && <div className="notice">Your role has view-only access to this collection.</div>}
    {error && <div className="notice error">{error}</div>}
    {notice && <div className="notice success">{notice}</div>}

    {mode === 'inventory' ? <>
      <section className="summary-grid collection-summary-grid">
        <article className="summary-card featured"><span>Different items</span><strong>{activeItems.length}</strong><small>Active collection records</small></article>
        <article className="summary-card"><span>Total quantity</span><strong>{quantityTotal}</strong><small>Individual pieces</small></article>
        <article className="summary-card"><span>Total cost</span><strong>{formatMoney(totalCostMinor, space.currency)}</strong><small>Based on saved purchase prices</small></article>
        <article className="summary-card"><span>Estimated value</span><strong>{formatMoney(totalValueMinor, space.currency)}</strong><small>Based on saved estimates</small></article>
      </section>

      <section className="panel collection-scan-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Camera search</span>
            <h2>Find an existing item</h2>
            <p>Scan a saved barcode to open its details without changing quantity.</p>
          </div>
        </div>
        <BarcodeCameraScanner startLabel="Find with camera" onDetected={handleBarcode} onError={setError} />
      </section>

      <section className="panel collection-list-panel">
        <div className="panel-heading collection-list-heading">
          <div><span className="eyebrow">Inventory</span><h2>{showArchived ? 'Archived items' : 'Active collection'}</h2></div>
          <div className="collection-list-actions">
            <input
              aria-label="Search collection"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, barcode, code, brand, or location"
            />
            <button className="button secondary" onClick={() => { setShowArchived((value) => !value); setSearch(''); }}>
              {showArchived ? `Active (${activeItems.length})` : `Archived (${archivedItems.length})`}
            </button>
            {!showArchived && visibleItems.length > 0 && <button className="button secondary" onClick={() => setLabelItems(visibleItems)}>Print batch labels</button>}
          </div>
        </div>

        {visibleItems.length === 0 ? <EmptyState
          title={showArchived ? 'No archived items' : search ? 'No matching items' : 'No collection items yet'}
          description={showArchived
            ? 'Archived items will appear here and can be restored.'
            : search
              ? 'Try another name, barcode, code, brand, or storage location.'
              : 'Use Add item to save the first collectible.'}
        /> : <div className="collection-item-grid">
          {visibleItems.map((item) => <article className={`collection-item-card ${item.archivedAt ? 'archived' : ''}`} key={item.id}>
            <CollectionItemPhoto
              key={item.primaryPhotoId || 'no-photo'}
              photo={(item.photos || []).find((photo) => photo.id === item.primaryPhotoId) || item.photos?.[0]}
              alt={item.name}
              className="collection-item-card-photo"
            />
            <header>
              <div><span className="eyebrow">{item.category}</span><h3>{item.name}</h3></div>
              <span className="type-badge">{conditionLabel(item.condition)}</span>
            </header>
            <div className="collection-item-meta">
              {(item.brand || item.series || item.variant) && <span>{[item.brand, item.series, item.variant].filter(Boolean).join(' - ')}</span>}
              <span><strong>{item.quantity}</strong> in collection</span>
              <span>Location: {item.storageLocation || 'Not set'}</span>
              <span>Code: {item.internalCode}</span>
              <span>Primary barcode: {item.primaryBarcode || item.internalCode}</span>
              <span>{item.barcodes.length} saved barcode{item.barcodes.length === 1 ? '' : 's'}</span>
              <span>Updated {timestampValue(item.updatedAt) ? new Date(timestampValue(item.updatedAt)).toLocaleDateString('en-BN') : 'Not recorded'}</span>
            </div>
            <footer className="button-row">
              <Link className="button primary small" to={`/spaces/${space.id}/collection/items/${item.id}`}>Details</Link>
              {!item.archivedAt && canEdit && <button className="button secondary small" disabled={busyId === item.id} onClick={() => void runAddOne(item)}>+1 quantity</button>}
              {!item.archivedAt && canEdit && <button className="button secondary small" onClick={() => { setEditing(item); setCreateBarcode(null); }}>Edit</button>}
              {!item.archivedAt && <button className="button secondary small" onClick={() => setLabelItems([item])}>Labels</button>}
              {!item.archivedAt && canEdit && <button className="text-button danger" disabled={busyId === item.id} onClick={() => setArchiveTarget(item)}>Archive</button>}
              {item.archivedAt && canEdit && <button className="button primary small" disabled={busyId === item.id} onClick={() => void runRestore(item)}>Restore</button>}
            </footer>
          </article>)}
        </div>}
      </section>
    </> : <>
      <section className="panel collection-scan-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">New item</span>
            <h2>Scan or enter a barcode</h2>
            <p>An existing barcode will open its saved item instead of creating a duplicate.</p>
          </div>
          <div className="button-row">
            {canEdit && <button className="button secondary" onClick={() => { setEditing(null); setCreateBarcode(''); }}>Add without barcode</button>}
          </div>
        </div>
        <BarcodeCameraScanner startLabel="Start camera" disabled={!canEdit} onDetected={handleBarcode} onError={setError} />
        <form className="collection-barcode-entry" onSubmit={submitManualBarcode}>
          <label>
            Barcode number or code
            <input
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              placeholder="Scan with a USB scanner or type the code"
            />
          </label>
          <button className="button secondary" disabled={!manualBarcode.trim()}>Find barcode</button>
        </form>
      </section>

      <section className="panel">
        <span className="eyebrow">Safe adding</span>
        <h2>New items only</h2>
        <p>BajetBN checks the barcode before opening the Add Item form. Existing items are shown without changing their quantity.</p>
      </section>
    </>}

    {(createBarcode !== null || editing) && <CollectionItemForm
      key={editing?.id || createBarcode || 'new-item'}
      space={space}
      userId={user?.uid || ''}
      initial={editing}
      scannedBarcode={createBarcode || ''}
      onClose={() => { setEditing(null); setCreateBarcode(null); }}
      onSaved={async (savedMessage) => {
        const message = savedMessage || (editing ? 'Collection item updated.' : 'Collection item added.');
        setEditing(null);
        setCreateBarcode(null);
        setSearch('');
        setShowArchived(false);
        await load();
        setNotice(message);
        if (mode === 'add') {
          navigate(`/spaces/${space.id}/collection`);
          return;
        }
      }}
    />}

    {archiveTarget && <Modal title={`Archive ${archiveTarget.name}?`} onClose={() => setArchiveTarget(null)}>
      <div className="form-stack">
        <p>This item will move to Archived items. Its barcode, quantity, and history will be kept.</p>
        <div className="notice">You can restore this item later.</div>
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={busyId === archiveTarget.id} onClick={() => setArchiveTarget(null)}>Cancel</button>
          <button type="button" className="button danger" disabled={busyId === archiveTarget.id} onClick={() => void runArchive(archiveTarget)}>
            {busyId === archiveTarget.id ? 'Archiving...' : 'Archive item'}
          </button>
        </div>
      </div>
    </Modal>}

    {labelItems && <CollectionLabelSheet items={labelItems} onClose={() => setLabelItems(null)} />}
  </main>;
}

function decimalToMinor(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Money values must be zero or more.');
  return Math.round(parsed * 100);
}

function minorToDecimal(value?: number | null) {
  return value == null ? '' : (value / 100).toFixed(2);
}

function CollectionItemForm({
  space,
  userId,
  initial,
  scannedBarcode,
  onClose,
  onSaved,
}: {
  space: Space;
  userId: string;
  initial: CollectionItem | null;
  scannedBarcode: string;
  onClose: () => void;
  onSaved: (savedMessage?: string) => Promise<void>;
}) {
  const internalCode = useMemo(() => initial?.internalCode || createCollectionInternalCode(), [initial]);
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState(initial?.category || 'Cards');
  const [brand, setBrand] = useState(initial?.brand || '');
  const [series, setSeries] = useState(initial?.series || '');
  const [variant, setVariant] = useState(initial?.variant || '');
  const [condition, setCondition] = useState<CollectionItemCondition>(initial?.condition || 'new');
  const [conditionNote, setConditionNote] = useState(initial?.conditionNote || '');
  const [barcodeText, setBarcodeText] = useState(
    initial ? initial.barcodes.filter((value) => value !== initial.internalCode).join('\n') : scannedBarcode,
  );
  const [primaryBarcode, setPrimaryBarcode] = useState(
    initial?.primaryBarcode || scannedBarcode || initial?.barcodes.find((value) => value !== initial.internalCode) || internalCode,
  );
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [storageLocation, setStorageLocation] = useState(initial?.storageLocation || '');
  const [purchasePrice, setPurchasePrice] = useState(minorToDecimal(initial?.purchasePriceMinor));
  const [estimatedValue, setEstimatedValue] = useState(minorToDecimal(initial?.estimatedValueMinor));
  const [notes, setNotes] = useState(initial?.notes || '');
  const [tags, setTags] = useState(initial?.tags.join(', ') || '');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PreparedCollectionPhoto | null>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const barcodeOptions = useMemo(() => [...new Set([
    ...barcodeText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
    internalCode,
  ])], [barcodeText, internalCode]);
  const selectedPrimaryBarcode = barcodeOptions.includes(primaryBarcode) ? primaryBarcode : internalCode;

  const clearPendingPhoto = () => {
    if (pendingPhotoUrl) URL.revokeObjectURL(pendingPhotoUrl);
    setPendingPhoto(null);
    setPendingPhotoUrl('');
  };

  const closeForm = () => {
    clearPendingPhoto();
    onClose();
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true); setError('');
    try {
      const prepared = await prepareCollectionPhoto(file);
      if (pendingPhotoUrl) URL.revokeObjectURL(pendingPhotoUrl);
      setPendingPhoto(prepared);
      setPendingPhotoUrl(URL.createObjectURL(prepared.file));
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setPhotoBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const parsedQuantity = Number(quantity);
      if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 0) throw new Error('Quantity must be a whole number of zero or more.');
      const barcodes = barcodeText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
      const item: CollectionItemInput = {
        name,
        category,
        brand,
        series,
        variant,
        condition,
        conditionNote,
        barcodes,
        primaryBarcode: selectedPrimaryBarcode,
        internalCode,
        quantity: parsedQuantity,
        storageLocation,
        purchasePriceMinor: decimalToMinor(purchasePrice),
        estimatedValueMinor: decimalToMinor(estimatedValue),
        notes,
        tags: tags.split(',').map((value) => value.trim()).filter(Boolean),
      };
      let savedMessage = '';
      if (initial) await updateCollectionItem(initial.id, item);
      else {
        const itemId = await createCollectionItem({ spaceId: space.id, ownerId: space.ownerId, createdBy: userId, currency: space.currency, item });
        if (pendingPhoto) {
          try {
            await uploadCollectionItemPhoto({ spaceId: space.id, itemId, ...pendingPhoto });
            savedMessage = 'Collection item and primary photo added.';
          } catch (photoError) {
            savedMessage = `Collection item added, but its photo could not be uploaded: ${getErrorMessage(photoError)} Open Details to retry.`;
          }
        }
      }
      clearPendingPhoto();
      await onSaved(savedMessage);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <Modal title={initial ? `Edit ${initial.name}` : 'Add collection item'} onClose={closeForm}>
    <form className="form-stack collection-item-form" onSubmit={submit}>
      {error && <div className="notice error">{error}</div>}
      <div className="collection-code-preview"><span>Internal label code</span><strong>{internalCode}</strong></div>
      <div className="form-grid two-columns">
        <label>Item name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hot Wheels Nissan Skyline" /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Cards</option><option>Toys</option><option>Figures</option><option>Hot Wheels</option><option>Plush</option><option>Accessories</option><option>Other</option></select></label>
        <label>Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Brand or maker" /></label>
        <label>Series or set<input value={series} onChange={(event) => setSeries(event.target.value)} placeholder="Series, set, or collection" /></label>
        <label>Variant<input value={variant} onChange={(event) => setVariant(event.target.value)} placeholder="Colour, edition, card number" /></label>
        <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value as CollectionItemCondition)}>{conditions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {initial ? <div className="collection-readonly-quantity"><span>Quantity</span><strong>{initial.quantity}</strong><small>Use Item Details to record a quantity adjustment.</small></div> : <label>Quantity<input type="number" min="0" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>}
        <label>Storage location<input value={storageLocation} onChange={(event) => setStorageLocation(event.target.value)} placeholder="Shelf, box, binder, or room" /></label>
        <label>Purchase price per item (BND)<input type="number" min="0" step="0.01" inputMode="decimal" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} /></label>
        <label>Estimated value per item (BND)<input type="number" min="0" step="0.01" inputMode="decimal" value={estimatedValue} onChange={(event) => setEstimatedValue(event.target.value)} /></label>
      </div>
      {!initial && <section className="collection-photo-panel">
        <div className="panel-heading">
          <div><strong>Add an optional primary photo</strong><small>Take a photo now or add photos later from Item Details.</small></div>
          <label className={`button secondary collection-photo-upload ${photoBusy ? 'disabled' : ''}`}>
            {photoBusy ? 'Preparing photo...' : pendingPhoto ? 'Retake photo' : 'Take or choose photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void choosePhoto(file); }} />
          </label>
        </div>
        {pendingPhoto && <div className="collection-photo-grid">
          <article className="primary">
            <img className="collection-photo-thumbnail" src={pendingPhotoUrl} alt="New collection item preview" />
            <div><strong>Primary photo preview</strong><small>{pendingPhoto.width} × {pendingPhoto.height}</small></div>
            <button type="button" className="text-button danger" disabled={photoBusy} onClick={clearPendingPhoto}>Remove photo</button>
          </article>
        </div>}
      </section>}
      <label>Existing UPC, EAN, or other barcodes<textarea rows={3} value={barcodeText} onChange={(event) => setBarcodeText(event.target.value)} placeholder="One barcode per line. The internal code is added automatically." /></label>
      <label>Primary barcode<select value={selectedPrimaryBarcode} onChange={(event) => setPrimaryBarcode(event.target.value)}>{barcodeOptions.map((value) => <option key={value} value={value}>{value}{value === internalCode ? ' (internal code)' : ''}</option>)}</select><small>This is the preferred identity shown for the item. Every saved barcode can still find it.</small></label>
      <label>Condition note<input value={conditionNote} onChange={(event) => setConditionNote(event.target.value)} placeholder="Optional condition details" /></label>
      <label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="rare, favourite, sell later" /></label>
      <label>Notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={closeForm}>Cancel</button><button className="button primary" disabled={busy || photoBusy || !name.trim()}>{busy ? 'Saving...' : initial ? 'Save changes' : 'Add item'}</button></div>
    </form>
  </Modal>;
}

function labelCopies(items: CollectionItem[]) {
  const copies: CollectionItem[] = [];
  for (const item of items) {
    const count = Math.max(1, Math.min(item.quantity, 50));
    for (let index = 0; index < count && copies.length < 200; index += 1) copies.push(item);
    if (copies.length >= 200) break;
  }
  return copies;
}

function CollectionLabelSheet({ items, onClose }: { items: CollectionItem[]; onClose: () => void }) {
  const copies = useMemo(() => labelCopies(items), [items]);
  useEffect(() => {
    document.body.classList.add('collection-label-printing');
    return () => document.body.classList.remove('collection-label-printing');
  }, []);
  return <Modal title="Printable collection labels" onClose={onClose}>
    <div className="collection-label-dialog">
      <div className="notice">One label is prepared per saved quantity, limited to 50 per item and 200 per print batch.</div>
      <div className="collection-label-sheet">
        {copies.map((item, index) => <CollectionLabel key={`${item.id}-${index}`} item={item} />)}
      </div>
      <div className="modal-actions"><button className="button secondary" onClick={onClose}>Close</button><button className="button primary" onClick={() => window.print()}>Print {copies.length} label{copies.length === 1 ? '' : 's'}</button></div>
    </div>
  </Modal>;
}

function CollectionLabel({ item }: { item: CollectionItem }) {
  const barcodeRef = useRef<HTMLCanvasElement | null>(null);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (barcodeRef.current) bwipjs.toCanvas(barcodeRef.current, {
      bcid: 'code128',
      text: item.internalCode,
      scale: 2,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    if (qrRef.current) bwipjs.toCanvas(qrRef.current, {
      bcid: 'qrcode',
      text: item.internalCode,
      scale: 2,
      paddingwidth: 1,
      paddingheight: 1,
    });
  }, [item.internalCode]);

  return <article className="collection-print-label">
    <header><strong>{item.name}</strong><span>{item.category}{item.storageLocation ? ` - ${item.storageLocation}` : ''}</span></header>
    <div><canvas ref={barcodeRef} /><canvas ref={qrRef} /></div>
  </article>;
}
