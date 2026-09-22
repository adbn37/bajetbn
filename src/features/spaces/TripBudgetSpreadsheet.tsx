import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../categories/defaultCategories';
import { listCustomCategories } from '../../repositories/categoryRepository';
import {
  archiveBudget,
  createBudget,
  listBudgetsForSpace,
  updateBudget,
} from '../../repositories/budgetRepository';
import type {
  Budget,
  BudgetPeriodType,
  Space,
  SpaceMember,
  TransactionCategory,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import {
  formatMoney,
  toMinorUnits,
} from '../../utils/money';

type BudgetDraft = {
  name: string;
  categoryId: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  limit: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthRange(date = today()) {
  const [year, month] =
    date.split('-').map(Number);

  return {
    start:
      `${year}-${String(month).padStart(2, '0')}-01`,
    end:
      new Date(
        Date.UTC(year, month, 0),
      ).toISOString().slice(0, 10),
  };
}

function draftFromBudget(
  budget: Budget,
): BudgetDraft {
  return {
    name: budget.name,
    categoryId:
      budget.categoryId || '',
    periodType:
      budget.periodType,
    startDate:
      budget.startDate,
    endDate:
      budget.endDate,
    limit:
      String(
        budget.limitMinor / 100,
      ),
  };
}

function memberCountLabel(
  count: number,
) {
  if (count === 0) {
    return 'No members';
  }

  return `All ${count}`;
}

function perPersonMinor(
  limitMinor: number,
  count: number,
) {
  if (count <= 0) {
    return 0;
  }

  return Math.round(
    limitMinor / count,
  );
}

function scopedCategories(
  categories: TransactionCategory[],
) {
  return categories.filter(
    (item) =>
      item.kind === 'expense'
      && (
        item.scope === 'both'
        || item.scope === 'personal'
      ),
  );
}

function TripBudgetRow({
  budget,
  categories,
  memberCount,
  canEdit,
  busy,
  onSave,
  onArchive,
}: {
  budget: Budget;
  categories: TransactionCategory[];
  memberCount: number;
  canEdit: boolean;
  busy: boolean;
  onSave: (
    draft: BudgetDraft,
  ) => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const [draft, setDraft] =
    useState<BudgetDraft>(
      () => draftFromBudget(budget),
    );

  const changed =
    JSON.stringify(draft)
    !== JSON.stringify(
      draftFromBudget(budget),
    );

  const limitMinor =
    (() => {
      try {
        return toMinorUnits(
          draft.limit || '0',
        );
      } catch {
        return 0;
      }
    })();

  const leftMinor =
    budget.limitMinor
    - budget.spentMinor;

  return (
    <tr>
      <td className="trip-budget-pot-cell">
        <input
          className="trip-sheet-cell-input"
          value={draft.name}
          maxLength={80}
          disabled={!canEdit || busy}
          aria-label="Trip pot"
          onChange={(event) =>
            setDraft(
              (current) => ({
                ...current,
                name:
                  event.target.value,
              }),
            )
          }
        />
      </td>

      <td>
        <select
          className="trip-sheet-cell-input"
          value={draft.categoryId}
          disabled={!canEdit || busy}
          aria-label="Trip pot category"
          onChange={(event) =>
            setDraft(
              (current) => ({
                ...current,
                categoryId:
                  event.target.value,
              }),
            )
          }
        >
          <option value="">
            All spending
          </option>

          {categories.map(
            (category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ),
          )}
        </select>
      </td>

      <td>
        <div className="trip-sheet-money-cell">
          <span>{budget.currency}</span>

          <input
            className="trip-sheet-cell-input"
            value={draft.limit}
            inputMode="decimal"
            disabled={!canEdit || busy}
            aria-label="Trip pot budget"
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,
                  limit:
                    event.target.value,
                }),
              )
            }
          />
        </div>
      </td>

      <td className="trip-budget-read-cell">
        <strong>
          {memberCountLabel(
            memberCount,
          )}
        </strong>
        <small>
          Active Trip members
        </small>
      </td>

      <td className="trip-budget-number-cell">
        {formatMoney(
          perPersonMinor(
            limitMinor,
            memberCount,
          ),
          budget.currency,
        )}
      </td>

      <td className="trip-budget-number-cell">
        {formatMoney(
          budget.spentMinor,
          budget.currency,
        )}
      </td>

      <td
        className={
          `trip-budget-number-cell${
            leftMinor < 0
              ? ' is-over'
              : ''
          }`
        }
      >
        {formatMoney(
          leftMinor,
          budget.currency,
        )}
      </td>

      <td>
        <div className="trip-budget-date-pair">
          <input
            className="trip-sheet-cell-input"
            type="date"
            value={draft.startDate}
            disabled={!canEdit || busy}
            aria-label="Trip pot start date"
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,
                  startDate:
                    event.target.value,
                }),
              )
            }
          />

          <span>→</span>

          <input
            className="trip-sheet-cell-input"
            type="date"
            value={draft.endDate}
            disabled={!canEdit || busy}
            aria-label="Trip pot end date"
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,
                  endDate:
                    event.target.value,
                }),
              )
            }
          />
        </div>
      </td>

      <td className="trip-sheet-actions-cell">
        {canEdit ? (
          <div className="trip-sheet-row-actions">
            <button
              type="button"
              className="button primary compact"
              disabled={
                busy
                || !changed
                || !draft.name.trim()
                || limitMinor <= 0
                || !draft.startDate
                || !draft.endDate
              }
              onClick={() =>
                void onSave(draft)
              }
            >
              Save
            </button>

            <button
              type="button"
              className="button secondary compact"
              disabled={busy}
              onClick={() =>
                void onArchive()
              }
            >
              Archive
            </button>
          </div>
        ) : (
          <small className="muted">
            Created by another member
          </small>
        )}
      </td>
    </tr>
  );
}

