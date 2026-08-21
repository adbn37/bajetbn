import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCollectionItems } from '../../repositories/collectionRepository';
import type { CollectionItem, Space } from '../../types/models';

interface Props {
  space: Space;
}

type ItemRecord = Record<string, unknown>;

function recordOf(item: CollectionItem): ItemRecord {
  return item as unknown as ItemRecord;
}

function usefulString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function firstText(record: ItemRecord, keys: string[]): string {
  for (const key of keys) {
    const value = usefulString(record[key]);

    if (value) return value;
  }

  return '';
}

function nestedText(value: unknown, keys: string[]): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';

  const nested = value as Record<string, unknown>;
  return firstText(nested, keys);
}

function collectionBarcode(item: CollectionItem): string {
  const record = recordOf(item);

  const direct = firstText(record, [
    'barcode',
    'barcodeValue',
    'barcodeNumber',
    'barcodeCode',
    'codeValue',
    'code',
  ]);

  if (direct) return direct;

  for (const key of ['barcode', 'identifier', 'code']) {
    const nested = nestedText(record[key], [
      'value',
      'rawValue',
      'text',
      'code',
      'barcode',
      'number',
    ]);

    if (nested) return nested;
  }

  for (const key of ['barcodes', 'identifiers', 'codes']) {
    const value = record[key];

    if (!Array.isArray(value)) continue;

    for (const entry of value) {
      const directEntry = usefulString(entry);

      if (directEntry) return directEntry;

      const nestedEntry = nestedText(entry, [
        'value',
        'rawValue',
        'text',
        'code',
        'barcode',
        'number',
      ]);

      if (nestedEntry) return nestedEntry;
    }
  }

  return '';
}

function collectionHasPhoto(item: CollectionItem): boolean {
  const record = recordOf(item);

  for (const key of [
    'photoPath',
    'photoUrl',
    'imagePath',
    'imageUrl',
    'thumbnailUrl',
  ]) {
    if (usefulString(record[key])) return true;
  }

  for (const key of ['photo', 'image']) {
    const value = record[key];

    if (!value) continue;

    if (typeof value === 'string' && value.trim()) return true;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;

      if (
        firstText(nested, [
          'path',
          'storagePath',
          'url',
          'downloadUrl',
          'thumbnailUrl',
        ])
      ) {
        return true;
      }
    }
  }

  for (const key of ['photos', 'images']) {
    const value = record[key];

    if (Array.isArray(value) && value.length > 0) return true;
  }

  return false;
}

function collectionQuantity(item: CollectionItem): number {
  const record = recordOf(item);

  for (const key of [
    'quantityOnHand',
    'quantity',
    'currentQuantity',
    'onHand',
    'stock',
    'count',
  ]) {
    const value = Number(record[key]);

    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return 1;
}

function collectionGroup(item: CollectionItem): string {
  const record = recordOf(item);

  return firstText(record, [
    'categoryName',
    'category',
    'setName',
    'series',
    'collectionName',
    'brand',
    'condition',
  ]);
}

function collectionCreatedAt(item: CollectionItem): number {
  const value = recordOf(item).createdAt;

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value instanceof Date) return value.getTime();

  if (value && typeof value === 'object') {
    const timestamp = value as {
      toMillis?: () => number;
      seconds?: number;
    };

    if (typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }

    if (typeof timestamp.seconds === 'number') {
      return timestamp.seconds * 1000;
    }
  }

  return 0;
}

function collectionArchived(item: CollectionItem): boolean {
  const record = recordOf(item);

  if (record.archivedAt) return true;
  if (record.archived === true) return true;

  return usefulString(record.status).toLowerCase() === 'archived';
}

