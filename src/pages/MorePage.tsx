import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const moneyTools = [
  { to: '/accounts', label: 'Accounts', icon: 'A' },
  { to: '/bills', label: 'Bills', icon: 'B' },
  { to: '/budgets', label: 'Budgets', icon: 'B' },
  { to: '/goals', label: 'Goals', icon: 'G' },
  { to: '/recurring', label: 'Recurring', icon: 'R' },
  { to: '/reports', label: 'Reports', icon: 'R' },
];

const organiseTools = [
  { to: '/spaces', label: 'Spaces', icon: 'S' },
  { to: '/calendar', label: 'Calendar', icon: 'C' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/documents', label: 'Documents', icon: 'D' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/subscription', label: 'Plus', icon: 'P' },
];

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

        <div className="more-v110-grid more-shortcut-grid-v116">
          {moneyTools.map((item) => (
            <Link
              className="more-v110-tool more-grid-shortcut-v116"
              to={item.to}
              key={item.to}
            >
              <span
                className="more-grid-shortcut-icon-v116"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <strong>{item.label}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="more-v110-group">
        <h2>Tools</h2>

        <div className="more-v110-grid more-shortcut-grid-v116">
          {organiseTools.map((item) => (
            <Link
              className="more-v110-tool more-grid-shortcut-v116"
              to={item.to}
              key={item.to}
            >
              <span
                className="more-grid-shortcut-icon-v116"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <strong>{item.label}</strong>
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
