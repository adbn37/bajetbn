import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  const passwordUser = user.providerData.some((item) => item.providerId === 'password');
  if (passwordUser && !user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!profile?.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return children;
}
