import { useEffect, useState } from 'react';
import { getSpaceFund } from '../../repositories/sharedExpenseRepository';
import type {
  Commitment,
  SharedBillAssignment,
  SharedExpense,
  Space,
  SpaceFund,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type HouseholdTab = 'group_fund' | 'bills' | 'expenses' | 'balances';

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAfterDays(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return localDate(value);
}

export function HouseholdCommandCentre({
  space,
  members,
  commitments,
  sharedBills,
  sharedExpenses,
  currentMember,
  canManage,
  onOpenTab,
}: {
  space: Space;
  members: SpaceMember[];
  commitments: Commitment[];
  sharedBills: SharedBillAssignment[];
  sharedExpenses: SharedExpense[];
  currentMember: SpaceMember | null;
  canManage: boolean;
  onOpenTab: (tab: HouseholdTab) => void;
}) {
  const [fund, setFund] = useState<SpaceFund | null>(null);
  const [fundLoading, setFundLoading] = useState(true);
  const [fundError, setFundError] = useState('');

  useEffect(() => {
    let active = true;

    setFundLoading(true);
    setFundError('');

    void getSpaceFund(space.id)
      .then((nextFund) => {
        if (active) setFund(nextFund);
      })
      .catch((error) => {
        if (active) setFundError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setFundLoading(false);
      });

    return () => {
      active = false;
    };
  }, [space.id]);

  const today = localDate();
  const soon = dateAfterDays(7);

  const activeMembers = members.filter(
    (item) => (item.status || 'active') === 'active',
  );

  const activeCommitments = commitments.filter(
    (item) => item.status === 'active' && !item.archivedAt,
  );

  const openSharedBills = sharedBills.filter(
    (item) => item.status !== 'paid',
  );

  const openSharedExpenses = sharedExpenses.filter(
    (item) => item.status !== 'paid',
  );

  const assignmentOutstanding = (assignment: SharedBillAssignment) =>
    Math.max(
      0,
      Number(assignment.assignedMinor || 0)
        - Number(assignment.settledMinor || 0),
    );

  const assignmentStatusLabel = (status: string) => {
    if (status === 'paid') return 'Paid';
    if (status === 'submitted') return 'Waiting for review';
    if (status === 'partially_paid') return 'Partly paid';
    if (status === 'rejected') return 'Needs correction';
    return status.split('_').join(' ');
  };

  const assignmentDueLabel = (assignment: SharedBillAssignment) => {
    if (!assignment.dueDate) return 'No due date';
    if (assignment.dueDate < today) return `Overdue · ${assignment.dueDate}`;
    if (assignment.dueDate === today) return 'Due today';
    if (assignment.dueDate <= soon) return `Due soon · ${assignment.dueDate}`;
    return `Due ${assignment.dueDate}`;
  };

  const myAssignments = currentMember
    ? sharedBills.filter(
        (assignment) => assignment.memberUid === currentMember.uid,
      )
    : [];

  const myOpenAssignments = myAssignments
    .filter(
      (assignment) =>
        assignment.status !== 'paid'
        && assignmentOutstanding(assignment) > 0,
    )
    .sort((a, b) =>
      (a.dueDate || '9999-12-31').localeCompare(
        b.dueDate || '9999-12-31',
      ),
    );

  const myOverdueAssignments = myOpenAssignments.filter(
    (assignment) =>
      Boolean(assignment.dueDate && assignment.dueDate < today),
  );

  const myDueSoonAssignments = myOpenAssignments.filter(
    (assignment) =>
      Boolean(
        assignment.dueDate
          && assignment.dueDate >= today
          && assignment.dueDate <= soon,
      ),
  );

  const pendingReviewCount = canManage
    ? sharedBills.filter(
        (assignment) => assignment.status === 'submitted',
      ).length
    : 0;

  const dueCommitments = activeCommitments.filter((item) => {
    const dueDate = item.nextDueDate || item.startDate;
    return Boolean(dueDate && dueDate <= soon);
  });

  const overdueCommitments = activeCommitments.filter((item) => {
    const dueDate = item.nextDueDate || item.startDate;
    return Boolean(dueDate && dueDate < today);
  });

  const dueSharedBills = openSharedBills.filter(
    (item) => Boolean(item.dueDate && item.dueDate <= soon),
  );

  const overdueSharedBills = openSharedBills.filter(
    (item) => Boolean(item.dueDate && item.dueDate < today),
  );

  const activeHolder = fund
    ? activeMembers.find((member) => member.uid === fund.holderUid) || null
    : null;

  const householdFundAvailable = fund?.availableMinor || 0;
  const householdFundCollected = fund?.contributedMinor || 0;
  const householdFundTarget = fund?.budgetMinor || 0;

  const targetRemaining = Math.max(
    0,
    householdFundTarget - householdFundCollected,
  );

  const attentionCount =
    (fund ? 0 : 1)
    + (fund && !activeHolder ? 1 : 0)
    + (dueCommitments.length ? 1 : 0)
    + (dueSharedBills.length ? 1 : 0)
    + (openSharedExpenses.length ? 1 : 0)
    + (pendingReviewCount ? 1 : 0);

  return (
    <section className="household-command-centre">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Household v2</span>
          <h2>Household at a glance</h2>
          <p className="muted">
            See the Household Fund, responsibilities, shared bills and
            Settlements without creating separate financial records.
          </p>
        </div>

        <span className={`household-attention-badge${attentionCount ? ' active' : ''}`}>
          {attentionCount
            ? `${attentionCount} need${attentionCount === 1 ? 's' : ''} attention`
            : 'Up to date'}
        </span>
      </div>

      {fundError && (
        <div className="notice error">
          Household Fund summary could not be loaded: {fundError}
        </div>
      )}

      <div className="household-glance-grid">
        <article className="household-glance-card">
          <span className="eyebrow">Household Fund</span>

          {fundLoading ? (
            <strong>Loading…</strong>
          ) : fund ? (
            <>
              <strong>{formatMoney(householdFundAvailable, space.currency)}</strong>
              <small>Available now</small>
              <small>
                {formatMoney(householdFundCollected, space.currency)} collected
                {householdFundTarget > 0
                  ? ` of ${formatMoney(householdFundTarget, space.currency)}`
                  : ''}
              </small>
              <small>
                Money holder:{' '}
                {activeHolder?.displayName
                  || activeHolder?.email
                  || 'Needs an active holder'}
              </small>

              {targetRemaining > 0 && (
                <small>
                  {formatMoney(targetRemaining, space.currency)} remaining to target
                </small>
              )}
            </>
          ) : (
            <>
              <strong>Not set up</strong>
              <small>Create one shared place for household contributions.</small>
            </>
          )}

          <button
            type="button"
            className="button secondary compact"
            onClick={() => onOpenTab('group_fund')}
          >
            Open Household Fund
          </button>
        </article>

        <article className="household-glance-card">
          <span className="eyebrow">Household members</span>
          <strong>{activeMembers.length}</strong>
          <small>Active household member{activeMembers.length === 1 ? '' : 's'}</small>
          <small>
            Shared money and responsibilities stay inside this Household Space.
          </small>
        </article>

        <article className="household-glance-card">
          <span className="eyebrow">Bills & responsibilities</span>
          <strong>{activeCommitments.length + openSharedBills.length}</strong>
          <small>
            {activeCommitments.length} recurring / personal responsibility
            {activeCommitments.length === 1 ? '' : 'ies'}
          </small>
          <small>
            {openSharedBills.length} open Shared Bill
            {openSharedBills.length === 1 ? '' : 's'}
          </small>

          <button
            type="button"
            className="button secondary compact"
            onClick={() => onOpenTab('bills')}
          >
            Review Shared Bills
          </button>
        </article>

        <article className="household-glance-card">
          <span className="eyebrow">Settlements</span>
          <strong>{openSharedExpenses.length}</strong>
          <small>
            Unsettled shared expense{openSharedExpenses.length === 1 ? '' : 's'}
          </small>

          <button
            type="button"
            className="button secondary compact"
            onClick={() => onOpenTab('balances')}
          >
            Review Settlements
          </button>
        </article>
      </div>

      <section className="household-responsibilities">
        <div className="household-responsibilities-heading">
          <div>
            <span className="eyebrow">Shared bills</span>
            <h3>My household responsibilities</h3>
          </div>

          <small>
            {myOverdueAssignments.length > 0
              ? `${myOverdueAssignments.length} overdue`
              : myDueSoonAssignments.length > 0
                ? `${myDueSoonAssignments.length} due within 7 days`
                : 'Your assigned household bills appear here.'}
          </small>
        </div>

        {!currentMember ? (
          <div className="notice">
            Your Household membership could not be identified.
          </div>
        ) : myOpenAssignments.length === 0 ? (
          <div className="notice">
            <strong>No household payment is waiting from you.</strong>{' '}
            New Shared Bill assignments will appear here automatically.
          </div>
        ) : (
          <div className="household-responsibility-list">
            {myOpenAssignments.slice(0, 4).map((assignment) => (
              <article
                className="household-responsibility-card"
                key={assignment.id}
              >
                <div>
                  <strong>{assignment.commitmentName}</strong>

                  <div className="household-responsibility-meta">
                    <span>
                      {assignmentStatusLabel(String(assignment.status))}
                    </span>

                    <span>{assignmentDueLabel(assignment)}</span>

                    <span>
                      {formatMoney(
                        assignmentOutstanding(assignment),
                        assignment.currency || space.currency,
                      )}{' '}
                      remaining
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => onOpenTab('bills')}
                >
                  Open payment &amp; proof
                </button>
              </article>
            ))}
          </div>
        )}

        {myOpenAssignments.length > 4 && (
          <button
            type="button"
            className="button secondary"
            onClick={() => onOpenTab('bills')}
          >
            View all {myOpenAssignments.length} responsibilities
          </button>
        )}

        {canManage && pendingReviewCount > 0 && (
          <article className="household-review-card">
            <div>
              <span className="eyebrow">Manager attention</span>
              <strong>
                {pendingReviewCount} payment
                {pendingReviewCount === 1 ? '' : 's'} waiting for review
              </strong>
              <small>
                Check the submitted amount and proof before accepting it.
              </small>
            </div>

            <button
              type="button"
              className="button secondary compact"
              onClick={() => onOpenTab('bills')}
            >
              Review payments
            </button>
          </article>
        )}
      </section>
      <section className="household-needs-attention">
        <div className="household-needs-attention-heading">
          <div>
            <span className="eyebrow">Household operations</span>
            <h3>Needs Attention</h3>
          </div>

          <small>Only items that may need a useful next step appear here.</small>
        </div>

        {!attentionCount ? (
          <div className="notice">
            <strong>Nothing urgent right now.</strong>{' '}
            Household Fund, bills and Settlements are ready when you need them.
          </div>
        ) : (
          <div className="household-attention-list">
            {!fund && !fundLoading && (
              <article className="household-attention-item">
                <div>
                  <strong>Set up the Household Fund</strong>
                  <small>
                    Choose a money holder and collection target before members
                    start contributing.
                  </small>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => onOpenTab('group_fund')}
                >
                  Set up Fund
                </button>
              </article>
            )}

            {fund && !activeHolder && (
              <article className="household-attention-item">
                <div>
                  <strong>Household Fund needs an active money holder</strong>
                  <small>
                    Contributions should always have a clearly identified holder.
                  </small>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => onOpenTab('group_fund')}
                >
                  Fix Fund setup
                </button>
              </article>
            )}

            {dueCommitments.length > 0 && (
              <article className="household-attention-item">
                <div>
                  <strong>
                    {overdueCommitments.length > 0
                      ? `${overdueCommitments.length} household responsibility${overdueCommitments.length === 1 ? '' : 'ies'} overdue`
                      : `${dueCommitments.length} household responsibility${dueCommitments.length === 1 ? '' : 'ies'} due soon`}
                  </strong>
                  <small>
                    These come from the existing Bills & instalments records in
                    this Household Space.
                  </small>
                </div>
              </article>
            )}

            {canManage && pendingReviewCount > 0 && (
              <article className="household-attention-item">
                <div>
                  <strong>
                    {pendingReviewCount} household payment
                    {pendingReviewCount === 1 ? '' : 's'} waiting for review
                  </strong>
                  <small>
                    Open Shared Bills to check the member submission and proof.
                  </small>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => onOpenTab('bills')}
                >
                  Review payments
                </button>
              </article>
            )}

            {dueSharedBills.length > 0 && (
              <article className="household-attention-item">
                <div>
                  <strong>
                    {overdueSharedBills.length > 0
                      ? `${overdueSharedBills.length} Shared Bill${overdueSharedBills.length === 1 ? '' : 's'} overdue`
                      : `${dueSharedBills.length} Shared Bill${dueSharedBills.length === 1 ? '' : 's'} due soon`}
                  </strong>
                  <small>
                    Review assignments and submitted household payments.
                  </small>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => onOpenTab('bills')}
                >
                  Review Shared Bills
                </button>
              </article>
            )}

            {openSharedExpenses.length > 0 && (
              <article className="household-attention-item">
                <div>
                  <strong>
                    {openSharedExpenses.length} shared expense
                    {openSharedExpenses.length === 1 ? '' : 's'} not settled
                  </strong>
                  <small>
                    Review who still owes whom without creating another balance.
                  </small>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => onOpenTab('balances')}
                >
                  Review Settlements
                </button>
              </article>
            )}
          </div>
        )}
      </section>
    </section>
  );
}