export function CollectionCommandCentre({ space }: Props) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const nextItems = await listCollectionItems(space.id);

        if (!cancelled) {
          setItems(Array.isArray(nextItems) ? nextItems : []);
        }
      }
      catch {
        if (!cancelled) {
          setError(
            'Collection summary could not be refreshed. Open Collection to view the latest inventory.',
          );
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [space.id]);

  const activeItems = useMemo(
    () => items.filter((item) => !collectionArchived(item)),
    [items],
  );

  const totalUnits = activeItems.reduce(
    (sum, item) => sum + collectionQuantity(item),
    0,
  );

  const withBarcode = activeItems.filter(
    (item) => Boolean(collectionBarcode(item)),
  ).length;

  const withPhoto = activeItems.filter(collectionHasPhoto).length;

  const setupNeeded = activeItems.filter(
    (item) => !collectionBarcode(item) || !collectionHasPhoto(item),
  ).length;

  const groupCount = new Set(
    activeItems
      .map(collectionGroup)
      .filter(Boolean),
  ).size;

  const recentItems = useMemo(
    () =>
      [...activeItems]
        .sort(
          (a, b) =>
            collectionCreatedAt(b) - collectionCreatedAt(a),
        )
        .slice(0, 4),
    [activeItems],
  );

  return (
    <section className="panel collection-command-centre">
      <div className="collection-command-heading">
        <div>
          <span className="eyebrow">Collection v2</span>
          <h2>Collection home</h2>
          <p>
            See what you own and what still needs organising.
            Collection Inventory remains the source of truth.
          </p>
        </div>

        <span className="type-badge">
          {loading ? 'Loading…' : `${activeItems.length} active`}
        </span>
      </div>

      <div className="collection-command-actions">
        <Link
          className="button secondary"
          to={`/spaces/${space.id}/collection/add`}
        >
          + Add item
        </Link>

        <Link
          className="button secondary"
          to={`/spaces/${space.id}/collection`}
        >
          Scan / find item
        </Link>

        <Link
          className="text-button"
          to={`/spaces/${space.id}/collection`}
        >
          Open Collection →
        </Link>
      </div>

      {loading ? (
        <div className="loading-panel">
          Loading collection summary…
        </div>
      ) : (
        <>
          <div className="summary-grid collection-command-summary">
            <article className="summary-card">
              <span>Active items</span>
              <strong>{activeItems.length}</strong>
              <small>Items currently in this Collection</small>
            </article>

            <article className="summary-card">
              <span>Total units</span>
              <strong>{totalUnits}</strong>
              <small>Quantity across active items</small>
            </article>

            <article className="summary-card">
              <span>Barcoded</span>
              <strong>{withBarcode}</strong>
              <small>
                {activeItems.length
                  ? `${activeItems.length - withBarcode} still need a barcode`
                  : 'Ready for phone scanning'}
              </small>
            </article>

            <article className="summary-card">
              <span>With photo</span>
              <strong>{withPhoto}</strong>
              <small>
                {activeItems.length
                  ? `${activeItems.length - withPhoto} still need a photo`
                  : 'Photos make items easier to identify'}
              </small>
            </article>

            <article className="summary-card">
              <span>Groups</span>
              <strong>{groupCount}</strong>
              <small>Categories, sets, series or conditions represented</small>
            </article>

            <article className="summary-card">
              <span>Needs setup</span>
              <strong>{setupNeeded}</strong>
              <small>Missing a barcode, photo, or both</small>
            </article>
          </div>

          <section className="collection-command-recent">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Recently added</span>
                <h3>Latest collection items</h3>
              </div>

              <Link
                className="text-button"
                to={`/spaces/${space.id}/collection`}
              >
                See all →
              </Link>
            </div>

            {recentItems.length ? (
              <div className="collection-command-recent-list">
                {recentItems.map((item) => {
                  const barcode = collectionBarcode(item);

                  return (
                    <Link
                      className="collection-command-recent-item"
                      key={item.id}
                      to={`/spaces/${space.id}/collection/items/${item.id}`}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {barcode
                            ? `Barcode · ${barcode}`
                            : 'No barcode yet'}
                        </small>
                      </div>

                      <span className="type-badge">
                        {collectionHasPhoto(item)
                          ? 'Photo ready'
                          : 'Add photo'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="empty-inline">
                No collection items yet. Add the first item to start this Collection.
              </div>
            )}
          </section>
        </>
      )}

      {error && <div className="notice warning">{error}</div>}
    </section>
  );
}
