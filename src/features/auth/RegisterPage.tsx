import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errors';

export function RegisterPage() {
  const { user, registerWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.emailVerified ? '/onboarding' : '/verify-email'} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    setBusy(true); setError('');
    try {
      await registerWithEmail(email, password);
      navigate('/verify-email', { replace: true });
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-card">
      <span className="eyebrow">Create your account</span>
      <h2>Start with your Personal Space</h2>
      <p>Your settings and first Space are created during onboarding.</p>
      {error && <div className="notice error">{error}</div>}
      <button className="button secondary full" onClick={() => void signInWithGoogle()} disabled={busy}>Register with Google</button>
      <div className="divider"><span>or use email</span></div>
      <form onSubmit={submit} className="form-stack">
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Confirm password<input type="password" required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
        <button className="button primary full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
