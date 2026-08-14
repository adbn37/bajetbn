import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listSpaceMembers } from '../../repositories/collaborationRepository';
import {
  adjustCollectionItemQuantity,
  archiveCollectionItem,
  getCollectionItem,
  listCollectionQuantityMovements,
  restoreCollectionItem,
} from '../../repositories/collectionRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  CollectionItem,
  CollectionQuantityMovement,
  CollectionQuantityReason,
  Space,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

const editableRoles = new Set(['owner', 'admin', 'contributor']);
const reasons: Array<{ value: CollectionQuantityReason; label: string }> = [
  { value: 'acquired', label: 'Acquired or purchased' },
  { value: 'sold', label: 'Sold' },
  { value: 'gifted', label: 'Gifted' },
  { value: 'lost', label: 'Lost' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'correction', label: 'Stock correction' },
  { value: 'other', label: 'Other' },
];

function movementLabel(reason: CollectionQuantityReason) {
  if (reason === 'initial') return 'Opening quantity';
  return reasons.find((item) => item.value === reason)?.label || 'Other';
}

function timestampValue(value?: { toMillis?: () => number } | null) {
  return value?.toMillis?.() || 0;
}

export function CollectionItemDetailsPage() {
  const { user } = useAuth();
  const { spaceId = '', itemId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [movements, setMovements] = useState<CollectionQuantityMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const load = useCallback(async () => {
    if (!user || !spaceId || !itemId) return;
    setLoading(true);
    setError('');
    try {
      const spaces = await listSpaces(user.uid);
      const nextSpace = spaces.find((value) => value.id === spaceId && value.type === 'collection') || null;
      setSpace(nextSpace);
      if (!nextSpace) {
        setMembers([]);
        setItem(null);
        setMovements([]);
        return;
      }
      const [nextMembers, nextItem, nextMovements] = await Promise.all([
        listSpaceMembers(spaceId),
        getCollectionItem(spaceId, itemId),
        listCollectionQuantityMovements(spaceId, itemId),
      ]);
      setMembers(nextMembers);
      setItem(nextItem);
      setMovements(nextMovements);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [itemId, spaceId, user]);

  // The route loader owns this page's loading-state lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const currentMember = members.find((value) => value.uid === user?.uid);
  const canEdit = Boolean(currentMember && editableRoles.has(currentMember.role) && !space?.archivedAt);
  const totalCostMinor = useMemo(() => (item?.purchasePriceMinor || 0) * (item?.quantity || 0), [item]);
  const totalValueMinor = useMemo(() => (item?.estimatedValueMinor || 0) * (item?.quantity || 0), [item]);

  const quickAdd = async () => {
    if (!item || !space || !user) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await adjustCollectionItemQuantity({
        spaceId,
        itemId: item.id,
        createdBy: user.uid,
        delta: 1,
        reason: 'acquired',
        note: 'Quick +1 from item details',
      });
      await load();
      setNotice('Quantity increased by 1 and recorded in history.');
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const archive = async () => {
    if (!item) return;
    setBusy(true); setError('');
    try {
      await archiveCollectionItem(item.id);
      setShowArchive(false);
      await load();
      setNotice('Item archived. Its quantity history remains available.');
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const restore = async () => {
    if (!item) return;
    setBusy(true); setError('');
    try {
      await restoreCollectionItem(item.id);
      await load();
      setNotice('Item restored.');
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  if (loading) return <main className="page"><div className="loading-panel">Loading item details...</div></main>;

  if (!space || !item) return <main className="page">
    <PageHeader eyebrow="Collection item" title="Item not found" description="The item may not exist or may belong to another Collection Space." />
    {error && <div className="notice error">{error}</div>}
    <Link className="button primary" to={spaceId ? `/spaces/${spaceId}/collection` : '/spaces'}>Back to Inventory</Link>
  </main>;

  return <main className="page collection-page collection-details-page">
    <PageHeader
      eyebrow="Collection item details"
      title={item.name}
      description="Review identity, value, quantity, saved barcodes, and every recorded quantity adjustment."
      action={<Link className="button secondary" to={`/spaces/${space.id}/collection`}>Back to Inventory</Link>}
    />

    {error && <div className="notice error">{error}</div>}
    {notice && <div className="notice success">{notice}</div>}
    {item.archivedAt && <div className="notice">This item is archived. Restore it before changing quantity.</div>}

    <section className="summary-grid collection-detail-summary">
      <article className="summary-card featured"><span>Quantity</span><strong>{item.quantity}</strong><small>Currently in collection</small></article>
      <article className="summary-card"><span>Total cost</span><strong>{formatMoney(totalCostMinor, space.currency)}</strong><small>Quantity × purchase price</small></article>
      <article className="summary-card"><span>Estimated value</span><strong>{formatMoney(totalValueMinor, space.currency)}</strong><small>Quantity × saved estimate</small></article>
    </section>

    <div className="collection-detail-layout">
      <section className="panel collection-detail-card">
        <div className="panel-heading"><div><span className="eyebrow">Item record</span><h2>Saved details</h2></div></div>
        <dl className="collection-detail-list">
          <div><dt>Category</dt><dd>{item.category}</dd></div>
          <div><dt>Brand / series</dt><dd>{[item.brand, item.series, item.variant].filter(Boolean).join(' - ') || 'Not set'}</dd></div>
          <div><dt>Condition</dt><dd>{item.condition.replace('_', ' ')}</dd></div>
          <div><dt>Location</dt><dd>{item.storageLocation || 'Not set'}</dd></div>
          <div><dt>Internal code</dt><dd>{item.internalCode}</dd></div>
          <div><dt>Barcodes</dt><dd>{item.barcodes.join(', ')}</dd></div>
          <div><dt>Purchase price</dt><dd>{formatMoney(item.purchasePriceMinor || 0, space.currency)} each</dd></div>
          <div><dt>Estimated value</dt><dd>{formatMoney(item.estimatedValueMinor || 0, space.currency)} each</dd></div>
          <div><dt>Tags</dt><dd>{item.tags.join(', ') || 'None'}</dd></div>
          <div><dt>Updated</dt><dd>{timestampValue(item.updatedAt) ? new Date(timestampValue(item.updatedAt)).toLocaleString('en-BN') : 'Not recorded'}</dd></div>
        </dl>
        {item.conditionNote && <div className="notice">Condition: {item.conditionNote}</div>}
        {item.notes && <div className="notice">Notes: {item.notes}</div>}
        <div className="button-row collection-detail-actions">
          {!item.archivedAt && canEdit && <button className="button primary" disabled={busy} onClick={() => void quickAdd()}>+1 quantity</button>}
          {!item.archivedAt && canEdit && <button className="button secondary" disabled={busy} onClick={() => setShowAdjustment(true)}>Adjust quantity</button>}
          {!item.archivedAt && canEdit && <button className="button danger" disabled={busy} onClick={() => setShowArchive(true)}>Archive</button>}
          {item.archivedAt && canEdit && <button className="button primary" disabled={busy} onClick={() => void restore()}>Restore item</button>}
        </div>
        <p className="collection-edit-hint">Use the Edit action on the Inventory card to change the item name, identity, value, barcodes, location, or notes.</p>
      </section>

      <section className="panel collection-history-panel">
        <div className="panel-heading"><div><span className="eyebrow">Audit history</span><h2>Quantity activity</h2><p>Quantity changes are permanent history records and cannot be silently edited.</p></div></div>
        {movements.length === 0 ? <div className="empty-inline">No recorded adjustments yet. Earlier quantity changes may predate v1.2.0 history.</div> : <div className="collection-movement-list">
          {movements.map((movement) => <article key={movement.id}>
            <div><strong>{movementLabel(movement.reason)}</strong><small>{movement.note || 'No note'} - {timestampValue(movement.createdAt) ? new Date(timestampValue(movement.createdAt)).toLocaleString('en-BN') : 'Not recorded'}</small></div>
            <span className={movement.delta >= 0 ? 'positive' : 'negative'}>{movement.delta >= 0 ? '+' : ''}{movement.delta}</span>
            <small>{movement.previousQuantity} to {movement.nextQuantity}</small>
          </article>)}
        </div>}
      </section>
    </div>

    {showAdjustment && <QuantityAdjustmentModal
      item={item}
      spaceId={space.id}
      userId={user?.uid || ''}
      onClose={() => setShowAdjustment(false)}
      onSaved={async () => {
        setShowAdjustment(false);
        await load();
        setNotice('Quantity adjusted and recorded in history.');
      }}
    />}

    {showArchive && <Modal title={`Archive ${item.name}?`} onClose={() => setShowArchive(false)}>
      <div className="form-stack"><p>The item will move to Archived items. Its barcode and quantity history will remain available.</p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setShowArchive(false)}>Cancel</button><button className="button danger" disabled={busy} onClick={() => void archive()}>{busy ? 'Archiving...' : 'Archive item'}</button></div></div>
    </Modal>}
  </main>;
}

function QuantityAdjustmentModal({ item, spaceId, userId, onClose, onSaved }: {
  item: CollectionItem;
  spaceId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState<CollectionQuantityReason>('acquired');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const parsed = Number(amount);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('Enter a whole quantity greater than zero.');
      const delta = direction === 'add' ? parsed : -parsed;
      if (item.quantity + delta < 0) throw new Error(`You can remove at most ${item.quantity}.`);
      await adjustCollectionItemQuantity({ spaceId, itemId: item.id, createdBy: userId, delta, reason, note });
      await onSaved();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <Modal title={`Adjust ${item.name} quantity`} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="notice error">{error}</div>}
      <div className="notice">Current quantity: <strong>{item.quantity}</strong></div>
      <div className="form-grid two-columns">
        <label>Change<select value={direction} onChange={(event) => setDirection(event.target.value as 'add' | 'remove')}><option value="add">Add quantity</option><option value="remove">Remove quantity</option></select></label>
        <label>Amount<input type="number" min="1" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value as CollectionQuantityReason)}>{reasons.map((value) => <option key={value.value} value={value.value}>{value.label}</option>)}</select></label>
      </div>
      <label>Adjustment note<textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional explanation or reference" /></label>
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving...' : 'Save adjustment'}</button></div>
    </form>
  </Modal>;
}
