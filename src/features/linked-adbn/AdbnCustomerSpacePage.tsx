import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getSpaceCommitmentWorkspace } from '../../repositories/commitmentRepository';
import {
  listMyAdbnCustomerLinks,
  type AdbnCustomerLink,
} from '../../repositories/adbnCustomerLinkRepository';
import { getSpace } from '../../repositories/spaceRepository';
import type { Commitment, CommitmentPayment, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

function outstandingMinor(item: Commitment) {
  if (item.totalAmountMinor != null) {
    return Math.max(
      0,
      item.totalAmountMinor
      - item.amountPaidMinor,
    );
  }

  if (item.status !== 'active') {
    return 0;
  }

  return Math.max(
    0,
    item.amountMinor
    - item.amountPaidMinor,
  );
}

function totalMinor(item: Commitment) {
  return Math.max(
    0,
    item.totalAmountMinor
    ?? item.amountMinor,
  );
}

function progressFor(item: Commitment) {
  const total =
    totalMinor(item);

  if (total <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.max(
          0,
          item.amountPaidMinor,
        )
        / total
        * 100,
      ),
    ),
  );
}

function displayDate(
  value?: string | null,
) {
  if (!value) {
    return 'No due date';
  }

  const parsed =
    new Date(
      value + 'T00:00:00',
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  ).format(parsed);
}

function paymentPlanLabel(
  item: Commitment,
) {
  if (item.status === 'completed') {
    return 'Paid in full';
  }

  if (item.nextDueDate) {
    return (
      'Next due '
      + displayDate(
        item.nextDueDate,
      )
    );
  }

  return 'Active plan';
}

