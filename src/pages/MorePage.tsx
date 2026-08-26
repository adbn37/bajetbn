import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { SidebarCustomizer } from '../components/SidebarCustomizer';
import { useAuth } from '../contexts/AuthContext';
import { planLabel } from '../services/entitlements';
import { resetContextualHelp } from '../services/contextualHelp';
import {
  PERSONALISATION_EVENT,
  applyPersonalisation,
  defaultPersonalisation,
  loadPersonalisation,
  navigationIcon,
  orderedNavigation,
  secondaryNavigation,
  savePersonalisation,
  type NavigationId,
  type PersonalisationSettings,
} from '../services/personalisation';

const NAVIGATION_DESCRIPTIONS: Record<NavigationId, string> = {
  overview: 'Your main money overview',
  spaces: 'Personal, Household, Trip, Business and shared Spaces',
  inbox: 'Items that need your attention',
  accounts: 'Bank, cash, e-wallet and card balances',
  transactions: 'Income, expenses and transfers',
  recurring: 'Repeat income and expenses',
  budgets: 'Set spending limits and stay on track',
  goals: 'Save towards something important',
  bills: 'Bills, instalments and upcoming commitments',
  debt: 'Track money you owe or are owed',
  calendar: 'Important money dates',
  search: 'Find money activity and records',
  'offline-sync': 'Pending and synced offline changes',
  reports: 'Understand where your money is going',
};

export function MorePage() {
  const { profile, user, logOut } = useAuth();
  const currentPlan = planLabel(profile);

  const [personalisation, setPersonalisation] =
    useState<PersonalisationSettings>(
      defaultPersonalisation(),
    );

  const [menuCustomizerOpen, setMenuCustomizerOpen] =
    useState(false);

  useEffect(() => {
    if (!user) {
      const defaults = defaultPersonalisation();
      setPersonalisation(defaults);
      applyPersonalisation(defaults);
      return;
    }

    const initial = loadPersonalisation(user.uid);
    setPersonalisation(initial);
    applyPersonalisation(initial);

    const handlePersonalisation = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          uid: string;
          settings: PersonalisationSettings;
        }>
      ).detail;

      if (!detail || detail.uid !== user.uid) return;
      setPersonalisation(detail.settings);
    };

    window.addEventListener(
      PERSONALISATION_EVENT,
      handlePersonalisation,
    );

    return () => {
      window.removeEventListener(
        PERSONALISATION_EVENT,
        handlePersonalisation,
      );
    };
  }, [user]);

  const visibleNavigation = useMemo(
    () => orderedNavigation(personalisation),
    [personalisation],
  );

  const secondaryTools = useMemo(
    () => secondaryNavigation(personalisation),
    [personalisation],
  );

  function updatePersonalisation(
    next: PersonalisationSettings,
  ) {
    if (!user) return;

    setPersonalisation(
      savePersonalisation(user.uid, next),
    );
  }

  const replayTips = () => {
    if (!user) return;
    resetContextualHelp(user.uid);
  };

  return (
    <main className="page more-v110">
      <header className="more-v110-header">
        <div>
          <span className="more-v110-kicker">
            BajetBN
          </span>

          <h1>More</h1>

          <p>
            Your navigation, tools and account in one place.
          </p>
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
        className={`more-v110-plan ${
          currentPlan === 'Plus' ? 'plus' : ''
        }`}
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

      <section className="more-v110-group">
        <h2>Main menu</h2>

        <div className="more-v110-grid">
          {visibleNavigation.map((item) => (
            <Link
              to={item.path}
              className="more-v110-tool"
              key={item.path}
            >
              <span
                className="more-v110-tool-icon"
                aria-hidden="true"
              >
                {navigationIcon(
                  personalisation.iconPack,
                  item.id,
                  item.icon,
                )}
              </span>

              <span className="more-v110-tool-copy">
                <strong>{item.label}</strong>
                <small>
                  {NAVIGATION_DESCRIPTIONS[item.id]}
                </small>
              </span>

              <span
                className="more-v110-tool-arrow"
                aria-hidden="true"
              >
                ›
              </span>
            </Link>
          ))}
        </div>
      </section>

      {secondaryTools.length > 0 && (
        <section className="more-v110-group">
          <h2>More tools</h2>

          <div className="more-v110-grid">
            {secondaryTools.map((item) => (
              <Link
                to={item.path}
                className="more-v110-tool"
                key={`secondary-${item.path}`}
              >
                <span
                  className="more-v110-tool-icon"
                  aria-hidden="true"
                >
                  {navigationIcon(
                    personalisation.iconPack,
                    item.id,
                    item.icon,
                  )}
                </span>

                <span className="more-v110-tool-copy">
                  <strong>{item.label}</strong>
                  <small>
                    {NAVIGATION_DESCRIPTIONS[item.id]}
                  </small>
                </span>

                <span
                  className="more-v110-tool-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="more-v110-help">
        <div className="more-v110-help-copy">
          <span
            className="more-v110-help-icon"
            aria-hidden="true"
          >
            ?
          </span>

          <div>
            <h2>Help & tips</h2>
            <p>
              Replay first-use guidance whenever you need it.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={replayTips}
          disabled={!user}
        >
          Replay tips
        </button>
      </section>

      <section className="more-v110-account">
        <h2>Account & menu</h2>

        <div className="more-v110-account-list">
          <button
            type="button"
            className="more-v110-account-action"
            onClick={() => setMenuCustomizerOpen(true)}
          >
            <span>☷</span>

            <span>
              <strong>Customize menu</strong>
              <small>
                Reorder, pin or hide navigation items
              </small>
            </span>

            <b>›</b>
          </button>

          <Link to="/settings">
            <span>⚙</span>

            <span>
              <strong>Settings</strong>
              <small>
                Profile, theme, preferences and security
              </small>
            </span>

            <b>›</b>
          </Link>

          <Link to="/subscription">
            <span>✦</span>

            <span>
              <strong>Subscription</strong>
              <small>
                Plan, expiry and Plus access
              </small>
            </span>

            <b>›</b>
          </Link>

          <button
            type="button"
            className="more-v110-account-action more-v110-signout"
            onClick={() => void logOut()}
          >
            <span>↪</span>

            <span>
              <strong>Sign out</strong>
              <small>
                Sign out of this BajetBN account
              </small>
            </span>

            <b>›</b>
          </button>
        </div>
      </section>

      {menuCustomizerOpen && (
        <SidebarCustomizer
          settings={personalisation}
          onChange={updatePersonalisation}
          onClose={() => setMenuCustomizerOpen(false)}
        />
      )}
    </main>
  );
}
