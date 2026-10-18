/**
 * BajetBN Phase 10.7 — intent-aware route warming.
 * Downloads JS only, never bypasses route guards or reads private account data.
 * Heavy optional pages are warmed only after navigation intent.
 */
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/DashboardPage'),
  '/more': () => import('../pages/MorePage'),
  '/goals': () => import('../features/goals/GoalsPage'),
  '/goals/archived': () => import('../features/goals/ArchivedGoalsPage'),
  '/transactions': () => import('../features/transactions/TransactionsPage'),
  '/accounts': () => import('../features/accounts/AccountsPage'),
  '/budgets': () => import('../features/budgets/BudgetsPage'),
  '/bills': () => import('../features/commitments/CommitmentsPage'),
  '/recurring': () => import('../features/recurring/RecurringTransactionsPage'),
  '/spaces': () => import('../features/spaces/SpacesPage'),
  '/reports': () => import('../features/reports/ReportsPage'),
  '/calendar': () => import('../features/calendar/CalendarPage'),
  '/search': () => import('../features/search/SearchPage'),
  '/settings': () => import('../pages/SettingsPage'),
  '/inbox': () => import('../pages/MyInboxPage'),
  '/notifications': () => import('../pages/NotificationsPage'),
  '/debt': () => import('../features/debt/DebtPage'),
  '/documents': () => import('../features/business/MyPrivateDocumentsPage'),
  '/subscription': () => import('../pages/SubscriptionPage'),
};

const inflight = new Map<string, Promise<unknown>>();
function routeKey(raw: string): string {
  const path = raw.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  if (loaders[path]) return path;
  if (/^\/business\/[^/]+$/.test(path)) return 'business-home';
  if (/^\/spaces\/[^/]+\/business\/money$/.test(path)) return 'business-money';
  if (/^\/spaces\/[^/]+\/business\/invoices$/.test(path)) return 'business-invoices';
  if (/^\/spaces\/[^/]+$/.test(path)) return 'space-details';
  return '';
}
const extraLoaders: Record<string, () => Promise<unknown>> = {
  'business-home': () => import('../features/business/BusinessHomePage'),
  'business-money': () => import('../features/business/BusinessMoneyActivityPage'),
  'business-invoices': () => import('../features/business/BusinessInvoicesPage'),
  'space-details': () => import('../features/spaces/SpaceDetailsPage'),
};

export function warmRouteV107(rawPath: string): void {
  const key = routeKey(rawPath);
  if (!key || inflight.has(key)) return;
  const load = loaders[key] || extraLoaders[key];
  if (!load) return;
  const promise = load().catch(() => {
    // Network error: allow retry on the next real user intent.
    inflight.delete(key);
  });
  inflight.set(key, promise);
}