export function AdbnCustomerSpacePage() {
  const { user } = useAuth();
  const { spaceId = '' } =
    useParams();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [link, setLink] =
    useState<AdbnCustomerLink | null>(
      null,
    );

  const [commitments, setCommitments] =
    useState<Commitment[]>([]);

  const [payments, setPayments] =
    useState<CommitmentPayment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load =
    useCallback(
      async () => {
        if (!user || !spaceId) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError('');

        try {
          const [
            nextSpace,
            links,
            billing,
          ] = await Promise.all([
            getSpace(
              spaceId,
            ),
            listMyAdbnCustomerLinks(),
            getSpaceCommitmentWorkspace(
              spaceId,
            ),
          ]);

          setSpace(
            nextSpace,
          );

          setLink(
            links.find(
              (item) =>
                item.status
                  === 'accepted'
                && item.targetSpaceId
                  === spaceId,
            )
            || null,
          );

          setCommitments(
            billing.commitments
              .filter(
                (item) =>
                  item.externalIntegrationProvider
                    === 'adbn_tech'
                  && item.externalIntegrationMirrorStatus
                    !== 'stale',
              ),
          );

          setPayments(
            billing.payments
              .filter(
                (item) =>
                  item.externalIntegrationProvider
                    === 'adbn_tech'
                  && item.externalIntegrationMirrorStatus
                    !== 'stale'
                  && item.status
                    === 'posted',
              ),
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
      },
      [
        spaceId,
        user,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [load],
  );

  const activeCommitments =
    useMemo(
      () =>
        commitments
          .filter(
            (item) =>
              item.status
                === 'active',
          )
          .sort(
            (a, b) =>
              String(
                a.nextDueDate
                || '9999-12-31',
              )
                .localeCompare(
                  String(
                    b.nextDueDate
                    || '9999-12-31',
                  ),
                ),
          ),
      [commitments],
    );

  const nextCommitment =
    activeCommitments[0]
    || null;

  const remainingMinor =
    commitments.reduce(
      (sum, item) =>
        sum
        + outstandingMinor(
          item,
        ),
      0,
    );

  const allPlansTotalMinor =
    commitments.reduce(
      (sum, item) =>
        sum
        + totalMinor(
          item,
        ),
      0,
    );

  const paidMinor =
    commitments.reduce(
      (sum, item) =>
        sum
        + Math.max(
          0,
          item.amountPaidMinor,
        ),
      0,
    );

  const progressPercent =
    allPlansTotalMinor > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              paidMinor
              / allPlansTotalMinor
              * 100,
            ),
          ),
        )
      : 0;

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading ADBN TECH Space…
        </div>
      </main>
    );
  }

  const validSpace =
    Boolean(
      space
      && user
      && space.ownerId
        === user.uid
      && space.type
        === 'custom'
      && space.externalIntegrationProvider
        === 'adbn_tech'
      && space.externalIntegrationRole
        === 'customer',
    );

  if (!validSpace) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="ADBN TECH"
          title="ADBN TECH Space unavailable"
          description="This Space is not linked to your ADBN TECH customer account."
        />

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <Link
          className="button primary"
          to="/adbn-links"
        >
          Customer links
        </Link>
      </main>
    );
  }

  const nextAmount =
    nextCommitment
      ? Math.min(
          nextCommitment.amountMinor,
          outstandingMinor(
            nextCommitment,
          )
          || nextCommitment.amountMinor,
        )
      : 0;

  const customerName =
    link?.customerName?.trim()
    || 'ADBN TECH customer';

  const customerNo =
    link?.customerNo?.trim()
    || '';

  return (
    <main
      className="page adbn-customer-portal-v2"
      data-adbn-customer-space
    >
      <section
        className="adbn-customer-hero-v2"
        data-adbn-customer-hero
      >
        <div className="adbn-customer-hero-copy-v2">
          <span className="adbn-customer-kicker-v2">
            ADBN TECH · CUSTOMER ACCOUNT
          </span>

          <h1>
            Welcome, {customerName}
          </h1>

          <p>
            Track your ADBN TECH payment plan, balance and confirmed payment history in one private place.
          </p>

          <div className="adbn-customer-hero-meta-v2">
            {customerNo && (
              <span>
                Customer {customerNo}
              </span>
            )}

            <span>
              {activeCommitments.length}
              {' '}
              active
              {' '}
              {activeCommitments.length === 1
                ? 'plan'
                : 'plans'}
            </span>

            <span>
              ADBN TECH managed
            </span>
          </div>
        </div>

        <div className="adbn-customer-hero-actions-v2">
          <div className="adbn-customer-brand-mark-v2">
            <span>ADBN</span>
            <strong>TECH</strong>
          </div>

          <Link
            className="button secondary"
            to="/adbn-links"
          >
            Customer link
          </Link>
        </div>
      </section>

      <div className="info-banner adbn-customer-privacy-v2">
        <strong>
          Separate from your Personal money.
        </strong>

        <span>
          ADBN TECH is the source of truth for these billing records. Your other BajetBN Spaces, bank accounts, balances and transactions remain private.
        </span>
      </div>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <section
        className="adbn-customer-overview-v2"
        data-adbn-customer-overview
      >
        <article className="adbn-customer-next-payment-v2">
          <div className="adbn-customer-next-top-v2">
            <div>
              <span className="eyebrow">
                Next payment
              </span>

              <strong className="adbn-customer-next-amount-v2">
                {nextCommitment
                  ? formatMoney(
                      nextAmount,
                      nextCommitment.currency,
                    )
                  : '—'}
              </strong>

              <p>
                {nextCommitment
                  ? 'Due '
                    + displayDate(
                      nextCommitment.nextDueDate,
                    )
                  : commitments.length
                    ? 'No payment currently due'
                    : 'Waiting for ADBN billing sync'}
              </p>
            </div>

            <span className="adbn-customer-due-badge-v2">
              {nextCommitment
                ? 'Upcoming'
                : 'Up to date'}
            </span>
          </div>

          {nextCommitment && (
            <div className="adbn-customer-next-reference-v2">
              <span>
                {nextCommitment.externalIntegrationSourceNo
                  || 'ADBN payment plan'}
              </span>

              <strong>
                {nextCommitment.name}
              </strong>
            </div>
          )}

          <Link
            className="button primary"
            to="/bills"
          >
            View Bills & Instalments
          </Link>
        </article>

        <article className="adbn-customer-progress-panel-v2">
          <div className="adbn-customer-progress-heading-v2">
            <div>
              <span className="eyebrow">
                Overall progress
              </span>

              <h2>
                {commitments.length
                  ? progressPercent + '% paid'
                  : 'Waiting for billing'}
              </h2>
            </div>

            <strong className="adbn-customer-progress-percent-v2">
              {commitments.length
                ? progressPercent + '%'
                : '—'}
            </strong>
          </div>

          <div
            className="adbn-customer-progress-track-v2"
            role="progressbar"
            aria-label="ADBN TECH payment progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <span
              style={{
                width:
                  progressPercent
                  + '%',
              }}
            />
          </div>

          <div className="adbn-customer-progress-stats-v2">
            <div>
              <span>
                Paid
              </span>

              <strong>
                {formatMoney(
                  paidMinor,
                  space?.currency
                  || 'BND',
                )}
              </strong>
            </div>

            <div>
              <span>
                Remaining
              </span>

              <strong>
                {formatMoney(
                  remainingMinor,
                  space?.currency
                  || 'BND',
                )}
              </strong>
            </div>

            <div>
              <span>
                Plan total
              </span>

              <strong>
                {formatMoney(
                  allPlansTotalMinor,
                  space?.currency
                  || 'BND',
                )}
              </strong>
            </div>
          </div>
        </article>
      </section>

      {commitments.length === 0 ? (
        <section
          className="panel adbn-customer-empty-v2"
          data-adbn-customer-space-billing-placeholder
        >
          <span className="eyebrow">
            Monthly payments
          </span>

          <h2>
            Your ADBN TECH account is ready
          </h2>

          <p className="muted">
            Your customer link is active. ADBN TECH billing has not been mirrored into BajetBN yet.
          </p>
        </section>
      ) : (
        <>
          <section
            className="adbn-customer-section-v2"
            data-adbn-customer-billing-plans
          >
            <div className="adbn-customer-section-heading-v2">
              <div>
                <span className="eyebrow">
                  Bills & instalments
                </span>

                <h2>
                  Your payment plans
                </h2>

                <p className="muted">
                  A clear view of every active or completed ADBN TECH billing record.
                </p>
              </div>

              <Link
                className="button secondary"
                to="/bills"
              >
                Open all
              </Link>
            </div>

            <div className="adbn-customer-plan-grid-v2">
              {commitments.map(
                (item) => {
                  const remaining =
                    outstandingMinor(
                      item,
                    );

                  const itemProgress =
                    progressFor(
                      item,
                    );

                  return (
                    <article
                      className="adbn-customer-plan-card-v2"
                      key={item.id}
                      data-adbn-customer-billing-record
                    >
                      <div className="adbn-customer-plan-header-v2">
                        <div>
                          <small>
                            {item.externalIntegrationSourceNo
                              || (
                                item.type
                                  === 'instalment'
                                  ? 'Monthly plan'
                                  : 'ADBN bill'
                              )}
                          </small>

                          <h3>
                            {item.name}
                          </h3>
                        </div>

                        <span
                          className={
                            'adbn-customer-plan-status-v2 '
                            + (
                              item.status
                                === 'completed'
                                ? 'paid'
                                : 'active'
                            )
                          }
                        >
                          {item.status
                            === 'completed'
                            ? 'Paid'
                            : 'Active'}
                        </span>
                      </div>

                      <div className="adbn-customer-plan-progress-v2">
                        <div>
                          <span>
                            Progress
                          </span>

                          <strong>
                            {itemProgress}%
                          </strong>
                        </div>

                        <div className="adbn-customer-mini-progress-v2">
                          <span
                            style={{
                              width:
                                itemProgress
                                + '%',
                            }}
                          />
                        </div>
                      </div>

                      <div className="adbn-customer-plan-metrics-v2">
                        <div>
                          <span>
                            {item.type
                              === 'instalment'
                              ? 'Monthly'
                              : 'Amount'}
                          </span>

                          <strong>
                            {formatMoney(
                              item.amountMinor,
                              item.currency,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Remaining
                          </span>

                          <strong>
                            {formatMoney(
                              remaining,
                              item.currency,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Next due
                          </span>

                          <strong>
                            {item.status
                              === 'completed'
                              ? 'Completed'
                              : displayDate(
                                  item.nextDueDate,
                                )}
                          </strong>
                        </div>
                      </div>

                      <div className="adbn-customer-plan-footer-v2">
                        <span>
                          {paymentPlanLabel(
                            item,
                          )}
                        </span>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </section>

          <section
            className="adbn-customer-lower-grid-v2"
          >
            <div
              className="adbn-customer-section-v2"
              data-adbn-customer-payment-history
            >
              <div className="adbn-customer-section-heading-v2">
                <div>
                  <span className="eyebrow">
                    Payment history
                  </span>

                  <h2>
                    Recent payments
                  </h2>

                  <p className="muted">
                    Confirmed payments received by ADBN TECH.
                  </p>
                </div>
              </div>

              {payments.length > 0 ? (
                <div className="adbn-customer-payment-list-v2">
                  {payments
                    .slice(
                      0,
                      10,
                    )
                    .map(
                      (payment) => (
                        <article
                          className="adbn-customer-payment-row-v2"
                          key={payment.id}
                        >
                          <div className="adbn-customer-payment-icon-v2">
                            ✓
                          </div>

                          <div className="adbn-customer-payment-main-v2">
                            <strong>
                              {payment.externalIntegrationSourceNo
                                || 'ADBN payment'}
                            </strong>

                            <span>
                              {displayDate(
                                payment.paymentDate,
                              )}
                              {' · '}
                              {payment.paymentMethodLabel
                                || 'Payment'}
                            </span>
                          </div>

                          <strong className="adbn-customer-payment-amount-v2">
                            {formatMoney(
                              payment.amountMinor,
                              payment.currency,
                            )}
                          </strong>
                        </article>
                      ),
                    )}
                </div>
              ) : (
                <div className="mini-empty">
                  <h3>
                    No payment history yet
                  </h3>

                  <p>
                    Confirmed ADBN payments will appear here after billing sync.
                  </p>
                </div>
              )}
            </div>

            <aside className="adbn-customer-side-stack-v2">
              <section className="adbn-customer-reminder-card-v2">
                <span className="eyebrow">
                  Notifications
                </span>

                <h2>
                  Never lose track of a due date
                </h2>

                <p>
                  Active ADBN bills and instalments use BajetBN's existing due-soon, due-today and overdue reminder system. Reminder delivery follows your BajetBN notification settings.
                </p>

                <Link
                  className="button secondary"
                  to="/bills"
                >
                  Review due dates
                </Link>
              </section>

              <section className="adbn-customer-source-card-v2">
                <span className="eyebrow">
                  Billing source
                </span>

                <h3>
                  ADBN TECH managed
                </h3>

                <p>
                  Amounts, payment status and balances shown here are mirrored from ADBN TECH and cannot be changed from this customer portal.
                </p>
              </section>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
