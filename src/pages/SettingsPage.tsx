import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  buildUserDataExport,
  checkAccountRecords,
  downloadJsonFile,
  releaseDownloadUrl,
  type DataHealthResult,
} from '../repositories/releaseCandidateRepository';
import type { Appearance, Language, TextSize } from '../types/models';
import { getErrorMessage } from '../utils/errors';
import { formatMoney } from '../utils/money';

interface ReadyDownload {
  url: string;
  filename: string;
}

export function SettingsPage() {
  const { profile, user, logOut } = useAuth();
  const preferences = usePreferences();
  const [fullName, setFullName] = useState(profile?.fullName || user?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [dataBusy, setDataBusy] = useState<'check' | 'download' | null>(null);
  const [dataCheck, setDataCheck] = useState<DataHealthResult | null>(null);
  const [readyDownload, setReadyDownload] = useState<ReadyDownload | null>(null);
  const [dataError, setDataError] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFullName(profile?.fullName || user?.displayName || '');
  }, [profile, user]);

  useEffect(() => () => releaseDownloadUrl(readyDownload?.url || null), [readyDownload]);

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

  async function runDataCheck() {
    if (!user) {
      setDataError('Please sign in again before checking your totals.');
      return;
    }

    setDataBusy('check');
    setDataError('');
    setDataMessage('Checking your account totals…');
    setDataCheck(null);

    try {
      const result = await checkAccountRecords(user.uid);
      setDataCheck(result);
      setDataMessage(result.allGood
        ? 'Your account totals match your saved account records.'
        : 'One or more account totals need attention. Do not change old records. Keep this result for support.');
    } catch (nextError) {
      setDataError(getErrorMessage(nextError));
      setDataMessage('');
    } finally {
      setDataBusy(null);
    }
  }

  async function downloadMyData() {
    if (!user) {
      setDataError('Please sign in again before downloading your data.');
      return;
    }

    setDataBusy('download');
    setDataError('');
    setDataMessage('Preparing your private data file…');

    try {
      const data = await buildUserDataExport(user.uid);
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Brunei' }).format(new Date());
      const filename = `bajetbn-my-data-${date}.json`;

      releaseDownloadUrl(readyDownload?.url || null);
      const url = downloadJsonFile(data, filename);
      setReadyDownload({ url, filename });
      setDataMessage('Your data file is ready. If it did not download automatically, press “Save data file” below. Keep it private because it contains your money information.');
    } catch (nextError) {
      setDataError(getErrorMessage(nextError));
      setDataMessage('');
    } finally {
      setDataBusy(null);
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

      <section className="panel settings-section settings-data-tools">
        <div className="settings-section-heading">
          <div><h2>My data</h2><p>Check your account totals or save a private copy of your BajetBN information.</p></div>
        </div>

        <div className="data-tool-grid">
          <article className="data-tool-card">
            <div><strong>Check account totals</strong><p>Compare each shown account total with its saved account records. This check does not change anything.</p></div>
            <button type="button" className="button secondary" disabled={dataBusy !== null} onClick={() => void runDataCheck()}>
              {dataBusy === 'check' ? 'Checking…' : 'Check my totals'}
            </button>
          </article>
          <article className="data-tool-card">
            <div><strong>Save a copy of my data</strong><p>Prepare a JSON file containing your profile, accounts, money activity, bills, goals and reminders.</p></div>
            <button type="button" className="button secondary" disabled={dataBusy !== null} onClick={() => void downloadMyData()}>
              {dataBusy === 'download' ? 'Preparing…' : 'Download my data'}
            </button>
          </article>
        </div>

        <div className="data-tool-feedback" aria-live="polite">
          {dataError && <div className="notice error">{dataError}</div>}
          {dataMessage && <div className="notice success">{dataMessage}</div>}
          {readyDownload && (
            <a className="button primary data-download-link" href={readyDownload.url} download={readyDownload.filename}>
              Save data file
            </a>
          )}
        </div>

        {dataCheck && (
          <div className={`data-check-result ${dataCheck.allGood ? 'good' : 'needs-attention'}`}>
            <div className="data-check-summary">
              <strong>{dataCheck.allGood ? 'Everything matches' : 'Some totals do not match'}</strong>
              <small>{dataCheck.accountsChecked} accounts and {dataCheck.recordsChecked} account records checked.</small>
            </div>
            <div className="data-check-list">
              {dataCheck.accounts.length === 0 && (
                <article>
                  <div><strong>No accounts yet</strong><small>Add an account before using this check.</small></div>
                </article>
              )}
              {dataCheck.accounts.map((item) => (
                <article key={item.accountId}>
                  <div><strong>{item.accountName}</strong><small>{item.matches ? 'Total matches' : 'Needs attention'}</small></div>
                  <div className="data-check-values">
                    <span>Shown: {formatMoney(item.shownMinor)}</span>
                    <span>Records: {formatMoney(item.recordedMinor)}</span>
                    {!item.matches && <b>Difference: {formatMoney(item.differenceMinor)}</b>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel settings-section settings-account-controls">
        <div className="settings-section-heading">
          <div><h2>Account controls</h2><p>Your privacy and data tools stay available without a paid plan.</p></div>
        </div>
        <div className="button-row">
          <button type="button" className="button secondary" onClick={() => void logOut()}>Sign out of this device</button>
          <button type="button" className="button danger-outline" disabled>Delete my account — coming later</button>
        </div>
        <p className="settings-build-info">App: v0.11.0 RC Alpha 1 · {import.meta.env.VITE_APP_ENV || 'local'} · Brunei time</p>
      </section>
    </main>
  );
}
