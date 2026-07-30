import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errors';

export function LoginPage() {
  const { user, profile, signInWithEmail, signInWithGoogle } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    if (!user.emailVerified && user.providerData.some((item) => item.providerId === 'password')) return <Navigate to="/verify-email" replace />;
    return <Navigate to={profile?.onboardingCompleted ? (location.state?.from || '/') : '/onboarding'} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { await signInWithEmail(email, password); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-card">
      <span className="eyebrow">Welcome back</span>
      <h2>Sign in to BajetBN</h2>
      <p>Open your personal and shared money Spaces.</p>
      {location.state?.registered && <div className="notice success">Account created. Check your inbox to verify your email.</div>}
      {error && <div className="notice error">{error}</div>}
      <button className="button secondary full" onClick={() => void signInWithGoogle()} disabled={busy}>Continue with Google</button>
      <div className="divider"><span>or use email</span></div>
      <form onSubmit={submit} className="form-stack">
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="button primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth-switch">New to BajetBN? <Link to="/register">Create an account</Link></p>
    </div>
  );
}
