import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import type { Appearance, Language, TextSize } from '../types/models';
import { getErrorMessage } from '../utils/errors';

export function SettingsPage() {
  const { profile, user, logOut } = useAuth();
  const preferences = usePreferences();
  const [fullName, setFullName] = useState(profile?.fullName || user?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFullName(profile?.fullName || user?.displayName || '');
  }, [profile, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await preferences.savePreferences(fullName);
      setSuccess('Settings saved.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page settings-page">
      <PageHeader
        eyebrow="Preferences"
        title="Your settings"
        description="Keep BajetBN easy to read and suited to how you manage money."
      />

      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      <form className="settings-form" onSubmit={submit}>
        <section className="panel settings-section">
          <div className="settings-section-heading">
            <div><h2>Profile</h2><p>Choose the name shown in BajetBN.</p></div>
          </div>
          <div className="form-grid">
            <label className="span-2">Name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
            <label className="span-2">Email<input value={user?.email || ''} readOnly disabled /></label>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="settings-section-heading">
            <div><h2>Language and appearance</h2><p>Changes are shown straight away. Save when you are happy.</p></div>
          </div>
          <div className="form-grid">
            <label>Language
              <select value={preferences.language} onChange={(event) => preferences.setLanguage(event.target.value as Language)}>
                <option value="en">English</option>
                <option value="ms">Bahasa Melayu</option>
              </select>
            </label>
            <label>Appearance
              <select value={preferences.appearance} onChange={(event) => preferences.setAppearance(event.target.value as Appearance)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">Use device setting</option>
              </select>
            </label>
            <label>Text size
              <select value={preferences.textSize} onChange={(event) => preferences.setTextSize(event.target.value as TextSize)}>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </label>
            <div className="theme-preview" aria-label="Appearance preview">
              <span className="theme-preview-dot" />
              <div><strong>{preferences.resolvedTheme === 'dark' ? 'Dark' : 'Light'}</strong><small>Current view</small></div>
            </div>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="settings-section-heading">
            <div><h2>Money and time</h2><p>BajetBN uses BND and Brunei time so dates and amounts stay clear.</p></div>
          </div>
          <div className="form-grid">
            <label>Currency<select value="BND" disabled><option value="BND">BND — Brunei Dollar</option></select></label>
            <label>Timezone<select value="Asia/Brunei" disabled><option value="Asia/Brunei">Asia/Brunei (UTC+8)</option></select></label>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="settings-section-heading">
            <div><h2>Reminders</h2><p>Choose what BajetBN should bring to your attention.</p></div>
          </div>
          <div className="preference-toggle-list">
            <label className="preference-toggle"><input type="checkbox" checked={preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('notificationsEnabled', event.target.checked)} /><span><strong>Show reminders inside BajetBN</strong><small>See helpful messages in the app.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.dueSoonReminders} disabled={!preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('dueSoonReminders', event.target.checked)} /><span><strong>Remind me before a bill is due</strong><small>Show bills that need attention soon.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.lateReminders} disabled={!preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('lateReminders', event.target.checked)} /><span><strong>Tell me when a bill is late</strong><small>Keep late bills easy to find.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.sharedPaymentNotifications} disabled={!preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('sharedPaymentNotifications', event.target.checked)} /><span><strong>Tell me about shared payments</strong><small>Show updates when a member submits or confirms a payment.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.whatsappRemindersEnabled} onChange={(event) => preferences.setNotificationPreference('whatsappRemindersEnabled', event.target.checked)} /><span><strong>Show WhatsApp reminder buttons</strong><small>Open WhatsApp with a ready message. You still press Send yourself.</small></span></label>
          </div>
          <label className="reminder-days-field">Remind me this many days before
            <div><input type="number" min="0" max="30" value={preferences.reminderDaysBefore} onChange={(event) => preferences.setReminderDaysBefore(Number(event.target.value))} /><span>days</span></div>
          </label>
        </section>

        <div className="settings-save-bar">
          <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>

      <section className="panel settings-section settings-account-controls">
        <div className="settings-section-heading">
          <div><h2>Account controls</h2><p>Your privacy and data tools will stay available even without a paid plan.</p></div>
        </div>
        <div className="button-row">
          <button type="button" className="button secondary" onClick={() => void logOut()}>Sign out of this device</button>
          <button type="button" className="button secondary" disabled>Download my data — coming later</button>
          <button type="button" className="button danger-outline" disabled>Delete my account — coming later</button>
        </div>
      </section>
    </main>
  );
}
