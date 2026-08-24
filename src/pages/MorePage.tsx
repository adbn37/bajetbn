import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { planLabel } from '../services/entitlements';

interface MoreTool {
  path: string;
  icon: string;
  title: string;
  description: string;
}

interface MoreGroup {
  title: string;
  tools: MoreTool[];
}

const GROUPS: MoreGroup[] = [
  {
    title: 'Money',
    tools: [
      {
        path: '/accounts',
        icon: '◉',
        title: 'Accounts',
        description: 'Bank, cash, e-wallet and card balances',
      },
      {
        path: '/bills',
        icon: '◷',
        title: 'Bills',
        description: 'Bills, instalments and upcoming commitments',
      },
      {
        path: '/debt',
        icon: '⇄',
        title: 'Debt',
        description: 'Track money you owe or are owed',
      },
      {
        path: '/recurring',
        icon: '↻',
        title: 'Recurring',
        description: 'Repeat income and expenses',
      },
    ],
  },
  {
    title: 'Plan',
    tools: [
      {
        path: '/budgets',
        icon: '▤',
        title: 'Budgets',
        description: 'Set spending limits and stay on track',
      },
      {
        path: '/goals',
        icon: '◇',
        title: 'Goals',
        description: 'Save towards something important',
      },
      {
        path: '/calendar',
        icon: '▦',
        title: 'Calendar',
        description: 'See important money dates',
      },
      {
        path: '/spaces',
        icon: '◫',
        title: 'Spaces',
        description: 'Household, Trip, SME and shared spaces',
      },
    ],
  },
  {
    title: 'Insights & tools',
    tools: [
      {
        path: '/reports',
        icon: '⌁',
        title: 'Reports',
        description: 'Understand where your money is going',
      },
      {
        path: '/inbox',
        icon: '✓',
        title: 'Needs Attention',
        description: 'Items that need your action',
      },
      {
        path: '/search',
        icon: '⌕',
        title: 'Search',
        description: 'Find money activity and records',
      },
      {
        path: '/offline-sync',
        icon: '⇅',
        title: 'Offline & Sync',
        description: 'Check pending or synced changes',
      },
    ],
  },
];

export function MorePage() {
  const { profile } = useAuth();
  const currentPlan = planLabel(profile);

  return (
    <main className="page more-v110">
      <header className="more-v110-header">
        <div>
          <span className="more-v110-kicker">BajetBN</span>
          <h1>More</h1>
          <p>Everything else, kept in one simple place.</p>
        </div>

        <Link
          to="/settings"
          className="more-v110-settings-button"
          aria-label="Open settings"
        >
          ⚙
        </Link>
      </header>

      <Link
        to="/subscription"
        className={`more-v110-plan ${currentPlan === 'Plus' ? 'plus' : ''}`}
      >
        <span className="more-v110-plan-icon">
          {currentPlan === 'Plus' ? '✦' : '○'}
        </span>

        <span>
          <small>Your plan</small>
          <strong>BajetBN {currentPlan}</strong>
          <p>
            {currentPlan === 'Plus'
              ? 'Manage your Plus subscription'
              : 'See what you can unlock with Plus'}
          </p>
        </span>

        <b aria-hidden="true">›</b>
      </Link>

      {GROUPS.map((group) => (
        <section className="more-v110-group" key={group.title}>
          <h2>{group.title}</h2>

          <div className="more-v110-grid">
            {group.tools.map((tool) => (
              <Link
                to={tool.path}
                className="more-v110-tool"
                key={tool.path}
              >
                <span className="more-v110-tool-icon" aria-hidden="true">
                  {tool.icon}
                </span>

                <span className="more-v110-tool-copy">
                  <strong>{tool.title}</strong>
                  <small>{tool.description}</small>
                </span>

                <span className="more-v110-tool-arrow" aria-hidden="true">
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="more-v110-account">
        <h2>Account</h2>

        <div className="more-v110-account-list">
          <Link to="/settings">
            <span>⚙</span>
            <span>
              <strong>Settings</strong>
              <small>Profile, theme, preferences and security</small>
            </span>
            <b>›</b>
          </Link>

          <Link to="/subscription">
            <span>✦</span>
            <span>
              <strong>Subscription</strong>
              <small>Plan, expiry and Plus access</small>
            </span>
            <b>›</b>
          </Link>
        </div>
      </section>
    </main>
  );
}
