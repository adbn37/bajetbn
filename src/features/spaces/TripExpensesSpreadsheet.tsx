import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createSharedExpense,
  getSpaceFund,
  listSharedExpenses,
  listSharedExpenseShares,
} from '../../repositories/sharedExpenseRepository';
import type {
  SharedExpense,
  SharedExpenseShare,
  SharedExpenseSplitMode,
  Space,
  SpaceFund,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import {
  formatMoney,
  toMinorUnits,
} from '../../utils/money';

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function memberLabel(
  member?: SpaceMember | null,
) {
  return (
    member?.displayName
    || member?.email
    || 'Member'
  );
}

function splitLabel(
  mode: SharedExpenseSplitMode,
) {
  if (mode === 'custom') {
    return 'Custom';
  }

  if (mode === 'percentage') {
    return 'Percentage';
  }

  return 'Equal';
}

function sharePreview(
  totalMinor: number,
  people: number,
  mode: SharedExpenseSplitMode,
  currency: string,
) {
  if (mode !== 'equal') {
    return splitLabel(mode);
  }

  if (people <= 0) {
    return formatMoney(
      0,
      currency,
    );
  }

  return formatMoney(
    Math.floor(
      totalMinor / people,
    ),
    currency,
  );
}

function PeoplePicker({
  members,
  selected,
  setSelected,
  splitMode,
  amounts,
  setAmounts,
  percentages,
  setPercentages,
  disabled,
}: {
  members: SpaceMember[];
  selected: Record<string, boolean>;
  setSelected: React.Dispatch<
    React.SetStateAction<
      Record<string, boolean>
    >
  >;
  splitMode: SharedExpenseSplitMode;
  amounts: Record<string, string>;
  setAmounts: React.Dispatch<
    React.SetStateAction<
      Record<string, string>
    >
  >;
  percentages: Record<string, string>;
  setPercentages: React.Dispatch<
    React.SetStateAction<
      Record<string, string>
    >
  >;
  disabled: boolean;
}) {
  const selectedCount =
    members.filter(
      (member) =>
        selected[member.uid],
    ).length;

  const selectEveryone = () => {
    setSelected(
      Object.fromEntries(
        members.map(
          (member) => [
            member.uid,
            true,
          ],
        ),
      ),
    );
  };

  const clearEveryone = () => {
    setSelected(
      Object.fromEntries(
        members.map(
          (member) => [
            member.uid,
            false,
          ],
        ),
      ),
    );
  };

  return (
    <details className="trip-expense-people-picker">
      <summary>
        {selectedCount}{' '}
        {selectedCount === 1
          ? 'person'
          : 'people'}
      </summary>

      <div className="trip-expense-people-popover">
        <div className="trip-expense-people-actions">
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={selectEveryone}
          >
            Everyone
          </button>

          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={clearEveryone}
          >
            Clear
          </button>
        </div>

        {members.map(
          (member) => (
            <div
              className="trip-expense-person-row"
              key={member.uid}
            >
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(
                    selected[
                      member.uid
                    ],
                  )}
                  disabled={disabled}
                  onChange={(event) =>
                    setSelected(
                      (current) => ({
                        ...current,
                        [member.uid]:
                          event.target.checked,
                      }),
                    )
                  }
                />

                <span>
                  {memberLabel(
                    member,
                  )}
                </span>
              </label>

              {selected[member.uid]
                && splitMode === 'custom'
                && (
                  <input
                    className="trip-sheet-cell-input"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={
                      amounts[
                        member.uid
                      ] || ''
                    }
                    disabled={disabled}
                    aria-label={
                      `${memberLabel(member)} amount`
                    }
                    onChange={(event) =>
                      setAmounts(
                        (current) => ({
                          ...current,
                          [member.uid]:
                            event.target.value,
                        }),
                      )
                    }
                  />
                )}

              {selected[member.uid]
                && splitMode === 'percentage'
                && (
                  <input
                    className="trip-sheet-cell-input"
                    inputMode="decimal"
                    placeholder="%"
                    value={
                      percentages[
                        member.uid
                      ] || ''
                    }
                    disabled={disabled}
                    aria-label={
                      `${memberLabel(member)} percentage`
                    }
                    onChange={(event) =>
                      setPercentages(
                        (current) => ({
                          ...current,
                          [member.uid]:
                            event.target.value,
                        }),
                      )
                    }
                  />
                )}
            </div>
          ),
        )}
      </div>
    </details>
  );
}

