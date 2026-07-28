import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { reload, sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errors';

export function VerifyEmailPage() {
  const { user, logOut } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to="/onboarding" replace />;

  const check = async () => {
    setError('');
    await reload(user);
    if (!user.emailVerified) setMessage('Not verified yet. Open the email link, then check again.');
    else window.location.assign('/onboarding');
  };

  return (
    <div className="auth-card">
      <span className="eyebrow">One more step</span>
      <h2>Verify your email</h2>
      <p>We sent a verification link to <strong>{user.email}</strong>.</p>
      {message && <div className="notice">{message}</div>}
      {error && <div className="notice error">{error}</div>}
      <div className="button-row">
        <button className="button primary" onClick={() => void check().catch((e) => setError(getErrorMessage(e)))}>I have verified</button>
        <button className="button secondary" onClick={() => void sendEmailVerification(user).then(() => setMessage('Verification email sent again.')).catch((e) => setError(getErrorMessage(e)))}>Resend</button>
      </div>
      <button className="text-button" onClick={() => void logOut()}>Use another account</button>
    </div>
  );
}
