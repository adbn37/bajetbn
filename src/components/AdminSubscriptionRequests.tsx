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
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function displayDate(
  value: string | null,
): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Brunei',
    },
  ).format(date);
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

  const [showHistory, setShowHistory] =
    useState(false);

  const [historySearch, setHistorySearch] =
    useState('');

  const [notes, setNotes] =
    useState<Record<string, string>>({});

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

          return (
            new Date(
              b.reviewedAt
              || b.submittedAt
              || b.createdAt
              || 0,
            ).getTime()
            - new Date(
              a.reviewedAt
              || a.submittedAt
              || a.createdAt
              || 0,
            ).getTime()
          );
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

  useEffect(() => {
    if (
      targetId
      && requests.some(
        (request) =>
          request.id === targetId
          && (
            request.status === 'approved'
            || request.status === 'rejected'
          ),
      )
    ) {
      setShowHistory(true);
    }
  }, [requests, targetId]);

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
      const note =
        notes[request.id]?.trim();

      await reviewSubscriptionRequest({
        requestId: request.id,
        decision,
        note: note || undefined,
      });

      setMessage(
        decision === 'approve'
          ? request.email
            + ' approved for '
            + request.planLabel
            + '. Moved to payment history.'
          : request.email
            + ' payment request rejected. Moved to payment history.',
      );

      setNotes((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });

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

  const activeRequests =
    requests.filter(
      (request) =>
        request.status === 'pending_review',
    );

  const archivedRequests =
    requests.filter(
      (request) =>
        request.status === 'approved'
        || request.status === 'rejected',
    );

  const filteredHistory =
    useMemo(() => {
      const query =
        historySearch
          .trim()
          .toLowerCase();

      if (!query) {
        return archivedRequests;
      }

      return archivedRequests.filter(
        (request) =>
          [
            request.fullName,
            request.email,
            request.reference,
            request.planLabel,
            request.status,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query),
          ),
      );
    }, [archivedRequests, historySearch]);

  return (
    <section className="panel admin-payment-review">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">
            Plus payment review
          </span>

          <h2>
            Payment proof requests
          </h2>

          <p>
            Only payment requests that still need
            admin action appear in this queue.
          </p>
        </div>

        <span className="admin-record-count">
          {activeRequests.length} pending
        </span>
      </div>

      <button
        className="button secondary"
        type="button"
        disabled={loading}
        onClick={() => void load()}
      >
        {loading
          ? 'Refreshing...'
          : 'Refresh requests'}
      </button>

      {message && (
        <div
          className="notice success"
          role="status"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="notice error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading
        && activeRequests.length === 0
        && (
          <div className="admin-empty-state">
            No payment proofs are waiting for review.
          </div>
        )}

      <div className="admin-payment-queue">
        {activeRequests.map((request) => (
          <article
            className="admin-payment-request-card pending"
            key={request.id}
          >
            <div className="admin-payment-request-head">
              <div>
                <strong>
                  {request.fullName
                    || request.email}
                </strong>

                <small>
                  {request.email}
                </small>
              </div>

              <span className="admin-plan-badge plus">
                PENDING
              </span>
            </div>

            <div className="admin-payment-meta">
              <span>
                <small>Plan</small>
                <strong>
                  {request.planLabel}
                </strong>
              </span>

              <span>
                <small>Amount</small>
                <strong>
                  BND {(request.amountMinor / 100).toFixed(2)}
                </strong>
              </span>

              <span>
                <small>Reference</small>
                <strong>
                  {request.reference}
                </strong>
              </span>

              <span>
                <small>Submitted</small>
                <strong>
                  {displayDate(
                    request.submittedAt,
                  )}
                </strong>
              </span>
            </div>

            {request.proofPath && (
              <button
                className="button secondary"
                type="button"
                disabled={busyId === request.id}
                onClick={() =>
                  void openProof(request)
                }
              >
                View payment proof
              </button>
            )}

            <label className="admin-review-note">
              <span>
                Review note / rejection reason
              </span>

              <input
                type="text"
                placeholder="Optional note"
                value={notes[request.id] || ''}
                disabled={busyId === request.id}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [request.id]:
                      event.target.value,
                  }))
                }
              />
            </label>

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
          </article>
        ))}
      </div>

      <div className="admin-payment-history-section">
        <button
          type="button"
          className="admin-history-toggle"
          onClick={() =>
            setShowHistory(
              (current) => !current,
            )
          }
        >
          <span>
            Payment history
          </span>

          <strong>
            {archivedRequests.length}
          </strong>

          <span>
            {showHistory ? 'Hide' : 'Show'}
          </span>
        </button>

        {showHistory && (
          <div className="admin-payment-history">
            <label className="admin-history-search">
              <span>Search history</span>

              <input
                type="search"
                value={historySearch}
                placeholder="Customer, reference, plan..."
                onChange={(event) =>
                  setHistorySearch(
                    event.target.value,
                  )
                }
              />
            </label>

            {filteredHistory.length === 0 ? (
              <div className="admin-empty-state">
                No reviewed payment requests found.
              </div>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-payment-history-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Decision</th>
                      <th>Reviewed</th>
                      <th>Proof</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredHistory.map(
                      (request) => (
                        <tr key={request.id}>
                          <td>
                            <strong>
                              {request.fullName
                                || request.email}
                            </strong>

                            <small>
                              {request.email}
                            </small>
                          </td>

                          <td>
                            {request.planLabel}
                          </td>

                          <td>
                            BND {(request.amountMinor / 100).toFixed(2)}
                          </td>

                          <td>
                            {request.reference}
                          </td>

                          <td>
                            <span
                              className={
                                request.status
                                  === 'approved'
                                  ? 'admin-history-status approved'
                                  : 'admin-history-status rejected'
                              }
                            >
                              {statusLabel(
                                request.status,
                              )}
                            </span>

                            {request.reviewNote && (
                              <small>
                                {request.reviewNote}
                              </small>
                            )}
                          </td>

                          <td>
                            {displayDate(
                              request.reviewedAt,
                            )}
                          </td>

                          <td>
                            {request.proofPath ? (
                              <button
                                type="button"
                                className="button secondary compact"
                                onClick={() =>
                                  void openProof(
                                    request,
                                  )
                                }
                              >
                                View
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
