import { useEffect, useState } from 'react';
import { getSpaceFund } from '../../repositories/sharedExpenseRepository';
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
  onOpenTab,
}: {
  space: Space;
  budgets: Budget[];
  members: SpaceMember[];
  sharedExpenses: SharedExpense[];
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
        if (mounted) setFund(nextFund);
      })
      .catch((error) => {
        if (mounted) setFundError(getErrorMessage(error));
      })
      .finally(() => {
        if (mounted) setLoadingFund(false);
      });

    return () => {
      mounted = false;
    };
  }, [space.id]);

  const activeMembers = members.filter(
    (member) => (member.status || 'active') === 'active',
  );

  const holder = fund
    ? activeMembers.find((member) => member.uid === fund.holderUid) || null
    : null;

  const holderName = fund
    ? fund.holderName
      || holder?.displayName
      || fund.holderEmail
      || holder?.email
      || 'Not set'
    : 'Not set';

  const budgetLimitMinor = budgets.reduce(
    (sum, budget) => sum + budget.limitMinor,
    0,
  );

  const budgetSpentMinor = budgets.reduce(
    (sum, budget) => sum + budget.spentMinor,
    0,
  );

  const budgetRemainingMinor = Math.max(
    0,
    budgetLimitMinor - budgetSpentMinor,
  );

  const fundRemainingMinor = fund
    ? Math.max(0, fund.budgetMinor - fund.contributedMinor)
    : 0;

  const unsettledCount = sharedExpenses.filter(
    (expense) => expense.status !== 'paid',
  ).length;

  return (
    <section className="panel trip-command-centre">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Trip command centre</span>
          <h2>Trip at a glance</h2>
          <p className="muted">
            Follow the Trip Fund, Budget, treasurer, members and Settlements
            from one place.
          </p>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={() => onOpenTab('trip_money')}
        >
          Open Trip money
        </button>
      </div>

      {fundError && <div className="notice error">{fundError}</div>}

      <div className="summary-grid trip-command-summary">
        <article className="summary-card featured">
          <span>Trip Fund collected</span>
          <strong>
            {loadingFund
              ? 'Loading…'
              : fund
                ? formatMoney(fund.contributedMinor, fund.currency)
                : 'Not set'}
          </strong>
          <small>
            {fund
              ? `${formatMoney(fundRemainingMinor, fund.currency)} remaining to ${formatMoney(fund.budgetMinor, fund.currency)} target`
              : 'Set up Trip money to start collecting Contributions.'}
          </small>
        </article>

        <article className="summary-card">
          <span>Trip Fund available</span>
          <strong>
            {fund
              ? formatMoney(fund.availableMinor, fund.currency)
              : formatMoney(0, space.currency)}
          </strong>
          <small>
            {fund
              ? `${formatMoney(fund.spentMinor, fund.currency)} spent from collected money`
              : 'No collected Trip Fund yet.'}
          </small>
        </article>

        <article className="summary-card">
          <span>Trip Budget</span>
          <strong>
            {formatMoney(budgetSpentMinor, space.currency)}
            {' / '}
            {formatMoney(budgetLimitMinor, space.currency)}
          </strong>
          <small>
            {budgets.length
              ? `${formatMoney(budgetRemainingMinor, space.currency)} remaining`
              : 'No Budget created for this Trip yet.'}
          </small>
        </article>

        <article className="summary-card">
          <span>Treasurer</span>
          <strong>{holderName}</strong>
          <small>
            {fund && holder
              ? 'Holds the collected Trip Fund.'
              : 'An active money holder still needs to be selected.'}
          </small>
        </article>

        <article className="summary-card">
          <span>Trip members</span>
          <strong>{activeMembers.length}</strong>
          <small>
            {unsettledCount
              ? `${unsettledCount} shared Expense${unsettledCount === 1 ? '' : 's'} still unsettled`
              : 'No unsettled shared Expenses.'}
          </small>
        </article>
      </div>

      <div className="trip-command-actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => onOpenTab('trip_money')}
        >
          Trip Fund
        </button>

        <button
          type="button"
          className="button secondary"
          onClick={() => onOpenTab('expenses')}
        >
          Trip Expenses
        </button>

        <button
          type="button"
          className="button secondary"
          onClick={() => onOpenTab('balances')}
        >
          Review Settlements
        </button>
      </div>

      <div className="trip-command-guidance">
        {!loadingFund && !fund && (
          <div className="notice">
            <strong>Set up Trip money first.</strong>{' '}
            Choose the Trip Fund target and the person holding the collected money.
          </div>
        )}

        {fund && !holder && (
          <div className="notice">
            <strong>Treasurer needs attention.</strong>{' '}
            Choose an active member before recording Contributions.
          </div>
        )}

        {fund && holder && fund.contributedMinor === 0 && (
          <div className="notice">
            <strong>No Contributions yet.</strong>{' '}
            Open Trip money to record the first Contribution.
          </div>
        )}

        {budgets.length === 0 && (
          <div className="notice">
            <strong>No Trip Budget yet.</strong>{' '}
            Use the Trip Budget tool below to plan spending separately from the Trip Fund.
          </div>
        )}

        {sharedExpenses.length === 0 && (
          <div className="notice">
            <strong>No Trip Expenses yet.</strong>{' '}
            Open Trip Expenses when the group starts spending.
          </div>
        )}
      </div>
    </section>
  );
}