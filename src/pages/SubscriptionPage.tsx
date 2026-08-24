import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  BAJETBN_BASIC_SPACE_SUMMARY,
  BAJETBN_PAYMENT_ACCOUNTS,
  BAJETBN_PLUS_PRICES,
  BAJETBN_WHATSAPP_NUMBER,
  type BajetBnPlusPlan,
} from '../config/subscription';
import {
  useAuth,
} from '../contexts/AuthContext';
import {
  createSubscriptionRequest,
  listMySubscriptionRequests,
  submitSubscriptionPaymentProof,
  uploadSubscriptionPaymentProof,
  type SubscriptionRequest,
} from '../repositories/subscriptionRequestRepository';
import {
  getEntitlements,
} from '../services/entitlements';
import {
  getErrorMessage,
} from '../utils/errors';

function formatExpiry(
  value: { toDate(): Date } | null | undefined,
): string {
  if (!value) return '';

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      dateStyle: 'long',
      timeZone: 'Asia/Brunei',
    },
  ).format(value.toDate());
}

function requestStatus(
  status: SubscriptionRequest['status'],
): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Awaiting payment proof';
    case 'pending_review':
      return 'Pending admin review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}

function openProofWhatsApp(
  request: SubscriptionRequest,
) {
  const adminReviewLink =
    `${window.location.origin}/admin`
    + `?subscriptionRequest=${encodeURIComponent(request.id)}`;

  const submittedText =
    request.submittedAt
      ? new Intl.DateTimeFormat(
          'en-BN',
          {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Brunei',
          },
        ).format(new Date(request.submittedAt))
      : 'Just submitted';

  const message = [
    'Hi BajetBN, I have uploaded my BajetBN Plus payment proof.',
    '',
    `Name: ${request.fullName || 'BajetBN customer'}`,
    `Email: ${request.email}`,
    `Plan: ${request.planLabel}`,
    `Amount paid: BND ${(request.amountMinor / 100).toFixed(2)}`,
    `Reference: ${request.reference}`,
    `Submitted: ${submittedText}`,
    '',
    `Payment proof / admin review: ${adminReviewLink}`,
    '',
    'Please review my payment proof. Thank you.',
  ].join('\n');

  window.open(
    `https://wa.me/${BAJETBN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function SubscriptionPage() {
  const {
    profile,
    user,
  } = useAuth();

  const entitlement =
    getEntitlements(profile);

  const noScheduledExpiry =
    entitlement.plusActive
    && !profile?.subscriptionExpiresAt;

  const [selectedPlan, setSelectedPlan] =
    useState<BajetBnPlusPlan | null>(null);

  const [proofFile, setProofFile] =
    useState<File | null>(null);

  const [requests, setRequests] =
    useState<SubscriptionRequest[]>([]);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  async function refreshRequests() {
    if (!user) {
      setRequests([]);
      return;
    }

    try {
      setRequests(
        await listMySubscriptionRequests(),
      );
    } catch {
      setRequests([]);
    }
  }

  useEffect(() => {
    void refreshRequests();
  }, [user?.uid]);

  const latestPending =
    useMemo(
      () =>
        requests.find(
          (item) =>
            item.status === 'pending_review',
        ) || null,
      [requests],
    );

  async function uploadProof() {
    if (
      !user
      || !selectedPlan
      || !proofFile
    ) {
      setError(
        'Choose a Plus plan and payment proof first.',
      );
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const request =
        await createSubscriptionRequest(
          selectedPlan.key,
        );

      const proofPath =
        await uploadSubscriptionPaymentProof({
          uid: user.uid,
          requestId: request.id,
          file: proofFile,
        });

      const submitted =
        await submitSubscriptionPaymentProof(
          request.id,
          proofPath,
        );

      setProofFile(null);

      await refreshRequests();

      setMessage(
        `Payment proof uploaded. Reference ${submitted.reference} is now pending admin review.`,
      );
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="subscription-page">
      <PageHeader
        eyebrow="BajetBN"
        title="Subscription"
        description="Basic stays free forever. Upgrade to Plus when you need more Spaces, collaboration, SME capacity and storage."
      />

      <section className="subscription-current">
        <div className="subscription-current-main">
          <span className="eyebrow">
            Current plan
          </span>

          <div className="subscription-plan-heading">
            <div
              className={
                entitlement.plusActive
                  ? 'subscription-plan-icon plus'
                  : 'subscription-plan-icon'
              }
            >
              {entitlement.plusActive ? '✦' : '○'}
            </div>

            <div>
              <h2>
                BajetBN {entitlement.plusActive ? 'Plus' : 'Basic'}
              </h2>

              {entitlement.plusActive
                && profile?.subscriptionExpiresAt
                && (
                  <p>
                    Active until{' '}
                    <strong>
                      {formatExpiry(
                        profile.subscriptionExpiresAt,
                      )}
                    </strong>
                  </p>
                )}

              {noScheduledExpiry && (
                <p>
                  Lifetime Plus access
                </p>
              )}

              {!entitlement.plusActive
                && !entitlement.expired
                && (
                  <p>
                    Your free plan is active.
                  </p>
                )}

              {entitlement.expired && (
                <p>
                  Your previous Plus period has ended.
                  Your information is safe and your account
                  is now using Basic access.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="subscription-current-badge">
          <span>
            {entitlement.plusActive ? 'PLUS' : 'BASIC'}
          </span>
          <small>
            {entitlement.plusActive
              ? 'Premium access'
              : 'Free forever'}
          </small>
        </div>
      </section>

      <section className="subscription-section subscription-comparison">
        <div className="subscription-section-heading">
          <div>
            <span className="eyebrow">
              Compare plans
            </span>

            <h2>
              Basic vs BajetBN Plus
            </h2>

            <p>
              See what is included with Basic and what grows
              when you upgrade to Plus.
            </p>
          </div>

          <div className="subscription-comparison-legend">
            <span className="basic">Basic</span>
            <span className="plus">Plus</span>
          </div>
        </div>

        <div
          className="subscription-comparison-table"
          role="table"
          aria-label="Compare BajetBN Basic and Plus"
        >
          <div
            className="subscription-comparison-header"
            role="row"
          >
            <strong role="columnheader">
              Feature
            </strong>

            <strong
              className="basic"
              role="columnheader"
            >
              Basic
            </strong>

            <strong
              className="plus"
              role="columnheader"
            >
              BajetBN Plus
            </strong>
          </div>

          {[
            ['Household Spaces', '1', 'More Spaces'],
            ['Trip Spaces', '1', 'More Spaces'],
            ['SME Spaces', '1', 'More Spaces'],
            ['SME inventory', '20 items', 'Expanded limits'],
            ['SME customers', '10 customers', 'Expanded limits'],
            ['SME sellers', '3 sellers', 'Expanded limits'],
            ['SME team', 'Owner + 1 member', 'More team members'],
            ['Personal accounts', '2 accounts', 'More accounts'],
            ['Collaboration', 'Basic sharing', 'Expanded collaboration'],
            ['Storage', 'Basic storage', 'More storage'],
            ['Advanced tools', 'Core tools', 'More Plus features'],
          ].map(([feature, basic, plus]) => (
            <div
              className="subscription-comparison-row"
              role="row"
              key={feature}
            >
              <div
                className="subscription-comparison-feature"
                role="cell"
              >
                <strong>{feature}</strong>
              </div>

              <div
                className="subscription-comparison-value basic"
                role="cell"
              >
                <span className="subscription-comparison-check">
                  ✓
                </span>

                <span>{basic}</span>
              </div>

              <div
                className="subscription-comparison-value plus"
                role="cell"
              >
                <span className="subscription-comparison-plus-icon">
                  ✦
                </span>

                <strong>{plus}</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="subscription-comparison-foot">
          <div>
            <strong>
              Basic is free forever.
            </strong>

            <span>
              Ideal for getting started with personal,
              household and small SME budgeting.
            </span>
          </div>

          <div className="plus">
            <strong>
              Plus grows with you.
            </strong>

            <span>
              Best when you need more Spaces, records,
              members, storage and collaboration.
            </span>
          </div>
        </div>
      </section>

      {!noScheduledExpiry && (
        <section className="subscription-section">
          <div className="subscription-section-heading">
            <div>
              <span className="eyebrow">
                BajetBN Plus
              </span>

              <h2>
                {entitlement.plusActive
                  ? 'Extend BajetBN Plus'
                  : 'Choose your Plus plan'}
              </h2>

              <p>
                One-time payment. Choose the period that
                works for you.
              </p>
            </div>

            <div className="subscription-secure-note">
              <span>✓</span>
              Manual payment review
            </div>
          </div>

          <div className="subscription-price-grid">
            {Object.values(
              BAJETBN_PLUS_PRICES,
            ).map((plan) => {
              const selected =
                selectedPlan?.key === plan.key;

              return (
                <article
                  className={
                    selected
                      ? 'subscription-price-card selected'
                      : 'subscription-price-card'
                  }
                  key={plan.key}
                >
                  {plan.months === 12 && (
                    <span className="subscription-popular">
                      BEST VALUE
                    </span>
                  )}

                  <span className="subscription-duration">
                    {plan.label}
                  </span>

                  <div className="subscription-price">
                    <small>BND</small>
                    <strong>
                      {plan.amountBnd.toFixed(2)}
                    </strong>
                  </div>

                  <small className="subscription-price-note">
                    One-time payment
                  </small>

                  <button
                    type="button"
                    className={
                      selected
                        ? 'button primary full'
                        : 'button secondary full'
                    }
                    onClick={() => {
                      setSelectedPlan(plan);
                      setError('');
                      setMessage('');
                    }}
                  >
                    {selected
                      ? '✓ Selected'
                      : entitlement.plusActive
                        ? 'Extend with this plan'
                        : 'Choose this plan'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {selectedPlan && !noScheduledExpiry && (
        <section className="subscription-section subscription-payment-section">
          <div className="subscription-section-heading">
            <div>
              <span className="eyebrow">
                Payment
              </span>

              <h2>
                Pay BND {selectedPlan.amountBnd.toFixed(2)}
              </h2>

              <p>
                Transfer to either BajetBN bank account,
                then upload your payment proof.
              </p>
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setSelectedPlan(null);
                setProofFile(null);
                setMessage('');
                setError('');
              }}
            >
              Change plan
            </button>
          </div>

          <div className="subscription-payment-layout">
            <div className="subscription-bank-column">
              <span className="subscription-step-label">
                1 · Make payment
              </span>

              <div className="subscription-bank-grid">
                {BAJETBN_PAYMENT_ACCOUNTS.map(
                  (account) => (
                    <article
                      className="subscription-bank-card"
                      key={account.accountNumber}
                    >
                      <div className="subscription-bank-logo">
                        {account.bank.charAt(0)}
                      </div>

                      <div>
                        <small>
                          {account.bank}
                        </small>

                        <strong>
                          {account.accountNumber}
                        </strong>

                        <span>
                          BND account
                        </span>
                      </div>
                    </article>
                  ),
                )}
              </div>

              <div className="notice">
                Transfer exactly{' '}
                <strong>
                  BND {selectedPlan.amountBnd.toFixed(2)}
                </strong>
                {' '}using your banking app before uploading
                the receipt or transfer confirmation.
              </div>
            </div>

            <div className="subscription-proof-column">
              <span className="subscription-step-label">
                2 · Upload proof
              </span>

              <label className="subscription-upload">
                <span className="subscription-upload-icon">
                  +
                </span>

                <strong>
                  {proofFile
                    ? proofFile.name
                    : '+ Upload payment proof'}
                </strong>

                <small>
                  JPG, PNG or PDF · Maximum 10 MB
                </small>

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busy}
                  onChange={(event) =>
                    setProofFile(
                      event.target.files?.[0]
                      || null,
                    )
                  }
                />
              </label>

              <button
                type="button"
                className="button primary full"
                disabled={
                  busy
                  || !proofFile
                }
                onClick={() =>
                  void uploadProof()
                }
              >
                {busy
                  ? 'Uploading payment proof…'
                  : 'Upload payment proof'}
              </button>
            </div>
          </div>

          {message && (
            <div className="notice success">
              {message}
            </div>
          )}

          {error && (
            <div className="notice error">
              {error}
            </div>
          )}
        </section>
      )}

      {latestPending && (
        <section className="subscription-section subscription-pending">
          <div className="subscription-pending-icon">
            ✓
          </div>

          <div className="subscription-pending-copy">
            <span className="eyebrow">
              Payment submitted
            </span>

            <h2>
              Pending admin review
            </h2>

            <p>
              Your payment proof has been uploaded.
              Send the reference through WhatsApp so
              BajetBN can review it.
            </p>

            <div className="subscription-request-summary">
              <span>
                <small>Plan</small>
                <strong>
                  {latestPending.planLabel}
                </strong>
              </span>

              <span>
                <small>Amount</small>
                <strong>
                  BND {(latestPending.amountMinor / 100).toFixed(2)}
                </strong>
              </span>

              <span>
                <small>Reference</small>
                <strong>
                  {latestPending.reference}
                </strong>
              </span>
            </div>
          </div>

          <div className="subscription-pending-action">
            <button
              type="button"
              className="button primary"
              onClick={() =>
                openProofWhatsApp(
                  latestPending,
                )
              }
            >
              Send proof/reference via WhatsApp
            </button>

            <small>
              Opens WhatsApp to +673 717 3791
            </small>
          </div>
        </section>
      )}

      {requests.length > 0 && (
        <section className="subscription-section">
          <div className="subscription-section-heading">
            <div>
              <span className="eyebrow">
                History
              </span>

              <h2>
                Plus payment requests
              </h2>
            </div>
          </div>

          <div className="subscription-history-list">
            {requests.map((request) => (
              <article
                className="subscription-history-row"
                key={request.id}
              >
                <div>
                  <strong>
                    {request.planLabel}
                  </strong>

                  <small>
                    {request.reference}
                  </small>
                </div>

                <strong>
                  BND {(request.amountMinor / 100).toFixed(2)}
                </strong>

                <span
                  className={`subscription-status ${request.status}`}
                >
                  {requestStatus(
                    request.status,
                  )}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
