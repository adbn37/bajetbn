import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { navigationIconSrc } from '../services/navigationIconAssets';

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
    <img
      className="more-grid-svg-v116 bajetbn-v104-navigation-art"
      src={navigationIconSrc(name)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      aria-hidden="true"
    />
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
