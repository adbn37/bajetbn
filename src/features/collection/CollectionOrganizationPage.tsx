import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listCollectionItems } from '../../repositories/collectionRepository';
import type { CollectionItem } from '../../types/models';

type LifecycleFilter = 'active' | 'archived' | 'all';
type SortMode = 'recent' | 'name' | 'quantity';
type ItemRecord = Record<string, unknown>;

function recordOf(item: CollectionItem): ItemRecord {
  return item as unknown as ItemRecord;
}

function cleanText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function firstText(record: ItemRecord, keys: string[]): string {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) return value;
  }

  return '';
}

function isArchived(item: CollectionItem): boolean {
  const record = recordOf(item);

  if (record.archivedAt) return true;
  if (record.archived === true) return true;

  return cleanText(record.status).toLowerCase() === 'archived';
}

function quantityOf(item: CollectionItem): number {
  const record = recordOf(item);

  for (const key of [
    'quantityOnHand',
    'quantity',
    'currentQuantity',
    'onHand',
    'stock',
    'count',
  ]) {
    const quantity = Number(record[key]);

    if (Number.isFinite(quantity) && quantity >= 0) {
      return quantity;
    }
  }

  return 1;
}

function conditionOf(item: CollectionItem): string {
  return firstText(recordOf(item), [
    'condition',
    'itemCondition',
  ]);
}

function groupOf(item: CollectionItem): string {
  return firstText(recordOf(item), [
    'categoryName',
    'category',
    'setName',
    'series',
    'collectionName',
    'brand',
  ]);
}

function searchable(item: CollectionItem): string {
  const record = recordOf(item);

  return [
    item.name,
    firstText(record, ['displayId']),
    conditionOf(item),
    groupOf(item),
    firstText(record, [
      'sku',
      'barcode',
      'barcodeValue',
      'barcodeNumber',
      'note',
      'notes',
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function createdAtMs(item: CollectionItem): number {
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

function displayLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CollectionOrganizationPage() {
  const { spaceId = '' } = useParams();

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] =
    useState<LifecycleFilter>('active');
  const [condition, setCondition] = useState('all');
  const [group, setGroup] = useState('all');
  const [sort, setSort] = useState<SortMode>('recent');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!spaceId) return;

      setLoading(true);
      setError('');

      try {
        const nextItems = await listCollectionItems(spaceId, true);

        if (!cancelled) {
          setItems(Array.isArray(nextItems) ? nextItems : []);
        }
      }
      catch {
        if (!cancelled) {
          setError(
            'Collection organizer could not load. The main Collection inventory is still available.',
          );
        }
      }
      finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  const activeCount = items.filter(
    (item) => !isArchived(item),
  ).length;

  const archivedCount = items.filter(isArchived).length;

  const conditions = useMemo(
    () =>
      Array.from(
        new Set(items.map(conditionOf).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const groups = useMemo(
    () =>
      Array.from(
        new Set(items.map(groupOf).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const archived = isArchived(item);

        if (lifecycle === 'active' && archived) return false;
        if (lifecycle === 'archived' && !archived) return false;

        if (
          condition !== 'all'
          && conditionOf(item) !== condition
        ) {
          return false;
        }

        if (
          group !== 'all'
          && groupOf(item) !== group
        ) {
          return false;
        }

        if (
          needle
          && !searchable(item).includes(needle)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === 'name') {
          return a.name.localeCompare(b.name);
        }

        if (sort === 'quantity') {
          return quantityOf(b) - quantityOf(a);
        }

        return createdAtMs(b) - createdAtMs(a);
      });
  }, [
    condition,
    group,
    items,
    lifecycle,
    search,
    sort,
  ]);

  const visibleUnits = visibleItems.reduce(
    (sum, item) => sum + quantityOf(item),
    0,
  );

  return (
    <main className="page-stack collection-organizer-page">
      <section className="panel collection-organizer-header">
        <div>
          <span className="eyebrow">Collection v2</span>
          <h1>Organize Collection</h1>
          <p>
            Search, group and sort the same records already saved
            in your Collection inventory.
          </p>
        </div>

        <Link
          className="button secondary"
          to={`/spaces/${spaceId}/collection`}
        >
          Back to Collection
        </Link>
      </section>

      <section className="summary-grid collection-organizer-summary">
        <article className="summary-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
          <small>Current Collection items</small>
        </article>

        <article className="summary-card">
          <span>Archived</span>
          <strong>{archivedCount}</strong>
          <small>Preserved outside active inventory</small>
        </article>

        <article className="summary-card">
          <span>Showing</span>
          <strong>{visibleItems.length}</strong>
          <small>{visibleUnits} total unit(s)</small>
        </article>
      </section>

      <section className="panel collection-organizer-controls">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Organize</span>
            <h2>Find the items you need</h2>
          </div>
        </div>

        <div className="collection-organizer-filter-grid">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, set, series, condition or code"
            />
          </label>

          <label>
            Item status
            <select
              value={lifecycle}
              onChange={(event) =>
                setLifecycle(
                  event.target.value as LifecycleFilter,
                )
              }
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All items</option>
            </select>
          </label>

          <label>
            Condition
            <select
              value={condition}
              onChange={(event) =>
                setCondition(event.target.value)
              }
            >
              <option value="all">All conditions</option>

              {conditions.map((value) => (
                <option key={value} value={value}>
                  {displayLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Group
            <select
              value={group}
              onChange={(event) =>
                setGroup(event.target.value)
              }
            >
              <option value="all">All groups</option>

              {groups.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortMode)
              }
            >
              <option value="recent">Recently added</option>
              <option value="name">Name A–Z</option>
              <option value="quantity">Highest quantity</option>
            </select>
          </label>
        </div>

        {(search
          || lifecycle !== 'active'
          || condition !== 'all'
          || group !== 'all'
          || sort !== 'recent') && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSearch('');
              setLifecycle('active');
              setCondition('all');
              setGroup('all');
              setSort('recent');
            }}
          >
            Reset organizer
          </button>
        )}
      </section>

      <section className="panel collection-organizer-results">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Results</span>
            <h2>{visibleItems.length} item(s)</h2>
          </div>
        </div>

        {loading && (
          <div className="loading-panel">
            Loading Collection…
          </div>
        )}

        {!loading && error && (
          <div className="notice warning">
            {error}
          </div>
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <div className="collection-organizer-grid">
            {visibleItems.map((item) => {
              const conditionValue = conditionOf(item);
              const groupValue = groupOf(item);

              return (
                <Link
                  key={item.id}
                  className="collection-organizer-item"
                  to={`/spaces/${spaceId}/collection/items/${item.id}`}
                >
                  <div>
                    <strong>{item.name}</strong>

                    <div className="collection-organizer-badges">
                      {groupValue && (
                        <span className="type-badge">
                          {groupValue}
                        </span>
                      )}

                      {conditionValue && (
                        <span className="type-badge">
                          {displayLabel(conditionValue)}
                        </span>
                      )}

                      {isArchived(item) && (
                        <span className="status-badge">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="collection-organizer-quantity">
                    <strong>{quantityOf(item)}</strong>
                    <small>unit(s)</small>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading
          && !error
          && visibleItems.length === 0 && (
            <div className="empty-inline">
              No Collection items match these filters.
            </div>
          )}
      </section>
    </main>
  );
}
