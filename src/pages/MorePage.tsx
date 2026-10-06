import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SpaceAvatar } from '../features/spaces/SpaceAvatar';
import { listSpaces } from '../repositories/spaceRepository';
import type { Space } from '../types/models';

const moneyTools = [
  { to: '/accounts', label: 'Accounts' },
  { to: '/bills', label: 'Bills & instalments' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/goals', label: 'Goals' },
  { to: '/debt', label: 'Debt' },
  { to: '/recurring', label: 'Recurring money' },
  { to: '/reports', label: 'Reports' },
];

const appTools = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/search', label: 'Search' },
  { to: '/documents', label: 'My private documents' },
  { to: '/settings', label: 'Settings' },
  { to: '/subscription', label: 'Subscription' },
];

const spaceTypeLabels: Partial<Record<Space['type'], string>> = {
  personal: 'Personal',
  household: 'Household',
  trip: 'Trip',
  sme: 'Business',
  collection: 'Collection',
  vehicle: 'Vehicle',
  property: 'Property',
  project: 'Project',
  event: 'Event',
  asset: 'Asset',
  custom: 'Space',
};

function spaceShortcutPath(space: Space) {
  return space.type === 'sme'
    ? '/business/' + space.id
    : '/spaces/' + space.id;
}

function spaceShortcutRank(space: Space) {
  if (space.type === 'personal') return 0;
  if (space.type === 'household') return 1;
  if (space.type === 'trip') return 2;
  if (space.type === 'sme') return 3;
  return 4;
}

export function MorePage() {
  const { user, logOut } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [spacesError, setSpacesError] = useState('');

  useEffect(() => {
    if (!user) {
      setSpaces([]);
      setSpacesLoading(false);
      return;
    }

    let cancelled = false;

    setSpacesLoading(true);
    setSpacesError('');

    void listSpaces(user.uid)
      .then((items) => {
        if (cancelled) return;

        setSpaces(
          items
            .filter(
              (space) =>
                !space.archivedAt
                // Goal / Plan Spaces are surfaced through Goals,
                // not mixed into the everyday Space launcher.
                && space.type !== 'goal',
            )
            .sort(
              (a, b) =>
                spaceShortcutRank(a) - spaceShortcutRank(b)
                || a.name.localeCompare(b.name),
            ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSpaces([]);
          setSpacesError('Your Space shortcuts could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled) setSpacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleSpaces = useMemo(
    () => spaces.slice(0, 8),
    [spaces],
  );

  return (
    <main className="page more-v110 more-mobile-hub-v116" data-simplified-more>
      <header className="more-v110-header">
        <div>
          <span className="more-v110-kicker">BajetBN</span>
          <h1>More</h1>
        </div>
      </header>

      <section className="more-v110-group more-space-shortcuts-v116">
        <div className="more-section-heading-v116">
          <div>
            <h2>Spaces</h2>
            <p>Jump straight into the place you want to manage.</p>
          </div>

          <Link to="/spaces" className="text-button">
            Manage
          </Link>
        </div>

        {spacesLoading ? (
          <div className="more-space-loading-v116">Loading Spaces…</div>
        ) : spacesError ? (
          <div className="notice warning compact-notice">{spacesError}</div>
        ) : visibleSpaces.length > 0 ? (
          <div className="more-space-grid-v116">
            {visibleSpaces.map((space) => (
              <Link
                className="more-space-shortcut-v116"
                to={spaceShortcutPath(space)}
                key={space.id}
              >
                <SpaceAvatar space={space} />

                <span>
                  <strong>{space.name}</strong>
                  <small>
                    {spaceTypeLabels[space.type] || 'Space'}
                  </small>
                </span>

                <b aria-hidden="true">›</b>
              </Link>
            ))}
          </div>
        ) : (
          <Link className="more-space-empty-v116" to="/spaces">
            <strong>Create your first Space</strong>
            <small>Personal, Household, Trip or Business.</small>
          </Link>
        )}

        <Link className="more-manage-spaces-v116" to="/spaces">
          <span>
            <strong>Manage Spaces</strong>
            <small>Create, edit, archive or remove Spaces.</small>
          </span>
          <b aria-hidden="true">›</b>
        </Link>
      </section>

      <section className="more-v110-group">
        <h2>Money</h2>
        <div className="more-v110-grid">
          {moneyTools.map((item) => (
            <Link className="more-v110-tool" to={item.to} key={item.to}>
              <span className="more-v110-tool-copy">
                <strong>{item.label}</strong>
              </span>
              <span className="more-v110-tool-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="more-v110-group">
        <h2>App</h2>
        <div className="more-v110-grid">
          {appTools.map((item) => (
            <Link className="more-v110-tool" to={item.to} key={item.to}>
              <span className="more-v110-tool-copy">
                <strong>{item.label}</strong>
              </span>
              <span className="more-v110-tool-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="more-v110-account">
        <button
          type="button"
          className="more-v110-account-action more-v110-signout"
          onClick={() => void logOut()}
        >
          <span>↪</span>
          <span><strong>Sign out</strong></span>
          <b>›</b>
        </button>
      </section>
    </main>
  );
}
