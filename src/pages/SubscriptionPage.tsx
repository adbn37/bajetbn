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

  const message = [
    'Hi BajetBN, I have uploaded my BajetBN Plus payment proof.',
    '',
    `Account: ${request.email}`,
    `Plan: ${request.planLabel}`,
    `Amount: BND ${(request.amountMinor / 100).toFixed(2)}`,
    `Reference: ${request.reference}`,
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
        `Payment proof uploaded. Reference: ${submitted.reference}. Send it to BajetBN via WhatsApp for review.`,
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
    <div className="page-stack">
      <PageHeader
        eyebrow="BajetBN"
        title="Subscription"
        description="BajetBN Basic stays free forever. Plus increases your limits and unlocks additional collaboration, SME, storage and advanced features."
      />

      <section className="card stack">
        <span className="eyebrow">
          Current plan
        </span>

        <h2>
          {entitlement.plusActive
            ? 'BajetBN Plus'
            : 'BajetBN Basic'}
        </h2>

        {entitlement.plusActive
          && profile?.subscriptionExpiresAt
          && (
            <p>
              Plus expires:{' '}
              <strong>
                {formatExpiry(
                  profile.subscriptionExpiresAt,
                )}
              </strong>
            </p>
          )}

        {noScheduledExpiry && (
          <p>
            Your BajetBN Plus access is active.
          </p>
        )}

        {entitlement.expired && (
          <p>
            Your previous Plus period has ended.
            Existing information remains safe and
            your account is using Basic access.
          </p>
        )}
      </section>

      <section className="card stack">
        <span className="eyebrow">
          Free forever
        </span>

        <h2>BajetBN Basic</h2>

        <ul>
          {BAJETBN_BASIC_SPACE_SUMMARY.map(
            (item) => (
              <li key={item}>
                {item}
              </li>
            ),
          )}

          <li>Basic SME POS</li>
          <li>Up to 20 SME inventory items</li>
          <li>Up to 10 SME customers</li>
          <li>Up to 3 SME sellers</li>
          <li>Owner + 1 additional SME member</li>
          <li>Up to 2 personal accounts</li>
        </ul>
      </section>

      {!noScheduledExpiry && (
        <section className="card stack">
          <span className="eyebrow">
            BajetBN Plus
          </span>

          <h2>
            {entitlement.plusActive
              ? 'Extend BajetBN Plus'
              : 'Choose your Plus plan'}
          </h2>

          <p>
            Choose your plan first. Then make a
            bank transfer and upload the payment proof.
          </p>

          <div className="stack">
            {Object.values(
              BAJETBN_PLUS_PRICES,
            ).map((plan) => (
              <article
                className="card stack"
                key={plan.key}
              >
                <strong>
                  {plan.label}
                </strong>

                <h3>
                  BND {plan.amountBnd.toFixed(2)}
                </h3>

                <button
                  type="button"
                  className={
                    selectedPlan?.key === plan.key
                      ? 'primary'
                      : ''
                  }
                  onClick={() => {
                    setSelectedPlan(plan);
                    setError('');
                    setMessage('');
                  }}
                >
                  {selectedPlan?.key === plan.key
                    ? 'Selected'
                    : entitlement.plusActive
                      ? 'Extend with this plan'
                      : 'Choose this plan'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedPlan && !noScheduledExpiry && (
        <section className="card stack">
          <span className="eyebrow">
            Bank transfer
          </span>

          <h2>
            Pay BND {selectedPlan.amountBnd.toFixed(2)}
          </h2>

          <p>
            Make payment to either account:
          </p>

          {BAJETBN_PAYMENT_ACCOUNTS.map(
            (account) => (
              <article
                className="card"
                key={account.accountNumber}
              >
                <strong>
                  {account.bank}
                </strong>

                <p>
                  Account number:{' '}
                  <strong>
                    {account.accountNumber}
                  </strong>
                </p>
              </article>
            ),
          )}

          <label>
            Upload payment proof
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

          <small className="muted">
            Image or PDF. Maximum 10 MB.
          </small>

          <button
            type="button"
            className="primary"
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

          {message && (
            <p role="status">
              {message}
            </p>
          )}

          {error && (
            <p role="alert">
              {error}
            </p>
          )}
        </section>
      )}

      {latestPending && (
        <section className="card stack">
          <span className="eyebrow">
            Payment submitted
          </span>

          <h2>
            Pending admin review
          </h2>

          <p>
            Plan:{' '}
            <strong>
              {latestPending.planLabel}
            </strong>
          </p>

          <p>
            Amount:{' '}
            <strong>
              BND {(latestPending.amountMinor / 100).toFixed(2)}
            </strong>
          </p>

          <p>
            Reference:{' '}
            <strong>
              {latestPending.reference}
            </strong>
          </p>

          <button
            type="button"
            className="primary"
            onClick={() =>
              openProofWhatsApp(
                latestPending,
              )
            }
          >
            Send proof/reference via WhatsApp
          </button>

          <small className="muted">
            Opens WhatsApp to +673 717 3791
            with your payment reference and secure
            BajetBN admin-review link.
          </small>
        </section>
      )}

      {requests.length > 0 && (
        <section className="card stack">
          <span className="eyebrow">
            Request history
          </span>

          <h2>
            Plus payment requests
          </h2>

          {requests.map((request) => (
            <article
              className="card"
              key={request.id}
            >
              <strong>
                {request.planLabel}
              </strong>

              <p>
                BND {(request.amountMinor / 100).toFixed(2)}
              </p>

              <p>
                {requestStatus(
                  request.status,
                )}
              </p>

              <small>
                {request.reference}
              </small>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
