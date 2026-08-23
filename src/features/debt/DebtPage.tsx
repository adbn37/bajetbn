import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  archiveDebt,
  createDebt,
  listDebts,
} from '../../repositories/debtRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  DebtDirection,
  DebtInterestType,
  DebtRecord,
  DebtSchedule,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function moneyToMinor(value: string) {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) return 0;

  return Math.round(parsed * 100);
}

export function DebtPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [direction, setDirection] = useState<DebtDirection>('owe');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const [nextDebts, nextSpaces] = await Promise.all([
        listDebts(user.uid),
        listSpaces(user.uid),
      ]);

      setDebts(nextDebts);
      setSpaces(nextSpaces.filter((space) => !space.archivedAt));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const active = useMemo(
    () =>
      debts.filter(
        (item) =>
          item.direction === direction
          && item.status !== 'archived',
      ),
    [debts, direction],
  );

  const totalOwe = debts
    .filter((item) => item.direction === 'owe' && item.status === 'active')
    .reduce((sum, item) => sum + item.balanceMinor, 0);

  const totalOwed = debts
    .filter((item) => item.direction === 'owed' && item.status === 'active')
    .reduce((sum, item) => sum + item.balanceMinor, 0);

  async function runArchive(item: DebtRecord) {
    setBusyId(item.id);
    setError('');

    try {
      await archiveDebt(item.id);
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  return (
    <main className="page debt-page">
      <PageHeader
        eyebrow="Money you owe or are owed"
        title="Debt"
        description="Track what you owe, what others owe you, due dates and repayments."
        action={
          <button
            type="button"
            className="button primary"
            onClick={() => setShowAdd(true)}
          >
            + Add debt
          </button>
        }
      />

      {error && <div className="notice error">{error}</div>}

      <section className="summary-grid debt-summary-grid">
        <article className="summary-card">
          <span>I owe</span>
          <strong>{formatMoney(totalOwe, 'BND')}</strong>
          <small>Still outstanding</small>
        </article>

        <article className="summary-card">
          <span>Owed to me</span>
          <strong>{formatMoney(totalOwed, 'BND')}</strong>
          <small>Still to collect</small>
        </article>

        <article className="summary-card featured">
          <span>Net position</span>
          <strong>{formatMoney(totalOwed - totalOwe, 'BND')}</strong>
          <small>Owed to you minus what you owe</small>
        </article>
      </section>

      <div className="debt-tabs">
        <button
          type="button"
          className={direction === 'owe' ? 'active' : ''}
          onClick={() => setDirection('owe')}
        >
          I Owe
        </button>

        <button
          type="button"
          className={direction === 'owed' ? 'active' : ''}
          onClick={() => setDirection('owed')}
        >
          Owed to Me
        </button>
      </div>

      {loading ? (
        <div className="loading-panel">Loading debt records…</div>
      ) : active.length === 0 ? (
        <EmptyState
          title={direction === 'owe' ? 'Nothing you owe' : 'Nothing owed to you'}
          description={
            direction === 'owe'
              ? 'Add a loan, borrowed amount or other money you need to repay.'
              : 'Add money someone needs to repay to you.'
          }
        />
      ) : (
        <section className="debt-list">
          {active.map((item) => {
            const overdue =
              item.status === 'active'
              && Boolean(item.dueDate)
              && item.dueDate! < todayIso();

            return (
              <article key={item.id} className="panel debt-card">
                <div className="debt-card-main">
                  <div>
                    <span className="eyebrow">
                      {item.direction === 'owe' ? 'I owe' : 'Owed to me'}
                    </span>

                    <h2>{item.counterparty}</h2>

                    {item.description && <p>{item.description}</p>}

                    <div className="meta-row">
                      <span>
                        {item.dueDate
                          ? `${overdue ? 'Overdue' : 'Due'} ${item.dueDate}`
                          : 'No due date'}
                      </span>

                      <span>
                        {item.interestType === 'none'
                          ? 'No interest'
                          : `${formatMoney(item.interestMinor, item.currency)} interest`}
                      </span>

                      <span>
                        {item.schedule === 'none'
                          ? 'No schedule'
                          : item.schedule}
                      </span>
                    </div>
                  </div>

                  <div className="debt-balance">
                    <small>Outstanding</small>
                    <strong>
                      {formatMoney(item.balanceMinor, item.currency)}
                    </strong>

                    <span>
                      of {formatMoney(item.totalMinor, item.currency)}
                    </span>
                  </div>
                </div>

                <div className="debt-progress">
                  <span
                    style={{
                      width: `${
                        item.totalMinor > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (item.paidMinor / item.totalMinor) * 100,
                              ),
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <footer className="debt-card-footer">
                  <small>{item.displayId}</small>

                  <button
                    type="button"
                    className="button secondary"
                    disabled={busyId === item.id}
                    onClick={() => void runArchive(item)}
                  >
                    {busyId === item.id ? 'Working…' : 'Archive'}
                  </button>
                </footer>
              </article>
            );
          })}
        </section>
      )}

      {showAdd && (
        <DebtForm
          spaces={spaces}
          initialDirection={direction}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await load();
          }}
        />
      )}
    </main>
  );
}

function DebtForm({
  spaces,
  initialDirection,
  onClose,
  onSaved,
}: {
  spaces: Space[];
  initialDirection: DebtDirection;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [direction, setDirection] =
    useState<DebtDirection>(initialDirection);

  const [counterparty, setCounterparty] = useState('');
  const [description, setDescription] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestType, setInterestType] =
    useState<DebtInterestType>('none');

  const [interestRate, setInterestRate] = useState('');
  const [fixedInterest, setFixedInterest] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [schedule, setSchedule] =
    useState<DebtSchedule>('none');

  const [scheduleNote, setScheduleNote] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const principalMinor = moneyToMinor(principal);

      if (principalMinor <= 0) {
        throw new Error('Enter an amount greater than zero.');
      }

      await createDebt({
        direction,
        counterparty: counterparty.trim(),
        description: description.trim() || undefined,
        principalMinor,
        interestType,
        interestRateBps:
          interestType === 'percentage'
            ? Math.round(Number(interestRate || 0) * 100)
            : 0,
        interestMinor:
          interestType === 'fixed'
            ? moneyToMinor(fixedInterest)
            : 0,
        startDate,
        dueDate: dueDate || undefined,
        schedule,
        scheduleNote: scheduleNote.trim() || undefined,
        reminderEnabled,
        spaceId: spaceId || undefined,
      });

      await onSaved();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add debt" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}

        <label>
          Type
          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as DebtDirection)
            }
          >
            <option value="owe">I Owe</option>
            <option value="owed">Owed to Me</option>
          </select>
        </label>

        <label>
          Person / lender / borrower
          <input
            required
            value={counterparty}
            onChange={(event) => setCounterparty(event.target.value)}
            placeholder="e.g. Ali, Bank, Family"
          />
        </label>

        <label>
          Amount
          <input
            required
            inputMode="decimal"
            value={principal}
            onChange={(event) => setPrincipal(event.target.value)}
            placeholder="0.00"
          />
        </label>

        <label>
          Interest
          <select
            value={interestType}
            onChange={(event) =>
              setInterestType(
                event.target.value as DebtInterestType,
              )
            }
          >
            <option value="none">No interest</option>
            <option value="fixed">Fixed amount</option>
            <option value="percentage">Percentage</option>
          </select>
        </label>

        {interestType === 'fixed' && (
          <label>
            Interest amount
            <input
              inputMode="decimal"
              value={fixedInterest}
              onChange={(event) => setFixedInterest(event.target.value)}
              placeholder="0.00"
            />
          </label>
        )}

        {interestType === 'percentage' && (
          <label>
            Interest rate %
            <input
              inputMode="decimal"
              value={interestRate}
              onChange={(event) => setInterestRate(event.target.value)}
              placeholder="e.g. 5"
            />
          </label>
        )}

        <label>
          Start date
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label>
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <label>
          Repayment schedule
          <select
            value={schedule}
            onChange={(event) =>
              setSchedule(event.target.value as DebtSchedule)
            }
          >
            <option value="none">No schedule</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        {schedule === 'custom' && (
          <label>
            Schedule note
            <input
              value={scheduleNote}
              onChange={(event) => setScheduleNote(event.target.value)}
              placeholder="e.g. $100 every payday"
            />
          </label>
        )}

        <label>
          Space
          <select
            value={spaceId}
            onChange={(event) => setSpaceId(event.target.value)}
          >
            <option value="">No Space</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Notes
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details"
          />
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(event) =>
              setReminderEnabled(event.target.checked)
            }
          />

          <span>
            <strong>Debt reminders</strong>
            <small>
              Use this due date for BajetBN reminders.
            </small>
          </span>
        </label>

        <div className="button-row">
          <button
            type="submit"
            className="button primary"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Add debt'}
          </button>

          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
