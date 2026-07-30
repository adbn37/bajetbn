import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { firebaseConfigured } from '../services/firebase';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppShell } from '../layouts/AppShell';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { SpacesPage } from '../features/spaces/SpacesPage';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { BudgetsPage } from '../features/budgets/BudgetsPage';
import { GoalsPage } from '../features/goals/GoalsPage';
import { CommitmentsPage } from '../features/commitments/CommitmentsPage';
import { CollaborationPage } from '../features/collaboration/CollaborationPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { JoinSpacePage } from '../features/collaboration/JoinSpacePage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SetupRequiredPage } from '../pages/SetupRequiredPage';
import { ProtectedRoute } from './RouteGuards';

export default function App() {
  if (!firebaseConfigured) return <SetupRequiredPage />;
  return <AuthProvider><BrowserRouter><Routes>
    <Route element={<AuthLayout />}><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/verify-email" element={<VerifyEmailPage />} /></Route>
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="spaces" element={<SpacesPage />} />
      <Route path="accounts" element={<AccountsPage />} />
      <Route path="transactions" element={<TransactionsPage />} />
      <Route path="budgets" element={<BudgetsPage />} />
      <Route path="goals" element={<GoalsPage />} />
      <Route path="bills" element={<CommitmentsPage />} />
      <Route path="sharing" element={<CollaborationPage />} />
      <Route path="join" element={<JoinSpacePage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter></AuthProvider>;
}
