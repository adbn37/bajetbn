import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { LoadingScreen } from '../components/LoadingScreen';
import { AuthProvider } from '../contexts/AuthContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { OfflineSyncProvider } from '../contexts/OfflineSyncContext';
import { firebaseConfigured } from '../services/firebase';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppShell } from '../layouts/AppShell';
import { SetupRequiredPage } from '../pages/SetupRequiredPage';
import { PlatformAdminRoute, ProtectedRoute } from './RouteGuards';

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const VerifyEmailPage = lazy(() => import('../features/auth/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const OnboardingPage = lazy(() => import('../features/onboarding/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const SpacesPage = lazy(() => import('../features/spaces/SpacesPage').then((module) => ({ default: module.SpacesPage })));
const ArchivedSpacesPage = lazy(() => import('../features/spaces/ArchivedSpacesPage').then((module) => ({ default: module.ArchivedSpacesPage })));
const SpaceDetailsPage = lazy(() => import('../features/spaces/SpaceDetailsPage').then((module) => ({ default: module.SpaceDetailsPage })));
const CollectionInventoryPage = lazy(() => import('../features/collection/CollectionInventoryPage').then((module) => ({ default: module.CollectionInventoryPage })));
const CollectionOrganizationPage = lazy(() => import('../features/collection/CollectionOrganizationPage').then((module) => ({ default: module.CollectionOrganizationPage })));
const CollectionAddItemPage = lazy(() => import('../features/collection/CollectionInventoryPage').then((module) => ({ default: module.CollectionAddItemPage })));
const CollectionItemDetailsPage = lazy(() => import('../features/collection/CollectionItemDetailsPage').then((module) => ({ default: module.CollectionItemDetailsPage })));
const SmePosPage = lazy(() => import('../features/sme-pos/SmePosPage').then((module) => ({ default: module.SmePosPage })));
const SmePosSettingsPage = lazy(() => import('../features/sme-pos/SmePosSettingsPage').then((module) => ({ default: module.SmePosSettingsPage })));
const SmePosArchivedRecordsPage = lazy(() => import('../features/sme-pos/SmePosArchivedRecordsPage').then((module) => ({ default: module.SmePosArchivedRecordsPage })));
const AccountsPage = lazy(() => import('../features/accounts/AccountsPage').then((module) => ({ default: module.AccountsPage })));
const ClosedAccountsPage = lazy(() => import('../features/accounts/ClosedAccountsPage').then((module) => ({ default: module.ClosedAccountsPage })));
const TransactionsPage = lazy(() => import('../features/transactions/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));
const RecurringTransactionsPage = lazy(() => import('../features/recurring/RecurringTransactionsPage').then((module) => ({ default: module.RecurringTransactionsPage })));
const StoppedRecurringTransactionsPage = lazy(() => import('../features/recurring/StoppedRecurringTransactionsPage').then((module) => ({ default: module.StoppedRecurringTransactionsPage })));
const BudgetsPage = lazy(() => import('../features/budgets/BudgetsPage').then((module) => ({ default: module.BudgetsPage })));
const ArchivedBudgetsPage = lazy(() => import('../features/budgets/ArchivedBudgetsPage').then((module) => ({ default: module.ArchivedBudgetsPage })));
const GoalsPage = lazy(() => import('../features/goals/GoalsPage').then((module) => ({ default: module.GoalsPage })));
const ArchivedGoalsPage = lazy(() => import('../features/goals/ArchivedGoalsPage').then((module) => ({ default: module.ArchivedGoalsPage })));
const CommitmentsPage = lazy(() => import('../features/commitments/CommitmentsPage').then((module) => ({ default: module.CommitmentsPage })));
const DebtPage = lazy(() => import('../features/debt/DebtPage').then((module) => ({ default: module.DebtPage })));
const ArchivedCommitmentsPage = lazy(() => import('../features/commitments/ArchivedCommitmentsPage').then((module) => ({ default: module.ArchivedCommitmentsPage })));
const ArchivedCategoriesPage = lazy(() => import('../features/categories/ArchivedCategoriesPage').then((module) => ({ default: module.ArchivedCategoriesPage })));
const JoinSpacePage = lazy(() => import('../features/collaboration/JoinSpacePage').then((module) => ({ default: module.JoinSpacePage })));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const CalendarPage = lazy(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const SearchPage = lazy(() => import('../features/search/SearchPage').then((module) => ({ default: module.SearchPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const MorePage = lazy(() => import('../pages/MorePage').then((module) => ({ default: module.MorePage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const MyInboxPage = lazy(() => import('../pages/MyInboxPage').then((module) => ({ default: module.MyInboxPage })));
const OfflineSyncPage = lazy(() => import('../pages/OfflineSyncPage').then((module) => ({ default: module.OfflineSyncPage })));
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage').then((module) => ({ default: module.SubscriptionPage })));
const AdminPortalPage = lazy(() => import('../pages/AdminPortalPage').then((module) => ({ default: module.AdminPortalPage })));

export default function App() {
  if (!firebaseConfigured) return <SetupRequiredPage />;

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <PreferencesProvider>
          <OfflineSyncProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                </Route>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="more" element={<MorePage />} />
                  <Route path="spaces" element={<SpacesPage />} />
                  <Route path="spaces/archived" element={<ArchivedSpacesPage />} />
                  <Route path="spaces/:spaceId" element={<SpaceDetailsPage />} />
                  <Route path="spaces/:spaceId/collection" element={<CollectionInventoryPage />} />
                  <Route path="spaces/:spaceId/collection/organize" element={<CollectionOrganizationPage />} />
                  <Route path="spaces/:spaceId/collection/add" element={<CollectionAddItemPage />} />
                  <Route path="spaces/:spaceId/collection/items/:itemId" element={<CollectionItemDetailsPage />} />
                  <Route path="spaces/:spaceId/pos" element={<SmePosPage />} />
                  <Route path="spaces/:spaceId/pos/settings" element={<SmePosSettingsPage />} />
                  <Route path="spaces/:spaceId/pos/archived" element={<SmePosArchivedRecordsPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="accounts/closed" element={<ClosedAccountsPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="recurring" element={<RecurringTransactionsPage />} />
                  <Route path="recurring/stopped" element={<StoppedRecurringTransactionsPage />} />
                  <Route path="budgets" element={<BudgetsPage />} />
                  <Route path="budgets/archived" element={<ArchivedBudgetsPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="goals/archived" element={<ArchivedGoalsPage />} />
                  <Route path="bills" element={<CommitmentsPage />} />
                  <Route path="debt" element={<DebtPage />} />
                  <Route path="bills/archived" element={<ArchivedCommitmentsPage />} />
                  <Route path="categories/archived" element={<ArchivedCategoriesPage />} />
                  <Route path="sharing" element={<Navigate to="/spaces" replace />} />
                  <Route path="join" element={<JoinSpacePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="inbox" element={<MyInboxPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="offline-sync" element={<OfflineSyncPage />} />
                  <Route path="subscription" element={<SubscriptionPage />} />
                  <Route
                    path="settings/subscription"
                    element={<Navigate to="/subscription" replace />}
                  />
                  <Route
                    path="admin"
                    element={
                      <PlatformAdminRoute>
                        <AdminPortalPage />
                      </PlatformAdminRoute>
                    }
                  />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </OfflineSyncProvider>
        </PreferencesProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
