import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getSubscriptionProofUrl,
  listAdminSubscriptionRequests,
  reviewSubscriptionRequest,
  type SubscriptionRequest,
} from '../repositories/subscriptionRequestRepository';
import {
  getErrorMessage,
} from '../utils/errors';

interface Props {
  onChanged: () => Promise<void>;
}

function statusLabel(
  status: SubscriptionRequest['status'],
): string {
  return status.replaceAll('_', ' ');
}

export function AdminSubscriptionRequests({
  onChanged,
}: Props) {
  const [requests, setRequests] =
    useState<SubscriptionRequest[]>([]);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const targetId =
    useMemo(
      () =>
        new URLSearchParams(
          window.location.search,
        ).get('subscriptionRequest'),
      [],
    );

  async function load() {
    setLoading(true);
    setError('');

    try {
      const items =
        await listAdminSubscriptionRequests();

      setRequests(
        [...items].sort((a, b) => {
          if (a.id === targetId) return -1;
          if (b.id === targetId) return 1;

          if (
            a.status === 'pending_review'
            && b.status !== 'pending_review'
          ) {
            return -1;
          }

          if (
            b.status === 'pending_review'
            && a.status !== 'pending_review'
          ) {
            return 1;
          }

          return 0;
        }),
      );
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openProof(
    request: SubscriptionRequest,
  ) {
    if (!request.proofPath) return;

    try {
      const url =
        await getSubscriptionProofUrl(
          request.proofPath,
        );

      window.open(
        url,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    }
  }

  async function decide(
    request: SubscriptionRequest,
    decision: 'approve' | 'reject',
  ) {
    setBusyId(request.id);
    setError('');
    setMessage('');

    try {
      await reviewSubscriptionRequest({
        requestId: request.id,
        decision,
      });

      setMessage(
        decision === 'approve'
          ? `${request.email} approved for ${request.planLabel}.`
          : `${request.email} payment request rejected.`,
      );

      await Promise.all([
        load(),
        onChanged(),
      ]);
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel admin-subscription-requests admin-payment-review">
      <span className="eyebrow">
        Plus payment review
      </span>

      <div className="admin-section-heading">
        <div>
          <h2>
            Payment proof requests
          </h2>

          <p>
            Review customer Plus payments before activating access.
          </p>
        </div>
      </div>

      <button className="button secondary" type="button" disabled={loading}
        onClick={() => void load()}
      >
        {loading
          ? 'Refreshing…'
          : 'Refresh requests'}
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

      {!loading && requests.length === 0 && (
        <p>
          No subscription payment requests yet.
        </p>
      )}

      <div className="admin-subscription-request-list">
        {requests.map((request) => (
          <article
            className="admin-payment-request-card"
            key={request.id}
          >
            <div>
              <strong>
                {request.fullName
                  || request.email}
              </strong>

              <p className="muted">
                {request.email}
              </p>
            </div>

            <p>
              Plan:{' '}
              <strong>
                {request.planLabel}
              </strong>
            </p>

            <p>
              Amount:{' '}
              <strong>
                BND {(request.amountMinor / 100).toFixed(2)}
              </strong>
            </p>

            <p>
              Reference:{' '}
              <strong>
                {request.reference}
              </strong>
            </p>

            <p>
              Status:{' '}
              <strong>
                {statusLabel(
                  request.status,
                )}
              </strong>
            </p>

            {request.proofPath && (
              <button className="button secondary" type="button" disabled={busyId === request.id} onClick={() => void openProof(request)}
              >
                View payment proof
              </button>
            )}

            {request.status
              === 'pending_review' && (
              <div className="admin-review-actions">
                <button
                  type="button"
                  className="button primary"
                  disabled={busyId === request.id}
                  onClick={() =>
                    void decide(
                      request,
                      'approve',
                    )
                  }
                >
                  Approve Plus
                </button>

                <button
                  type="button"
                  className="button danger-outline"
                  disabled={busyId === request.id}
                  onClick={() =>
                    void decide(
                      request,
                      'reject',
                    )
                  }
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