export function TripBudgetSpreadsheet({
  space,
  members,
  currentMember,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember?: SpaceMember | null;
}) {
  const { user } = useAuth();

  const [budgets, setBudgets] =
    useState<Budget[]>([]);

  const [categories, setCategories] =
    useState<TransactionCategory[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState('');

  const [error, setError] =
    useState('');

  const range = useMemo(
    () => monthRange(),
    [],
  );

  const [newDraft, setNewDraft] =
    useState<BudgetDraft>(() => ({
      name: '',
      categoryId: '',
      periodType: 'custom',
      startDate: range.start,
      endDate: range.end,
      limit: '',
    }));

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

  const expenseCategories =
    useMemo(
      () =>
        scopedCategories(
          categories,
        ),
      [categories],
    );

  const totalBudgetMinor =
    useMemo(
      () =>
        budgets.reduce(
          (sum, budget) =>
            sum
            + budget.limitMinor,
          0,
        ),
      [budgets],
    );

  const totalSpentMinor =
    useMemo(
      () =>
        budgets.reduce(
          (sum, budget) =>
            sum
            + budget.spentMinor,
          0,
        ),
      [budgets],
    );

  const load =
    useCallback(async () => {
      if (!user) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [
          nextBudgets,
          customCategories,
        ] = await Promise.all([
          listBudgetsForSpace(
            space.id,
          ),
          listCustomCategories(
            user.uid,
          ),
        ]);

        setBudgets(
          nextBudgets.filter(
            (budget) =>
              !budget.archivedAt,
          ),
        );

        setCategories([
          ...DEFAULT_TRANSACTION_CATEGORIES,
          ...customCategories,
        ]);
      } catch (nextError) {
        setError(
          getErrorMessage(
            nextError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [space.id, user]);

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

  async function runMutation(
    label: string,
    action: () => Promise<unknown>,
  ) {
    setBusy(label);
    setError('');

    try {
      await action();
      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
      throw nextError;
    } finally {
      setBusy('');
    }
  }

  async function saveNew() {
    const limitMinor =
      toMinorUnits(
        newDraft.limit,
      );

    if (
      !newDraft.name.trim()
      || limitMinor <= 0
    ) {
      throw new Error(
        'Enter a pot name and budget greater than zero.',
      );
    }

    if (
      !newDraft.startDate
      || !newDraft.endDate
      || newDraft.endDate
        < newDraft.startDate
    ) {
      throw new Error(
        'Enter a valid date range.',
      );
    }

    await runMutation(
      'new-budget',
      () =>
        createBudget({
          name:
            newDraft.name.trim(),
          spaceId:
            space.id,
          categoryId:
            newDraft.categoryId
            || undefined,
          periodType:
            newDraft.periodType,
          startDate:
            newDraft.startDate,
          endDate:
            newDraft.endDate,
          limitMinor,
        }),
    );

    setNewDraft({
      name: '',
      categoryId: '',
      periodType: 'custom',
      startDate: range.start,
      endDate: range.end,
      limit: '',
    });
  }

  async function saveExisting(
    budget: Budget,
    draft: BudgetDraft,
  ) {
    const limitMinor =
      toMinorUnits(
        draft.limit,
      );

    if (
      !draft.name.trim()
      || limitMinor <= 0
    ) {
      throw new Error(
        'Enter a pot name and budget greater than zero.',
      );
    }

    if (
      !draft.startDate
      || !draft.endDate
      || draft.endDate
        < draft.startDate
    ) {
      throw new Error(
        'Enter a valid date range.',
      );
    }

    await runMutation(
      `budget-${budget.id}`,
      () =>
        updateBudget({
          budgetId:
            budget.id,
          name:
            draft.name.trim(),
          categoryId:
            draft.categoryId
            || undefined,
          periodType:
            draft.periodType,
          startDate:
            draft.startDate,
          endDate:
            draft.endDate,
          limitMinor,
        }),
    );
  }

  const newLimitMinor =
    (() => {
      try {
        return toMinorUnits(
          newDraft.limit || '0',
        );
      } catch {
        return 0;
      }
    })();

  return (
    <section
      className="panel trip-budget-sheet-v115"
      data-trip-budget-spreadsheet
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            Trip worksheet
          </span>

          <h2>Trip Budget</h2>

          <p className="muted">
            Plan Trip pots in one spreadsheet.
            Spent currently follows posted Money Activity transactions
            linked to this Trip. Trip Expenses are not included yet.
          </p>
        </div>

        <div className="trip-sheet-summary">
          <span>
            Budget{' '}
            {formatMoney(
              totalBudgetMinor,
              space.currency,
            )}
          </span>

          <span>
            Spent{' '}
            {formatMoney(
              totalSpentMinor,
              space.currency,
            )}
          </span>

          <span>
            Left{' '}
            {formatMoney(
              totalBudgetMinor
              - totalSpentMinor,
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

      <div className="info-banner trip-budget-people-note">
        <strong>
          People = all active Trip members for now.
        </strong>

        <span>
          This keeps the calculation real with the current backend.
          Selecting different people per pot will be added separately
          without faking saved data.
        </span>
      </div>

      {loading ? (
        <div className="loading-panel">
          Loading Trip Budget…
        </div>
      ) : (
        <div className="trip-sheet-scroll">
          <table
            className="trip-sheet-table trip-budget-sheet-table"
            aria-label="Trip Budget worksheet"
          >
            <thead>
              <tr>
                <th>Pot</th>
                <th>Category</th>
                <th>Budget</th>
                <th>People</th>
                <th>Per Person</th>
                <th>Spent</th>
                <th>Left</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentMember && (
                <tr className="trip-sheet-new-row">
                  <td className="trip-budget-pot-cell">
                    <input
                      className="trip-sheet-cell-input"
                      value={newDraft.name}
                      maxLength={80}
                      placeholder="Add a pot…"
                      aria-label="New Trip pot"
                      onChange={(event) =>
                        setNewDraft(
                          (current) => ({
                            ...current,
                            name:
                              event.target.value,
                          }),
                        )
                      }
                    />
                  </td>

                  <td>
                    <select
                      className="trip-sheet-cell-input"
                      value={newDraft.categoryId}
                      aria-label="New Trip pot category"
                      onChange={(event) =>
                        setNewDraft(
                          (current) => ({
                            ...current,
                            categoryId:
                              event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="">
                        All spending
                      </option>

                      {expenseCategories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ),
                      )}
                    </select>
                  </td>

                  <td>
                    <div className="trip-sheet-money-cell">
                      <span>
                        {space.currency}
                      </span>

                      <input
                        className="trip-sheet-cell-input"
                        value={newDraft.limit}
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label="New Trip pot budget"
                        onChange={(event) =>
                          setNewDraft(
                            (current) => ({
                              ...current,
                              limit:
                                event.target.value,
                            }),
                          )
                        }
                      />
                    </div>
                  </td>

                  <td className="trip-budget-read-cell">
                    <strong>
                      {memberCountLabel(
                        activeMembers.length,
                      )}
                    </strong>

                    <small>
                      Active Trip members
                    </small>
                  </td>

                  <td className="trip-budget-number-cell">
                    {formatMoney(
                      perPersonMinor(
                        newLimitMinor,
                        activeMembers.length,
                      ),
                      space.currency,
                    )}
                  </td>

                  <td className="trip-budget-number-cell">
                    {formatMoney(
                      0,
                      space.currency,
                    )}
                  </td>

                  <td className="trip-budget-number-cell">
                    {formatMoney(
                      newLimitMinor,
                      space.currency,
                    )}
                  </td>

                  <td>
                    <div className="trip-budget-date-pair">
                      <input
                        className="trip-sheet-cell-input"
                        type="date"
                        value={newDraft.startDate}
                        aria-label="New Trip pot start date"
                        onChange={(event) =>
                          setNewDraft(
                            (current) => ({
                              ...current,
                              startDate:
                                event.target.value,
                            }),
                          )
                        }
                      />

                      <span>→</span>

                      <input
                        className="trip-sheet-cell-input"
                        type="date"
                        value={newDraft.endDate}
                        aria-label="New Trip pot end date"
                        onChange={(event) =>
                          setNewDraft(
                            (current) => ({
                              ...current,
                              endDate:
                                event.target.value,
                            }),
                          )
                        }
                      />
                    </div>
                  </td>

                  <td className="trip-sheet-actions-cell">
                    <button
                      type="button"
                      className="button primary compact"
                      disabled={
                        Boolean(busy)
                        || !newDraft.name.trim()
                        || newLimitMinor <= 0
                        || !newDraft.startDate
                        || !newDraft.endDate
                      }
                      onClick={() =>
                        void saveNew()
                      }
                    >
                      Add
                    </button>
                  </td>
                </tr>
              )}

              {budgets.map(
                (budget) => (
                  <TripBudgetRow
                    key={
                      budget.id
                      + ':'
                      + (
                        budget.updatedAt
                          ?.toMillis?.()
                        || 0
                      )
                    }
                    budget={budget}
                    categories={
                      expenseCategories
                    }
                    memberCount={
                      activeMembers.length
                    }
                    canEdit={
                      Boolean(
                        currentMember
                        && budget.ownerId
                          === currentMember.uid,
                      )
                    }
                    busy={Boolean(busy)}
                    onSave={(draft) =>
                      saveExisting(
                        budget,
                        draft,
                      )
                    }
                    onArchive={() =>
                      runMutation(
                        `archive-${budget.id}`,
                        () =>
                          archiveBudget(
                            budget.id,
                          ),
                      )
                    }
                  />
                ),
              )}

              {!budgets.length
                && !currentMember
                && (
                  <tr>
                    <td
                      colSpan={9}
                      className="trip-sheet-empty-cell"
                    >
                      No Trip Budget pots yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>

          <p className="muted trip-budget-spend-source-note">
            Spent currently uses posted Money Activity transactions
            for this Trip within the pot date/category range.
            Trip Expenses are not included yet.
          </p>
        </div>
      )}
    </section>
  );
}