export function TripExpensesSpreadsheet({
  space,
  members,
  currentMember,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
}) {
  const [expenses, setExpenses] =
    useState<SharedExpense[]>([]);

  const [shares, setShares] =
    useState<SharedExpenseShare[]>([]);

  const [fund, setFund] =
    useState<SpaceFund | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const activeMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            (member.status || 'active')
            === 'active',
        ),
      [members],
    );

  const memberMap =
    useMemo(
      () =>
        new Map(
          activeMembers.map(
            (member) => [
              member.uid,
              member,
            ],
          ),
        ),
      [activeMembers],
    );

  const sharesByExpense =
    useMemo(() => {
      const next =
        new Map<
          string,
          SharedExpenseShare[]
        >();

      shares.forEach(
        (share) => {
          next.set(
            share.expenseId,
            [
              ...(
                next.get(
                  share.expenseId,
                ) || []
              ),
              share,
            ],
          );
        },
      );

      return next;
    }, [shares]);

  const canCreate =
    Boolean(
      currentMember
      && [
        'owner',
        'admin',
        'contributor',
      ].includes(
        currentMember.role,
      ),
    );

  const [title, setTitle] =
    useState('');

  const [total, setTotal] =
    useState('');

  const [
    expenseDate,
    setExpenseDate,
  ] = useState(today());

  const [
    paidByUid,
    setPaidByUid,
  ] = useState(
    currentMember?.uid
    || activeMembers[0]?.uid
    || '',
  );

  const [
    splitMode,
    setSplitMode,
  ] =
    useState<SharedExpenseSplitMode>(
      'equal',
    );

  const [selected, setSelected] =
    useState<Record<string, boolean>>(
      () =>
        Object.fromEntries(
          activeMembers.map(
            (member) => [
              member.uid,
              true,
            ],
          ),
        ),
    );

  const [amounts, setAmounts] =
    useState<
      Record<string, string>
    >({});

  const [
    percentages,
    setPercentages,
  ] = useState<
    Record<string, string>
  >({});

  const [
    paidFromTripMoney,
    setPaidFromTripMoney,
  ] = useState(false);

  const load =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const [
          nextExpenses,
          nextShares,
          nextFund,
        ] = await Promise.all([
          listSharedExpenses(
            space.id,
          ),
          listSharedExpenseShares(
            space.id,
          ),
          getSpaceFund(
            space.id,
          ),
        ]);

        setExpenses(
          nextExpenses,
        );
        setShares(
          nextShares,
        );
        setFund(
          nextFund,
        );
      } catch (nextError) {
        setError(
          getErrorMessage(
            nextError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [space.id]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void load();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    setSelected(
      (current) => {
        const next:
          Record<string, boolean> =
            {};

        activeMembers.forEach(
          (member) => {
            next[member.uid] =
              current[
                member.uid
              ] ?? true;
          },
        );

        return next;
      },
    );
  }, [activeMembers]);

  const selectedMembers =
    activeMembers.filter(
      (member) =>
        selected[
          member.uid
        ],
    );

  const previewTotalMinor =
    (() => {
      try {
        return toMinorUnits(
          total || '0',
        );
      } catch {
        return 0;
      }
    })();

  async function addExpense() {
    if (!canCreate) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (!title.trim()) {
        throw new Error(
          'Enter an expense description.',
        );
      }

      if (
        previewTotalMinor <= 0
      ) {
        throw new Error(
          'Enter an expense amount greater than zero.',
        );
      }

      if (
        !selectedMembers.length
      ) {
        throw new Error(
          'Choose at least one person.',
        );
      }

      let payerUid =
        paidByUid;

      if (
        paidFromTripMoney
      ) {
        if (!fund) {
          throw new Error(
            'Set up Trip money before using it.',
          );
        }

        payerUid =
          fund.holderUid;

        if (!payerUid) {
          throw new Error(
            'Choose the Trip money holder first.',
          );
        }
      }

      const splits =
        selectedMembers.map(
          (member) =>
            splitMode === 'custom'
              ? {
                  memberUid:
                    member.uid,
                  amountMinor:
                    toMinorUnits(
                      amounts[
                        member.uid
                      ] || '0',
                    ),
                }
              : splitMode
                === 'percentage'
                ? {
                    memberUid:
                      member.uid,
                    percentageBasisPoints:
                      Math.round(
                        Number(
                          percentages[
                            member.uid
                          ] || 0,
                        )
                        * 100,
                      ),
                  }
                : {
                    memberUid:
                      member.uid,
                  },
        );

      await createSharedExpense({
        spaceId:
          space.id,
        title:
          title.trim(),
        totalMinor:
          previewTotalMinor,
        expenseDate,
        paidByUid:
          payerUid,
        splitMode,
        splits,
        paidFromGroupFund:
          paidFromTripMoney,
      });

      setTitle('');
      setTotal('');
      setSplitMode('equal');
      setAmounts({});
      setPercentages({});
      setPaidFromTripMoney(
        false,
      );
      setExpenseDate(
        today(),
      );

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const totalExpenseMinor =
    expenses.reduce(
      (sum, expense) =>
        sum
        + expense.totalMinor,
      0,
    );

  const totalLeftMinor =
    expenses.reduce(
      (sum, expense) =>
        sum
        + expense.amountLeftMinor,
      0,
    );

  const totalSettledMinor =
    expenses.reduce(
      (sum, expense) =>
        sum
        + expense.totalSettledMinor,
      0,
    );

  return (
    <section
      className="panel trip-expenses-sheet-v115"
      data-trip-expenses-spreadsheet
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            Trip worksheet
          </span>

          <h2>Trip Expenses</h2>

          <p className="muted">
            Record shared Trip spending in rows.
            Use Settle Up for member repayments.
          </p>
        </div>

        <div className="trip-sheet-summary">
          <span>
            Total{' '}
            {formatMoney(
              totalExpenseMinor,
              space.currency,
            )}
          </span>

          <span>
            Settled{' '}
            {formatMoney(
              totalSettledMinor,
              space.currency,
            )}
          </span>

          <span>
            Left{' '}
            {formatMoney(
              totalLeftMinor,
              space.currency,
            )}
          </span>
        </div>
      </div>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="info-banner">
        <strong>
          Spreadsheet first.
        </strong>

        <span>
          Add an expense, choose who shares it,
          and BajetBN keeps the member balances automatically.
        </span>
      </div>

      {loading ? (
        <div className="loading-panel">
          Loading Trip Expenses...
        </div>
      ) : (
        <div className="trip-sheet-scroll">
          <table
            className="trip-sheet-table trip-expenses-sheet-table"
            aria-label="Trip Expenses worksheet"
          >
            <thead>
              <tr>
                <th>Description</th>
                <th>Split</th>
                <th>People</th>
                <th>Per Person</th>
                <th>Amount</th>
                <th>Paid By</th>
                <th>Paid From</th>
                <th>Date</th>
                <th>Settled</th>
                <th>Left</th>
              </tr>
            </thead>

            <tbody>
              {canCreate && (
                <tr className="trip-sheet-new-row">
                  <td className="trip-expense-description-cell">
                    <input
                      className="trip-sheet-cell-input"
                      value={title}
                      maxLength={100}
                      placeholder="Add expense..."
                      aria-label="Trip expense description"
                      disabled={busy}
                      onChange={(event) =>
                        setTitle(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter'
                          && !busy
                        ) {
                          event.preventDefault();
                          void addExpense();
                        }
                      }}
                    />
                  </td>

                  <td>
                    <select
                      className="trip-sheet-cell-input"
                      value={splitMode}
                      disabled={busy}
                      aria-label="Trip expense split"
                      onChange={(event) =>
                        setSplitMode(
                          (event.target.value as SharedExpenseSplitMode),
                        )
                      }
                    >
                      <option value="equal">
                        Equal
                      </option>

                      <option value="custom">
                        Custom
                      </option>

                      <option value="percentage">
                        Percentage
                      </option>
                    </select>
                  </td>

                  <td>
                    <PeoplePicker
                      members={activeMembers}
                      selected={selected}
                      setSelected={setSelected}
                      splitMode={splitMode}
                      amounts={amounts}
                      setAmounts={setAmounts}
                      percentages={percentages}
                      setPercentages={setPercentages}
                      disabled={busy}
                    />
                  </td>

                  <td className="trip-budget-number-cell">
                    {sharePreview(
                      previewTotalMinor,
                      selectedMembers.length,
                      splitMode,
                      space.currency,
                    )}
                  </td>

                  <td>
                    <div className="trip-sheet-money-cell">
                      <span>
                        {space.currency}
                      </span>

                      <input
                        className="trip-sheet-cell-input"
                        value={total}
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label="Trip expense amount"
                        disabled={busy}
                        onChange={(event) =>
                          setTotal(
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </td>

                  <td>
                    <select
                      className="trip-sheet-cell-input"
                      value={
                        paidFromTripMoney
                          ? fund?.holderUid || ''
                          : paidByUid
                      }
                      disabled={
                        busy
                        || paidFromTripMoney
                      }
                      aria-label="Trip expense paid by"
                      onChange={(event) =>
                        setPaidByUid(
                          event.target.value,
                        )
                      }
                    >
                      {activeMembers.map(
                        (member) => (
                          <option
                            key={member.uid}
                            value={member.uid}
                          >
                            {memberLabel(
                              member,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </td>

                  <td>
                    <select
                      className="trip-sheet-cell-input"
                      value={
                        paidFromTripMoney
                          ? 'trip-money'
                          : 'member'
                      }
                      disabled={busy}
                      aria-label="Trip expense paid from"
                      onChange={(event) => {
                        const fromTripMoney =
                          event.target.value
                          === 'trip-money';

                        setPaidFromTripMoney(
                          fromTripMoney,
                        );

                        if (
                          fromTripMoney
                          && fund?.holderUid
                        ) {
                          setPaidByUid(
                            fund.holderUid,
                          );
                        }
                      }}
                    >
                      <option value="member">
                        Member
                      </option>

                      <option
                        value="trip-money"
                        disabled={!fund}
                      >
                        Trip money
                      </option>
                    </select>
                  </td>

                  <td>
                    <input
                      className="trip-sheet-cell-input"
                      type="date"
                      value={expenseDate}
                      disabled={busy}
                      aria-label="Trip expense date"
                      onChange={(event) =>
                        setExpenseDate(
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  <td className="trip-budget-number-cell">
                    {formatMoney(
                      paidFromTripMoney
                        ? previewTotalMinor
                        : 0,
                      space.currency,
                    )}
                  </td>

                  <td className="trip-sheet-actions-cell">
                    <button
                      type="button"
                      className="button primary compact"
                      disabled={
                        busy
                        || !title.trim()
                        || previewTotalMinor <= 0
                        || selectedMembers.length === 0
                        || !expenseDate
                        || !(
                          paidFromTripMoney
                            ? fund?.holderUid
                            : paidByUid
                        )
                      }
                      onClick={() =>
                        void addExpense()
                      }
                    >
                      {busy
                        ? 'Saving...'
                        : 'Add'}
                    </button>
                  </td>
                </tr>
              )}

              {expenses.map(
                (expense) => {
                  const expenseShares =
                    sharesByExpense.get(
                      expense.id,
                    ) || [];

                  const payer =
                    memberMap.get(
                      expense.paidByUid,
                    );

                  const equalPerPerson =
                    expense.splitMode
                      === 'equal'
                      && expenseShares.length
                      > 0
                      ? Math.floor(
                          expense.totalMinor
                          / expenseShares.length,
                        )
                      : 0;

                  return (
                    <tr
                      key={expense.id}
                      className={
                        `trip-expense-status-${expense.status}`
                      }
                    >
                      <td className="trip-expense-description-cell">
                        <strong>
                          {expense.title}
                        </strong>

                        {expense.note && (
                          <small>
                            {expense.note}
                          </small>
                        )}
                      </td>

                      <td>
                        {splitLabel(
                          expense.splitMode,
                        )}
                      </td>

                      <td>
                        <details className="trip-expense-people-picker read-only">
                          <summary>
                            {expenseShares.length}{' '}
                            {expenseShares.length === 1
                              ? 'person'
                              : 'people'}
                          </summary>

                          <div className="trip-expense-people-popover">
                            {expenseShares.map(
                              (share) => (
                                <div
                                  className="trip-expense-share-read-row"
                                  key={share.id}
                                >
                                  <span>
                                    {share.memberName
                                      || share.memberEmail
                                      || 'Member'}
                                  </span>

                                  <strong>
                                    {formatMoney(
                                      share.shareMinor,
                                      share.currency,
                                    )}
                                  </strong>
                                </div>
                              ),
                            )}
                          </div>
                        </details>
                      </td>

                      <td className="trip-budget-number-cell">
                        {expense.splitMode
                          === 'equal'
                          ? formatMoney(
                              equalPerPerson,
                              expense.currency,
                            )
                          : splitLabel(
                              expense.splitMode,
                            )}
                      </td>

                      <td className="trip-budget-number-cell">
                        {formatMoney(
                          expense.totalMinor,
                          expense.currency,
                        )}
                      </td>

                      <td>
                        {expense.paidByName
                          || memberLabel(
                            payer,
                          )}
                      </td>

                      <td>
                        {expense.paidFromTripMoney
                          || expense.paidFromGroupFund
                          ? 'Trip money'
                          : 'Member'}
                      </td>

                      <td>
                        {expense.expenseDate}
                      </td>

                      <td className="trip-budget-number-cell">
                        {formatMoney(
                          expense.totalSettledMinor,
                          expense.currency,
                        )}
                      </td>

                      <td
                        className={
                          `trip-budget-number-cell${
                            expense.amountLeftMinor
                            > 0
                              ? ' trip-expense-open'
                              : ''
                          }`
                        }
                      >
                        {formatMoney(
                          expense.amountLeftMinor,
                          expense.currency,
                        )}
                      </td>
                    </tr>
                  );
                },
              )}

              {!expenses.length
                && !canCreate
                && (
                  <tr>
                    <td
                      colSpan={10}
                      className="trip-sheet-empty-cell"
                    >
                      No Trip Expenses yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted trip-expenses-sheet-footnote">
        Saved expense rows are read-only because settlement history is auditable.
        Use Settle Up for repayments and payment proofs.
      </p>
    </section>
  );
}
