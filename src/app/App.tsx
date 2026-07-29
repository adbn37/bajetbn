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
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
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
      <Route path="budgets" element={<PlaceholderPage title="Budgets" version="v0.6.0" description="Flexible budgets connected to Spaces, categories, and reporting periods." />} />
      <Route path="goals" element={<PlaceholderPage title="Goals" version="v0.6.0" description="Savings goals, progress, target dates, and linked contributions." />} />
      <Route path="bills" element={<PlaceholderPage title="Bills & commitments" version="v0.6.0" description="Recurring bills, instalments, reminders, and commitment calendars." />} />
      <Route path="reports" element={<PlaceholderPage title="Reports" version="v0.9.0" description="Financial health, cash flow, category trends, Space reports, and exports." />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter></AuthProvider>;
}
