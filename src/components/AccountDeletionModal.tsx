import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccountDeletionEligibility } from '../types/models';
import { Modal } from './Modal';

export function AccountDeletionModal({
  eligibility,
  loading,
  busy,
  error,
  passwordRequired,
  exportReady,
  onRefresh,
  onDownload,
  onClose,
  onConfirm,
}: {
  eligibility: AccountDeletionEligibility | null;
  loading: boolean;
  busy: boolean;
  error: string;
  passwordRequired: boolean;
  exportReady: boolean;
  onRefresh: () => void;
  onDownload: () => void;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const blockers = eligibility?.blockers || [];
  const canSubmit = Boolean(
    eligibility?.eligible
      && exportReady
      && understood
      && confirmation.trim() === 'DELETE'
      && (!passwordRequired || password.length > 0),
  );
  const scheduleText = useMemo(() => {
    if (!eligibility?.coolingOffDays) return '7 days';
    return `${eligibility.coolingOffDays} days`;
  }, [eligibility?.coolingOffDays]);

  return <Modal title="Delete my BajetBN account" onClose={busy ? () => undefined : onClose}>
    <div className="account-deletion-dialog">
      <div className="notice warning">
        Your account will first enter a {scheduleText} cooling-off period. You can cancel during that time.
      </div>

      <div className="deletion-explanation-grid">
        <article><strong>Deleted</strong><p>Your profile, private Spaces, Accounts, personal money activity, reminders and private uploads.</p></article>
        <article><strong>Kept without your identity</strong><p>Shared payments and group financial history needed by other members will show “Deleted member”.</p></article>
        <article><strong>Blocked when unsafe</strong><p>You must first resolve ownership of a shared Space or Trip money that other people still depend on.</p></article>
      </div>

      {loading && <div className="notice">Checking shared Spaces and account responsibilities…</div>}

      {!loading && blockers.length > 0 && <div className="deletion-blockers">
        <strong>Resolve these items first</strong>
        <ul>{blockers.map((blocker) => <li key={`${blocker.code}-${blocker.spaceId || blocker.message}`}>
          <span>{blocker.message}</span>
          {blocker.spaceId && <Link to={`/spaces/${blocker.spaceId}`} onClick={onClose}>Open Space</Link>}
        </li>)}</ul>
        <button type="button" className="button secondary" disabled={busy} onClick={onRefresh}>Check again</button>
      </div>}

      {!loading && blockers.length === 0 && <>
        <div className={`deletion-export-gate ${exportReady ? 'ready' : ''}`}>
          <div><strong>{exportReady ? 'Data copy prepared' : 'Download your data first'}</strong><p>A current export prepared within the last 24 hours is required before the deletion request can be submitted.</p></div>
          <button type="button" className="button secondary" disabled={busy} onClick={onDownload}>{exportReady ? 'Download again' : 'Download my data'}</button>
        </div>

        {passwordRequired && <label>Your current password
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
        </label>}

        {!passwordRequired && <div className="notice">You will be asked to confirm your Google sign-in before the request is submitted.</div>}

        <label>Type <strong>DELETE</strong> to confirm
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoCapitalize="characters" autoComplete="off" />
        </label>

        <label className="deletion-understanding">
          <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
          <span>I understand that, after the cooling-off period, private data cannot be recovered and shared financial history may remain without my identity.</span>
        </label>
      </>}

      {error && <div className="notice error">{error}</div>}

      <div className="modal-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="button danger" disabled={!canSubmit || busy} onClick={() => onConfirm(password)}>
          {busy ? 'Submitting…' : 'Request account deletion'}
        </button>
      </div>
    </div>
  </Modal>;
}
