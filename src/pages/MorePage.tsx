import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type MoreIconName =
  | 'accounts'
  | 'bills'
  | 'budgets'
  | 'goals'
  | 'recurring'
  | 'reports'
  | 'spaces'
  | 'calendar'
  | 'search'
  | 'documents'
  | 'settings'
  | 'plus'
  | 'logout';

const moneyTools: Array<{
  to: string;
  label: string;
  icon: MoreIconName;
}> = [
  { to: '/accounts', label: 'Accounts', icon: 'accounts' },
  { to: '/bills', label: 'Bills', icon: 'bills' },
  { to: '/budgets', label: 'Budgets', icon: 'budgets' },
  { to: '/goals', label: 'Goals', icon: 'goals' },
  { to: '/recurring', label: 'Recurring', icon: 'recurring' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
];

const organiseTools: Array<{
  to: string;
  label: string;
  icon: MoreIconName;
}> = [
  { to: '/spaces', label: 'Spaces', icon: 'spaces' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/documents', label: 'Documents', icon: 'documents' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/subscription', label: 'Plus', icon: 'plus' },
];

function MoreIcon({ name }: { name: MoreIconName }) {
  return (
    <svg
      className="more-grid-svg-v116"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'accounts' && (
        <>
          <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" />
          <path d="M3.5 10h17" />
          <path d="M7 15h4" />
        </>
      )}

      {name === 'bills' && (
        <>
          <path d="M7 3.5h10v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4V3.5Z" />
          <path d="M9.5 8h5" />
          <path d="M9.5 12h5" />
          <path d="M9.5 16h3" />
        </>
      )}

      {name === 'budgets' && (
        <>
          <path d="M5 18V11" />
          <path d="M10 18V6" />
          <path d="M15 18v-4" />
          <path d="M20 18V9" />
          <path d="M3.5 18.5h18" />
        </>
      )}

      {name === 'goals' && (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" />
        </>
      )}

      {name === 'recurring' && (
        <>
          <path d="M18.5 8.5A7 7 0 0 0 6 7" />
          <path d="M6 7V3.8" />
          <path d="M6 7h3.2" />
          <path d="M5.5 15.5A7 7 0 0 0 18 17" />
          <path d="M18 17v3.2" />
          <path d="M18 17h-3.2" />
        </>
      )}

      {name === 'reports' && (
        <>
          <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
          <path d="M8 16v-3" />
          <path d="M12 16V8" />
          <path d="M16 16v-5" />
        </>
      )}

      {name === 'spaces' && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.3" />
          <rect x="14" y="4" width="6" height="6" rx="1.3" />
          <rect x="4" y="14" width="6" height="6" rx="1.3" />
          <rect x="14" y="14" width="6" height="6" rx="1.3" />
        </>
      )}

      {name === 'calendar' && (
        <>
          <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
          <path d="M7.5 3.5v4" />
          <path d="M16.5 3.5v4" />
          <path d="M3.5 9.5h17" />
        </>
      )}

      {name === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 5 5" />
        </>
      )}

      {name === 'documents' && (
        <>
          <path d="M7 3.5h7l4 4v13H7z" />
          <path d="M14 3.5v4h4" />
          <path d="M10 12h5" />
          <path d="M10 16h5" />
        </>
      )}

      {name === 'settings' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2" />
          <path d="M12 18.5v2" />
          <path d="m5.99 5.99 1.42 1.42" />
          <path d="m16.59 16.59 1.42 1.42" />
          <path d="M3.5 12h2" />
          <path d="M18.5 12h2" />
          <path d="m5.99 18.01 1.42-1.42" />
          <path d="m16.59 7.41 1.42-1.42" />
        </>
      )}

      {name === 'plus' && (
        <>
          <path d="m12 3.5 1.7 4.3 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.3-4.8-1.7 4.8-1.7L12 3.5Z" />
          <path d="m18.3 15.5.8 2 .4.4 2 .8-2 .8-.4.4-.8 2-.8-2-.4-.4-2-.8 2-.8.4-.4.8-2Z" />
        </>
      )}

      {name === 'logout' && (
        <>
          <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
          <path d="M14 8l4 4-4 4" />
          <path d="M8.5 12H18" />
        </>
      )}
    </svg>
  );
}

function ShortcutGrid({
  items,
}: {
  items: Array<{ to: string; label: string; icon: MoreIconName }>;
}) {
  return (
    <div className="more-v110-grid more-shortcut-grid-v116">
      {items.map((item) => (
        <Link
          className="more-v110-tool more-grid-shortcut-v116"
          to={item.to}
          key={item.to}
        >
          <span className="more-grid-shortcut-icon-v116">
            <MoreIcon name={item.icon} />
          </span>
          <strong>{item.label}</strong>
        </Link>
      ))}
    </div>
  );
}

export function MorePage() {
  const { logOut } = useAuth();

  return (
    <main
      className="page more-v110 more-mobile-hub-v116 more-grid-launcher-v116"
      data-simplified-more
    >
      <header className="more-v110-header">
        <div>
          <span className="more-v110-kicker">BajetBN</span>
          <h1>More</h1>
          <p>Shortcuts to the rest of BajetBN.</p>
        </div>
      </header>

      <section className="more-v110-group">
        <h2>Money</h2>
        <ShortcutGrid items={moneyTools} />
      </section>

      <section className="more-v110-group">
        <h2>Tools</h2>
        <ShortcutGrid items={organiseTools} />
      </section>

      <section className="more-signout-section-v116">
        <button
          type="button"
          className="more-signout-v116"
          onClick={() => void logOut()}
        >
          <span className="more-signout-icon-v116">
            <MoreIcon name="logout" />
          </span>
          <strong>Sign out</strong>
          <span className="more-signout-arrow-v116" aria-hidden="true">›</span>
        </button>
      </section>
    </main>
  );
}
