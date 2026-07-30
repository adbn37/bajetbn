import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { Brand } from '../../components/Brand';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { requireFirebase } from '../../services/firebase';
import { getErrorMessage } from '../../utils/errors';

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const preferences = usePreferences();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [language, setLanguage] = useState<'en' | 'ms'>(preferences.language);
  const currency = 'BND';
  const [timezone, setTimezone] = useState('Asia/Brunei');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboardingCompleted) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const { functions } = requireFirebase();
      const call = httpsCallable(functions, 'completeOnboarding');
      await call({ fullName, language, currency, timezone });
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return (
    <main className="onboarding-shell">
      <div className="onboarding-brand"><Brand /></div>
      <section className="onboarding-card">
        <span className="step-pill">Step 1 of 1</span>
        <h1>Set up your BajetBN home</h1>
        <p>We will create your private Personal Space. You can add household, business, trip, goal, or other Spaces later.</p>
        {error && <div className="notice error">{error}</div>}
        <form onSubmit={submit} className="form-grid">
          <label className="span-2">Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label>
          <label>Language<select value={language} onChange={(event) => { const next = event.target.value as 'en' | 'ms'; setLanguage(next); preferences.setLanguage(next); }}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select></label>
          <label>Currency<select value={currency} disabled><option value="BND">BND — Brunei Dollar</option></select></label>
          <label className="span-2">Timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Asia/Brunei">Asia/Brunei (UTC+8)</option></select></label>
          <div className="personal-space-preview span-2"><span className="space-icon personal">P</span><div><strong>Personal Space</strong><small>Private · Owner only · {currency}</small></div><span>We will create this for you</span></div>
          <button className="button primary span-2" disabled={busy}>{busy ? 'Creating your Space…' : 'Finish setup'}</button>
        </form>
      </section>
    </main>
  );
}
