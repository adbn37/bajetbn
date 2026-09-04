import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resetContextualHelp } from '../services/contextualHelp';

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
  { to: '/settings', label: 'Settings' },
  { to: '/subscription', label: 'Subscription' },
];

export function MorePage() {
  const { user, logOut } = useAuth();

  return (
    <main className="page more-v110" data-simplified-more>
      <header className="more-v110-header">
        <div>
          <span className="more-v110-kicker">BajetBN</span>
          <h1>More</h1>
        </div>
      </header>

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

      <section className="more-v110-help">
        <div className="more-v110-help-copy">
          <span className="more-v110-help-icon" aria-hidden="true">?</span>
          <div><h2>Help</h2></div>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={!user}
          onClick={() => {
            if (user) resetContextualHelp(user.uid);
          }}
        >
          Replay tips
        </button>
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
