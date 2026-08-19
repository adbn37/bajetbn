import { ThemeChooser } from '../components/ThemeChooser';
import { PersonalStyleSettings } from '../components/PersonalStyleSettings';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { AccountDeletionModal } from '../components/AccountDeletionModal';
import { ActionConfirmModal, type ActionConfirmState } from '../components/ActionConfirmModal';
import { PageHeader } from '../components/PageHeader';
import { appBuildLabel } from '../config/release';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  cancelAccountDeletion,
  checkAccountDeletionEligibility,
  getAccountDeletionRequest,
  recordAccountDataExport,
  requestAccountDeletion,
} from '../repositories/accountDeletionRepository';
import {
  buildUserDataExport,
  checkAccountRecords,
  downloadJsonFile,
  releaseDownloadUrl,
  type DataHealthResult,
} from '../repositories/releaseCandidateRepository';
import type { AccountDeletionEligibility, AccountDeletionRequest, Language, TextSize } from '../types/models';
import {
  disableBrowserPush,
  enableBrowserPush,
  getBrowserPushSupport,
  runMyBackgroundReminderCheck,
  type BrowserPushSupport,
} from '../repositories/notificationRepository';
import { getErrorMessage } from '../utils/errors';
import { formatMoney } from '../utils/money';

interface ReadyDownload {
  url: string;
  filename: string;
}

function timestampToDate(value?: Timestamp | null): Date | null {
  if (!value) return null;
  return typeof value.toDate === 'function' ? value.toDate() : null;
}

function formatBruneiDate(value?: Timestamp | null): string {
  const date = timestampToDate(value);
  return date
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Brunei' }).format(date)
    : 'Not available';
}

