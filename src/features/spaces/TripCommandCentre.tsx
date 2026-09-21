import { useEffect, useState } from 'react';
import { getSpaceFund } from '../../repositories/sharedExpenseRepository';
import { TripPlanningPanel } from './TripPlanningPanel';
import type {
  Budget,
  SharedExpense,
  Space,
  SpaceFund,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type TripTab = 'trip_money' | 'expenses' | 'balances';

export function TripCommandCentre({
  space,
  budgets,
  members,
  sharedExpenses,
  currentMember,
  onOpenTab,
}: {
  space: Space;
  budgets: Budget[];
  members: SpaceMember[];
  sharedExpenses: SharedExpense[];
  currentMember?: SpaceMember | null;
  onOpenTab: (tab: TripTab) => void;
}) {
  const [fund, setFund] = useState<SpaceFund | null>(null);
  const [loadingFund, setLoadingFund] = useState(true);
  const [fundError, setFundError] = useState('');

  useEffect(() => {
    let mounted = true;

    setLoadingFund(true);
    setFundError('');

    void getSpaceFund(space.id)
      .then((nextFund) => {
        if (mounted) {
          setFund(nextFund);
        }
      })
      .catch((error) => {
        if (mounted) {
          setFundError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingFund(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [space.id]);

  const activeMembers = members.filter(
    (member) =>
      (member.status || 'active') === 'active',
  );

  const holder = fund
    ? activeMembers.find(
        (member) =>
          member.uid === fund.holderUid,
      ) || null
    : null;

  const holderName = fund
    ? fund.holderName
      || holder?.displayName
      || fund.holderEmail
      || holder?.email
      || 'Not set'
    : 'Not set';

  const budgetLimitMinor = budgets.reduce(
    (sum, budget) =>
      sum + budget.limitMinor,
    0,
  );

  const budgetSpentMinor = budgets.reduce(
    (sum, budget) =>
      sum + budget.spentMinor,
    0,
  );

  const budgetRemainingMinor =
    budgetLimitMinor - budgetSpentMinor;

  const fundRemainingMinor = fund
    ? fund.budgetMinor - fund.contributedMinor
    : 0;

  const expenseTotalMinor =
    sharedExpenses.reduce(
      (sum, expense) =>
        sum + expense.totalMinor,
      0,
    );

  const expenseSettledMinor =
    sharedExpenses.reduce(
      (sum, expense) =>
        sum + expense.totalSettledMinor,
      0,
    );

  const expenseLeftMinor =
    sharedExpenses.reduce(
      (sum, expense) =>
        sum + expense.amountLeftMinor,
      0,
    );

  const unsettledCount =
    sharedExpenses.filter(
      (expense) =>
        expense.status !== 'paid',
    ).length;

  return (
    <section
      className="panel trip-command-centre trip-overview-sheet-v115"
      data-trip-overview-spreadsheet
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            Trip worksheet
          </span>

          <h2>Trip at a glance</h2>

          <p className="muted">
            One compact overview for Trip Money, Budget,
            Expenses, members and Settle Up.
          </p>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={() =>
            onOpenTab('trip_money')
          }
        >
          Open Trip Money
        </button>
      </div>

      {fundError && (
        <div className="notice error">
          {fundError}
        </div>
      )}

      <div className="trip-sheet-section-heading">
        <div>
          <span className="eyebrow">
            Money overview
          </span>

          <h3>
            Trip totals
          </h3>
        </div>
      </div>

      <div className="trip-sheet-scroll">
        <table
          className="trip-sheet-table trip-overview-money-table"
          aria-label="Trip money overview worksheet"
        >
          <thead>
            <tr>
              <th>Area</th>
              <th>Target / Plan</th>
              <th>Collected / Spent</th>
              <th>Available / Left</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                <strong>
                  Trip Money
                </strong>
              </td>

              <td className="trip-budget-number-cell">
                {loadingFund
                  ? 'Loading...'
                  : fund
                    ? formatMoney(
                        fund.budgetMinor,
                        fund.currency,
                      )
                    : 'Not set'}
              </td>

              <td className="trip-budget-number-cell">
                {fund
                  ? formatMoney(
                      fund.contributedMinor,
                      fund.currency,
                    )
                  : formatMoney(
                      0,
                      space.currency,
                    )}
              </td>

              <td className="trip-budget-number-cell">
                {fund
                  ? formatMoney(
                      fund.availableMinor,
                      fund.currency,
                    )
                  : formatMoney(
                      0,
                      space.currency,
                    )}
              </td>

              <td>
                {loadingFund
                  ? 'Loading'
                  : !fund
                    ? 'Not set'
                    : fund.contributedMinor
                        >= fund.budgetMinor
                      ? 'Target collected'
                      : `${formatMoney(
                          Math.max(
                            0,
                            fundRemainingMinor,
                          ),
                          fund.currency,
                        )} to target`}
              </td>

              <td className="trip-sheet-actions-cell">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() =>
                    onOpenTab('trip_money')
                  }
                >
                  Open
                </button>
              </td>
            </tr>

            <tr>
              <td>
                <strong>
                  Trip Budget
                </strong>
              </td>

              <td className="trip-budget-number-cell">
                {formatMoney(
                  budgetLimitMinor,
                  space.currency,
                )}
              </td>

              <td className="trip-budget-number-cell">
                {formatMoney(
                  budgetSpentMinor,
                  space.currency,
                )}
              </td>

              <td
                className={
                  `trip-budget-number-cell${
                    budgetRemainingMinor < 0
                      ? ' is-over'
                      : ''
                  }`
                }
              >
                {formatMoney(
                  budgetRemainingMinor,
                  space.currency,
                )}
              </td>

              <td>
                {!budgets.length
                  ? 'No pots yet'
                  : budgetRemainingMinor < 0
                    ? 'Over plan'
                    : 'Money Activity only'}
              </td>

              <td>
                <span className="muted">
                  Budget sheet below
                </span>
              </td>
            </tr>

            <tr>
              <td>
                <strong>
                  Trip Expenses
                </strong>
              </td>

              <td className="trip-budget-number-cell">
                {formatMoney(
                  expenseTotalMinor,
                  space.currency,
                )}
              </td>

              <td className="trip-budget-number-cell">
                {formatMoney(
                  expenseSettledMinor,
                  space.currency,
                )}
              </td>

              <td className="trip-budget-number-cell">
                {formatMoney(
                  expenseLeftMinor,
                  space.currency,
                )}
              </td>

              <td>
                {unsettledCount
                  ? `${unsettledCount} open`
                  : 'Settled'}
              </td>

              <td className="trip-sheet-actions-cell">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() =>
                    onOpenTab('expenses')
                  }
                >
                  Open
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="trip-sheet-section-heading">
        <div>
          <span className="eyebrow">
            People
          </span>

          <h3>
            Trip team
          </h3>
        </div>
      </div>

      <div className="trip-sheet-scroll">
        <table
          className="trip-sheet-table trip-overview-team-table"
          aria-label="Trip team overview worksheet"
        >
          <thead>
            <tr>
              <th>Item</th>
              <th>Current</th>
              <th>Attention</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                Treasurer
              </td>

              <td>
                <strong>
                  {holderName}
                </strong>
              </td>

              <td>
                {fund && holder
                  ? 'Holds collected Trip Money'
                  : 'Choose an active holder'}
              </td>

              <td className="trip-sheet-actions-cell">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() =>
                    onOpenTab('trip_money')
                  }
                >
                  Open
                </button>
              </td>
            </tr>

            <tr>
              <td>
                Trip Members
              </td>

              <td>
                <strong>
                  {activeMembers.length}
                </strong>
              </td>

              <td>
                Active members
              </td>

              <td>
                <span className="muted">
                  Shared across Trip sheets
                </span>
              </td>
            </tr>

            <tr>
              <td>
                Settle Up
              </td>

              <td>
                <strong>
                  {unsettledCount}
                </strong>
              </td>

              <td>
                {unsettledCount
                  ? 'Shared expenses still open'
                  : 'No open shared expenses'}
              </td>

              <td className="trip-sheet-actions-cell">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() =>
                    onOpenTab('balances')
                  }
                >
                  Open
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="trip-command-guidance">
        {!loadingFund && !fund && (
          <div className="notice">
            <strong>
              Set up Trip Money first.
            </strong>{' '}
            Choose the Trip Fund target and the person
            holding the collected money.
          </div>
        )}

        {fund && !holder && (
          <div className="notice">
            <strong>
              Treasurer needs attention.
            </strong>{' '}
            Choose an active member before recording
            Contributions.
          </div>
        )}

        {fund
          && holder
          && fund.contributedMinor === 0
          && (
            <div className="notice">
              <strong>
                No Contributions yet.
              </strong>{' '}
              Open Trip Money to record the first
              Contribution.
            </div>
          )}

        {budgets.length === 0 && (
          <div className="notice">
            <strong>
              No Trip Budget yet.
            </strong>{' '}
            Use the Trip Budget worksheet to add the
            first pot.
          </div>
        )}

        {sharedExpenses.length === 0 && (
          <div className="notice">
            <strong>
              No Trip Expenses yet.
            </strong>{' '}
            Open Trip Expenses when the group starts
            spending.
          </div>
        )}
      </div>

      <div className="info-banner trip-overview-budget-source-note">
        <strong>
          Trip Budget Spent does not include Trip Expenses yet.
        </strong>

        <span>
          It currently follows posted Money Activity transactions
          linked to this Trip. Expense-to-budget linking will be
          handled separately.
        </span>
      </div>
      <TripPlanningPanel
        space={space}
        members={members}
        currentMember={currentMember}
      />
    </section>
  );
}
