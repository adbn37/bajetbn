import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  defaultSpaceAutomationPreference,
  getSpaceAutomationPreference,
  runMySpaceAutomationCheck,
  saveSpaceAutomationPreference,
} from '../../repositories/spaceAutomationRepository';
import type {
  Space,
  SpaceAutomationPreference,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

interface Props {
  space: Space;
  currentMember: SpaceMember;
}

function majorValue(minor: number) {
  if (!minor) return '';
  return String(minor / 100);
}

function minorValue(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(
    99_999_999_999,
    Math.round(number * 100),
  );
}

export function SpaceReminderAutomationPanel({
  space,
  currentMember,
}: Props) {
  const { user } = useAuth();
  const canManage =
    currentMember.role === 'owner'
    || currentMember.role === 'admin';

  const isSme = space.type === 'sme';

  const [preference, setPreference] =
    useState<SpaceAutomationPreference>(
      defaultSpaceAutomationPreference,
    );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    if (!user) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError('');

    void getSpaceAutomationPreference(user.uid, space.id)
      .then((next) => {
        if (active) setPreference(next);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [space.id, user]);

  const enabledRuleCount = useMemo(() => {
    let count = 0;
    if (preference.contributionReminder) count += 1;
    if (preference.overdueBillAlert) count += 1;
    if (preference.overdueTaskAlert) count += 1;

    if (canManage) {
      if (preference.budgetThresholdAlert) count += 1;
      if (preference.lowFundAlert) count += 1;
      if (isSme && preference.lowStockAlert) count += 1;
      if (isSme && preference.sellerPayoutAlert) count += 1;
    }

    return count;
  }, [canManage, isSme, preference]);

  function patch(values: Partial<SpaceAutomationPreference>) {
    setPreference((current) => ({
      ...current,
      ...values,
    }));
  }

  async function save() {
    if (!user) return;

    if (
      preference.enabled
      && preference.contributionReminder
      && !preference.contributionDueDate
    ) {
      setError('Choose a contribution reminder date or turn that rule off.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const saved = await saveSpaceAutomationPreference(
        user.uid,
        space.id,
        preference,
      );
      setPreference(saved);
      setNotice(
        saved.enabled
          ? 'Your Space reminder rules were saved.'
          : 'Space reminders are off for you in this Space.',
      );
    }
    catch (nextError) {
      setError(getErrorMessage(nextError));
    }
    finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    setChecking(true);
    setError('');
    setNotice('');

    try {
      const result = await runMySpaceAutomationCheck();
      setNotice(
        'Reminder check complete. '
        + result.created
        + ' new item(s), '
        + result.duplicates
        + ' already sent.',
      );
    }
    catch (nextError) {
      setError(getErrorMessage(nextError));
    }
    finally {
      setChecking(false);
    }
  }

  if (loading) {
    return <section className="panel space-automation-panel">
      <div className="loading-panel">Loading your Space reminders...</div>
    </section>;
  }

  return <section className="panel space-automation-panel">
    <div className="panel-heading space-automation-heading">
      <div>
        <span className="eyebrow">My reminders</span>
        <h2>Reminders & automation</h2>
        <p>
          Personal rules for {space.name}. They follow your account across devices
          and never change another member's settings.
        </p>
      </div>

      <span className="type-badge">
        {preference.enabled ? enabledRuleCount + ' rule(s) on' : 'Off'}
      </span>
    </div>

    <div className="space-automation-master">
      <label className="space-automation-toggle">
        <input
          type="checkbox"
          checked={preference.enabled}
          onChange={(event) => patch({ enabled: event.target.checked })}
        />
        <span>
          <strong>Enable reminders for this Space</strong>
          <small>
            Uses the existing BajetBN notification engine and My Inbox.
          </small>
        </span>
      </label>
    </div>

    <div
      className={
        'space-automation-grid'
        + (!preference.enabled ? ' disabled' : '')
      }
    >
      <article className="space-automation-card">
        <span className="eyebrow">Contributions</span>
        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.contributionReminder}
            onChange={(event) =>
              patch({ contributionReminder: event.target.checked })}
          />
          <span>
            <strong>Contribution due reminder</strong>
            <small>
              A personal reminder only. It does not create or move money.
            </small>
          </span>
        </label>

        {preference.contributionReminder && <label>
          Reminder date
          <input
            type="date"
            disabled={!preference.enabled}
            value={preference.contributionDueDate || ''}
            onChange={(event) =>
              patch({ contributionDueDate: event.target.value || null })}
          />
        </label>}
      </article>

      <article className="space-automation-card">
        <span className="eyebrow">Responsibilities</span>
        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.overdueBillAlert}
            onChange={(event) =>
              patch({ overdueBillAlert: event.target.checked })}
          />
          <span>
            <strong>Overdue shared bills</strong>
            <small>Your unpaid assigned amount appears in My Inbox.</small>
          </span>
        </label>

        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.overdueTaskAlert}
            onChange={(event) =>
              patch({ overdueTaskAlert: event.target.checked })}
          />
          <span>
            <strong>Overdue assigned tasks</strong>
            <small>Only tasks assigned to you are checked.</small>
          </span>
        </label>
      </article>

      {canManage && <article className="space-automation-card">
        <span className="eyebrow">Space health</span>

        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.budgetThresholdAlert}
            onChange={(event) =>
              patch({ budgetThresholdAlert: event.target.checked })}
          />
          <span>
            <strong>Budget threshold</strong>
            <small>Alert when an active budget reaches this usage level.</small>
          </span>
        </label>

        {preference.budgetThresholdAlert && <label>
          Budget used
          <div className="space-automation-inline-input">
            <input
              type="number"
              min="50"
              max="100"
              step="1"
              disabled={!preference.enabled}
              value={preference.budgetThresholdPercent}
              onChange={(event) =>
                patch({
                  budgetThresholdPercent:
                    Math.min(
                      100,
                      Math.max(50, Math.round(Number(event.target.value) || 80)),
                    ),
                })}
            />
            <span>%</span>
          </div>
        </label>}

        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.lowFundAlert}
            onChange={(event) =>
              patch({ lowFundAlert: event.target.checked })}
          />
          <span>
            <strong>Low Trip / Household Fund</strong>
            <small>Alert when available fund money falls to your threshold.</small>
          </span>
        </label>

        {preference.lowFundAlert && <label>
          Available fund at or below
          <div className="space-automation-inline-input">
            <span>{space.currency}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!preference.enabled}
              value={majorValue(preference.lowFundThresholdMinor)}
              onChange={(event) =>
                patch({
                  lowFundThresholdMinor: minorValue(event.target.value),
                })}
            />
          </div>
        </label>}
      </article>}

      {canManage && isSme && <article className="space-automation-card">
        <span className="eyebrow">Business operations</span>

        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.lowStockAlert}
            onChange={(event) =>
              patch({ lowStockAlert: event.target.checked })}
          />
          <span>
            <strong>Low stock</strong>
            <small>
              Uses each product's low-stock level, or your higher threshold below.
            </small>
          </span>
        </label>

        {preference.lowStockAlert && <label>
          Minimum fallback quantity
          <input
            type="number"
            min="0"
            step="1"
            disabled={!preference.enabled}
            value={preference.lowStockThreshold}
            onChange={(event) =>
              patch({
                lowStockThreshold:
                  Math.max(0, Math.round(Number(event.target.value) || 0)),
              })}
          />
        </label>}

        <label className="space-automation-toggle">
          <input
            type="checkbox"
            disabled={!preference.enabled}
            checked={preference.sellerPayoutAlert}
            onChange={(event) =>
              patch({ sellerPayoutAlert: event.target.checked })}
          />
          <span>
            <strong>Seller payout due</strong>
            <small>
              Alert only. BajetBN will never pay a seller automatically.
            </small>
          </span>
        </label>

        {preference.sellerPayoutAlert && <label>
          Seller balance at or above
          <div className="space-automation-inline-input">
            <span>{space.currency}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!preference.enabled}
              value={majorValue(preference.sellerPayoutThresholdMinor)}
              onChange={(event) =>
                patch({
                  sellerPayoutThresholdMinor: minorValue(event.target.value),
                })}
            />
          </div>
        </label>}
      </article>}
    </div>

    {error && <div className="notice error">{error}</div>}
    {notice && <div className="notice success">{notice}</div>}

    <div className="space-automation-footer">
      <div>
        <strong>No silent money actions</strong>
        <small>
          These rules create reminders only. Payments, expenses, contributions,
          transfers and payouts still require a person to act.
        </small>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          disabled={checking || busy}
          onClick={() => void checkNow()}
        >
          {checking ? 'Checking...' : 'Check saved rules now'}
        </button>

        <button
          type="button"
          className="button primary"
          disabled={busy || checking}
          onClick={() => void save()}
        >
          {busy ? 'Saving...' : 'Save reminder rules'}
        </button>
      </div>
    </div>
  </section>;
}
