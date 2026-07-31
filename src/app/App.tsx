import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { LoadingScreen } from '../components/LoadingScreen';
import { AuthProvider } from '../contexts/AuthContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { firebaseConfigured } from '../services/firebase';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppShell } from '../layouts/AppShell';
import { SetupRequiredPage } from '../pages/SetupRequiredPage';
import { ProtectedRoute } from './RouteGuards';

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const VerifyEmailPage = lazy(() => import('../features/auth/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const OnboardingPage = lazy(() => import('../features/onboarding/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const SpacesPage = lazy(() => import('../features/spaces/SpacesPage').then((module) => ({ default: module.SpacesPage })));
const SpaceDetailsPage = lazy(() => import('../features/spaces/SpaceDetailsPage').then((module) => ({ default: module.SpaceDetailsPage })));
const AccountsPage = lazy(() => import('../features/accounts/AccountsPage').then((module) => ({ default: module.AccountsPage })));
const TransactionsPage = lazy(() => import('../features/transactions/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));
const BudgetsPage = lazy(() => import('../features/budgets/BudgetsPage').then((module) => ({ default: module.BudgetsPage })));
const GoalsPage = lazy(() => import('../features/goals/GoalsPage').then((module) => ({ default: module.GoalsPage })));
const CommitmentsPage = lazy(() => import('../features/commitments/CommitmentsPage').then((module) => ({ default: module.CommitmentsPage })));
const JoinSpacePage = lazy(() => import('../features/collaboration/JoinSpacePage').then((module) => ({ default: module.JoinSpacePage })));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const CalendarPage = lazy(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const SearchPage = lazy(() => import('../features/search/SearchPage').then((module) => ({ default: module.SearchPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

export default function App() {
  if (!firebaseConfigured) return <SetupRequiredPage />;

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <PreferencesProvider>
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
                  <Route path="spaces" element={<SpacesPage />} />
                  <Route path="spaces/:spaceId" element={<SpaceDetailsPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="budgets" element={<BudgetsPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="bills" element={<CommitmentsPage />} />
                  <Route path="sharing" element={<Navigate to="/spaces" replace />} />
                  <Route path="join" element={<JoinSpacePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PreferencesProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