export function SettingsPage() {
  const { profile, user, logOut, refreshProfile, reauthenticateForSensitiveAction } = useAuth();
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
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [deletionEligibility, setDeletionEligibility] = useState<AccountDeletionEligibility | null>(null);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState('');
  const [cancelDialog, setCancelDialog] = useState<ActionConfirmState<'cancel'> | null>(null);
  const [pushSupport, setPushSupport] = useState<BrowserPushSupport | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [reminderCheckBusy, setReminderCheckBusy] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState('');
  const [reminderError, setReminderError] = useState('');

  const passwordRequired = useMemo(
    () => Boolean(user?.providerData.some((item) => item.providerId === 'password')),
    [user],
  );
  const exportReady = useMemo(() => {
    const date = timestampToDate(profile?.lastDataExportAt);
    return Boolean(
      deletionEligibility?.exportPrepared
      || (date && Date.now() - date.getTime() <= 24 * 60 * 60 * 1000),
    );
  }, [deletionEligibility?.exportPrepared, profile?.lastDataExportAt]);

  useEffect(() => {
    setFullName(profile?.fullName || user?.displayName || '');
  }, [profile, user]);

  useEffect(() => {
    let active = true;
    void getBrowserPushSupport().then((support) => { if (active) setPushSupport(support); });
    return () => { active = false; };
  }, [profile?.browserPushEnabled]);

  useEffect(() => () => releaseDownloadUrl(readyDownload?.url || null), [readyDownload]);

  useEffect(() => {
    if (!user) {
      setDeletionRequest(null);
      return;
    }
    void getAccountDeletionRequest(user.uid)
      .then(setDeletionRequest)
      .catch((nextError) => setDeletionError(getErrorMessage(nextError)));
  }, [user]);

  async function changeDeviceNotifications(enabled: boolean) {
    setPushBusy(true);
    setReminderError('');
    setReminderFeedback('');
    try {
      if (enabled) await enableBrowserPush();
      else await disableBrowserPush();
      preferences.setNotificationPreference('browserPushEnabled', enabled);
      setReminderFeedback(enabled
        ? 'Device notifications are ready. Save your settings to keep the rest of your reminder choices.'
        : 'Device notifications are turned off for your saved devices.');
      setPushSupport(await getBrowserPushSupport());
    } catch (nextError) {
      setReminderError(getErrorMessage(nextError));
      setPushSupport(await getBrowserPushSupport());
    } finally {
      setPushBusy(false);
    }
  }

  async function checkRemindersNow() {
    setReminderCheckBusy(true);
    setReminderError('');
    setReminderFeedback('Checking bills and goals that need attention…');
    try {
      const result = await runMyBackgroundReminderCheck();
      setReminderFeedback(result.created > 0
        ? `${result.created} new reminder${result.created === 1 ? '' : 's'} prepared. Open Notifications to review them.`
        : 'No new reminders were needed. Existing reminders were not duplicated.');
    } catch (nextError) {
      setReminderError(getErrorMessage(nextError));
      setReminderFeedback('');
    } finally {
      setReminderCheckBusy(false);
    }
  }

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
      await recordAccountDataExport();
      await refreshProfile();
      setDataMessage('Your data file is ready and the export check is recorded for 24 hours. If it did not download automatically, press “Save data file” below. Keep it private because it contains your money information.');
    } catch (nextError) {
      setDataError(getErrorMessage(nextError));
      setDataMessage('');
    } finally {
      setDataBusy(null);
    }
  }


  async function loadDeletionEligibility(openModal = false) {
    setDeletionLoading(true);
    setDeletionError('');
    if (openModal) setDeletionModalOpen(true);
    try {
      const result = await checkAccountDeletionEligibility();
      setDeletionEligibility(result);
    } catch (nextError) {
      setDeletionError(getErrorMessage(nextError));
    } finally {
      setDeletionLoading(false);
    }
  }

  async function submitDeletionRequest(password: string) {
    if (!user) return;
    setDeletionBusy(true);
    setDeletionError('');
    try {
      await reauthenticateForSensitiveAction(password);
      const result = await requestAccountDeletion({ confirmation: 'DELETE', exportAcknowledged: true });
      setDeletionRequest(result);
      setDeletionModalOpen(false);
      await refreshProfile();
      setSuccess('Account deletion requested. You can cancel before the scheduled date.');
    } catch (nextError) {
      setDeletionError(getErrorMessage(nextError));
      await loadDeletionEligibility();
    } finally {
      setDeletionBusy(false);
    }
  }

  async function runCancellation() {
    setDeletionBusy(true);
    setDeletionError('');
    try {
      await cancelAccountDeletion();
      setDeletionRequest(null);
      setCancelDialog(null);
      await refreshProfile();
      setSuccess('Account deletion request cancelled.');
    } catch (nextError) {
      setDeletionError(getErrorMessage(nextError));
    } finally {
      setDeletionBusy(false);
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
            <div className="settings-theme-field">
              <ThemeChooser />
            </div>
            <label>Text size
              <select value={preferences.textSize} onChange={(event) => preferences.setTextSize(event.target.value as TextSize)}>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        </section>

        <PersonalStyleSettings userId={user?.uid || ''} />
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
            <div><h2>Reminders</h2><p>BajetBN can prepare reminders even when the app is closed.</p></div>
          </div>
          <div className="preference-toggle-list">
            <label className="preference-toggle"><input type="checkbox" checked={preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('notificationsEnabled', event.target.checked)} /><span><strong>Show reminders inside BajetBN</strong><small>See helpful messages in the Notification Centre.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.backgroundRemindersEnabled} disabled={!preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('backgroundRemindersEnabled', event.target.checked)} /><span><strong>Prepare reminders while BajetBN is closed</strong><small>Scheduled checks create reminders without needing the app to stay open.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.dueSoonReminders} disabled={!preferences.notificationsEnabled || !preferences.backgroundRemindersEnabled} onChange={(event) => preferences.setNotificationPreference('dueSoonReminders', event.target.checked)} /><span><strong>Remind me before a bill is due</strong><small>Show bills that need attention soon.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.lateReminders} disabled={!preferences.notificationsEnabled || !preferences.backgroundRemindersEnabled} onChange={(event) => preferences.setNotificationPreference('lateReminders', event.target.checked)} /><span><strong>Tell me when a bill is late</strong><small>Create one late reminder for each unpaid due date.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.goalReminders} disabled={!preferences.notificationsEnabled || !preferences.backgroundRemindersEnabled} onChange={(event) => preferences.setNotificationPreference('goalReminders', event.target.checked)} /><span><strong>Remind me about goal dates</strong><small>Bring active savings goals to your attention near their target date.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.sharedPaymentNotifications} disabled={!preferences.notificationsEnabled} onChange={(event) => preferences.setNotificationPreference('sharedPaymentNotifications', event.target.checked)} /><span><strong>Tell me about shared payments</strong><small>Show updates when a member submits or confirms a payment.</small></span></label>
            <label className="preference-toggle"><input type="checkbox" checked={preferences.whatsappRemindersEnabled} onChange={(event) => preferences.setNotificationPreference('whatsappRemindersEnabled', event.target.checked)} /><span><strong>Show WhatsApp reminder buttons</strong><small>Open WhatsApp with a ready message. You still press Send yourself.</small></span></label>
          </div>
          <label className="reminder-days-field">Remind me this many days before
            <div><input type="number" min="0" max="30" value={preferences.reminderDaysBefore} onChange={(event) => preferences.setReminderDaysBefore(Number(event.target.value))} /><span>days</span></div>
          </label>
          <div className="notification-device-card">
            <div>
              <strong>Device notifications</strong>
              <p>{pushSupport?.message || 'Checking whether this browser supports device notifications…'}</p>
              <small>These are optional. Your in-app reminders still work without them.</small>
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={pushBusy || !pushSupport?.supported || !pushSupport?.configured || pushSupport.permission === 'denied'}
              onClick={() => void changeDeviceNotifications(!preferences.browserPushEnabled)}
            >
              {pushBusy ? 'Updating…' : preferences.browserPushEnabled ? 'Turn off on my devices' : 'Turn on for this device'}
            </button>
          </div>
          <div className="reminder-check-row">
            <button type="button" className="button secondary" disabled={reminderCheckBusy || !preferences.notificationsEnabled || !preferences.backgroundRemindersEnabled} onClick={() => void checkRemindersNow()}>
              {reminderCheckBusy ? 'Checking…' : 'Check reminders now'}
            </button>
            <small>Safe to run more than once. BajetBN will not create the same reminder twice.</small>
          </div>
          {reminderError && <div className="notice error">{reminderError}</div>}
          {reminderFeedback && <div className="notice success">{reminderFeedback}</div>}
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

        {deletionRequest && ['pending', 'processing', 'blocked', 'failed'].includes(deletionRequest.status) ? (
          <article className={`account-deletion-status ${deletionRequest.status}`}>
            <div>
              <span className="status-badge">{deletionRequest.status === 'pending' ? 'Cooling-off period' : deletionRequest.status === 'processing' ? 'Deletion in progress' : deletionRequest.status === 'blocked' ? 'Action required' : 'Needs attention'}</span>
              <h3>{deletionRequest.status === 'pending' ? 'Your deletion request is scheduled' : deletionRequest.status === 'processing' ? 'BajetBN is removing your private data' : deletionRequest.status === 'blocked' ? 'Deletion is paused' : 'Deletion could not be completed'}</h3>
              <p>{deletionRequest.status === 'pending'
                ? `Scheduled for ${formatBruneiDate(deletionRequest.scheduledFor)}. You can cancel any time before processing begins.`
                : deletionRequest.status === 'processing'
                  ? 'Do not add new records. Your sign-in will stop working when the process finishes.'
                  : deletionRequest.status === 'blocked'
                    ? 'A shared-Space responsibility still needs to be resolved. Open the deletion details and check again.'
                    : 'Your account remains available. You may cancel this request and try again after reviewing the message.'}</p>
              {deletionRequest.lastError && <small>{deletionRequest.lastError}</small>}
            </div>
            <div className="button-row">
              {deletionRequest.status === 'blocked' && <button type="button" className="button secondary" disabled={deletionBusy} onClick={() => void loadDeletionEligibility(true)}>Review blockers</button>}
              {deletionRequest.status !== 'processing' && <button type="button" className="button danger-outline" disabled={deletionBusy} onClick={() => setCancelDialog({
                payload: 'cancel',
                title: 'Cancel account deletion?',
                description: 'Your BajetBN account and records will remain available. You can submit a new request later.',
                confirmLabel: 'Cancel deletion request',
                tone: 'danger',
              })}>Cancel deletion</button>}
            </div>
          </article>
        ) : (
          <div className="button-row">
            <button type="button" className="button secondary" onClick={() => void logOut()}>Sign out of this device</button>
            <button type="button" className="button danger-outline" onClick={() => void loadDeletionEligibility(true)}>Delete my account</button>
          </div>
        )}

        {deletionError && !deletionModalOpen && <div className="notice error account-deletion-error">{deletionError}</div>}
        <p className="settings-build-info">App: {appBuildLabel()} · Brunei time</p>
      </section>

      {deletionModalOpen && <AccountDeletionModal
        eligibility={deletionEligibility}
        loading={deletionLoading}
        busy={deletionBusy || dataBusy === 'download'}
        error={deletionError}
        passwordRequired={passwordRequired}
        exportReady={exportReady}
        onRefresh={() => void loadDeletionEligibility()}
        onDownload={() => void downloadMyData()}
        onClose={() => { setDeletionModalOpen(false); setDeletionError(''); }}
        onConfirm={(password) => void submitDeletionRequest(password)}
      />}

      {cancelDialog && <ActionConfirmModal
        state={cancelDialog}
        busy={deletionBusy}
        error={deletionError}
        onClose={() => { setCancelDialog(null); setDeletionError(''); }}
        onConfirm={() => void runCancellation()}
      />}
    </main>
  );
}
