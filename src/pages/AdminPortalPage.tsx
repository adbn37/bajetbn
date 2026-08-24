import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { PageHeader } from '../components/PageHeader';
import { AdminSubscriptionRequests } from '../components/AdminSubscriptionRequests';
import {
  BAJETBN_SUBSCRIPTION_ADMIN_EMAIL,
} from '../config/subscription';
import { useAuth } from '../contexts/AuthContext';
import {
  listAdminSubscriptionAudit,
  listAdminSubscriptions,
  updateAdminSubscription,
  type AdminSubscriptionAudit,
  type AdminSubscriptionUser,
} from '../repositories/adminSubscriptionRepository';
import {
  BASIC_PLAN_LIMITS,
} from '../services/entitlements';
import { getErrorMessage } from '../utils/errors';

function displayDate(
  value: string | null,
): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      dateStyle: 'medium',
      timeZone: 'Asia/Brunei',
    },
  ).format(date);
}

export function AdminPortalPage() {
  const { profile } = useAuth();

  const [users, setUsers] = useState<
    AdminSubscriptionUser[]
  >([]);

  const [audit, setAudit] = useState<
    AdminSubscriptionAudit[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [busyUid, setBusyUid] =
    useState<string | null>(null);

  const [cancelUid, setCancelUid] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [nextUsers, nextAudit] =
        await Promise.all([
          listAdminSubscriptions(),
          listAdminSubscriptionAudit(),
        ]);

      setUsers(nextUsers);
      setAudit(nextAudit);
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeSubscription(
    uid: string,
    action:
      | 'activate'
      | 'extend'
      | 'cancel'
      | 'lifetime',
    months?: 1 | 3 | 6 | 12,
    source:
      | 'whatsapp_manual'
      | 'complimentary'
      | 'internal'
      = 'whatsapp_manual',
  ) {
    setBusyUid(uid);
    setCancelUid(null);
    setError('');
    setMessage('');

    try {
      await updateAdminSubscription({
        uid,
        action,
        months,
        source,
      });

      setMessage(
        action === 'cancel'
          ? 'Subscription cancelled. The user now has Basic access.'
          : action === 'lifetime'
            ? 'Lifetime BajetBN Plus granted.'
            : action === 'extend'
              ? 'Subscription extended.'
              : source === 'complimentary'
                ? 'Complimentary BajetBN Plus activated.'
                : 'BajetBN Plus activated.',
      );

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusyUid(null);
    }
  }

  const plusCount =
    users.filter(
      (user) =>
        user.effectivePlan === 'plus',
    ).length;

  const basicCount =
    users.length - plusCount;

  return (
    <div className="admin-portal-page">
      <PageHeader
        eyebrow="BajetBN Platform Admin"
        title="Admin Portal"
        description="Manage BajetBN users, Plus access and payment reviews."
      />

      <section className="admin-overview-grid">
        <article className="panel admin-summary-card admin-summary-admin">
          <span className="eyebrow">
            Administrator
          </span>

          <div className="admin-summary-heading">
            <div className="admin-summary-icon">
              A
            </div>

            <div>
              <h2>
                {profile?.email
                  || 'Platform administrator'}
              </h2>

              <p>
                Subscription administrator
              </p>

              <strong>
                {BAJETBN_SUBSCRIPTION_ADMIN_EMAIL}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="button secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading
              ? 'Refreshing...'
              : 'Refresh data'}
          </button>
        </article>

        <article className="panel admin-summary-card">
          <span className="eyebrow">
            BajetBN Plus
          </span>

          <strong className="admin-stat-number">
            {plusCount}
          </strong>

          <span className="admin-stat-label">
            Plus users
          </span>
        </article>

        <article className="panel admin-summary-card">
          <span className="eyebrow">
            BajetBN Basic
          </span>

          <strong className="admin-stat-number">
            {basicCount}
          </strong>

          <span className="admin-stat-label">
            Basic users
          </span>
        </article>

        <article className="panel admin-summary-card">
          <span className="eyebrow">
            Total users
          </span>

          <strong className="admin-stat-number">
            {users.length}
          </strong>

          <span className="admin-stat-label">
            BajetBN accounts
          </span>
        </article>
      </section>

      <div className="admin-plan-note">
        <span>i</span>

        <p>
          When Plus expires, access automatically returns
          to Basic. Existing user data remains preserved.
        </p>
      </div>

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

      <section className="panel admin-users-panel">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">
              Users
            </span>

            <h2>
              Subscriptions
            </h2>

            <p>
              Review each user's current plan and manage
              BajetBN Plus access.
            </p>
          </div>

          <span className="admin-record-count">
            {users.length} users
          </span>
        </div>

        {loading && users.length === 0 ? (
          <div className="admin-empty-state">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            No BajetBN users found.
          </div>
        ) : (
          <div className="admin-user-grid">
            {users.map((user) => {
              const busy =
                busyUid === user.uid;

              const confirmingCancel =
                cancelUid === user.uid;

              const isPlus =
                user.effectivePlan === 'plus';

              const isLifetime =
                isPlus
                && !user.subscriptionExpiresAt;

              return (
                <article
                  className={
                    isPlus
                      ? 'admin-user-card plus'
                      : 'admin-user-card'
                  }
                  key={user.uid}
                >
                  <div className="admin-user-card-header">
                    <div>
                      <strong className="admin-user-name">
                        {user.fullName
                          || user.email
                          || 'BajetBN user'}
                      </strong>

                      <span className="admin-user-email">
                        {user.email}
                      </span>
                    </div>

                    <span
                      className={
                        isPlus
                          ? 'admin-plan-badge plus'
                          : 'admin-plan-badge'
                      }
                    >
                      {isPlus
                        ? 'PLUS'
                        : 'BASIC'}
                    </span>
                  </div>

                  <div className="admin-user-meta-grid">
                    <div>
                      <small>
                        Status
                      </small>

                      <strong>
                        {user.subscriptionStatus}
                      </strong>
                    </div>

                    <div>
                      <small>
                        Expires
                      </small>

                      <strong>
                        {isLifetime
                          ? 'Lifetime'
                          : displayDate(
                              user.subscriptionExpiresAt,
                            )}
                      </strong>
                    </div>
                  </div>

                  {user.platformRole === 'platform_admin' && (
                    <div className="admin-role-badge">
                      Platform administrator
                    </div>
                  )}

                  <div className="admin-user-actions">
                    {!isLifetime && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          void changeSubscription(
                            user.uid,
                            'lifetime',
                            undefined,
                            'internal',
                          )
                        }
                      >
                        Grant Lifetime
                      </button>
                    )}

                    {isLifetime && (
                      <div className="admin-lifetime-badge">
                        Lifetime Plus active
                      </div>
                    )}

                    {isPlus ? (
                      <>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'extend',
                              1,
                            )
                          }
                        >
                          Extend 1 month
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'extend',
                              3,
                            )
                          }
                        >
                          Extend 3 months
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'extend',
                              12,
                            )
                          }
                        >
                          Extend 1 year
                        </button>

                        {!confirmingCancel ? (
                          <button
                            type="button"
                            className="button danger-outline"
                            disabled={busy}
                            onClick={() =>
                              setCancelUid(user.uid)
                            }
                          >
                            Cancel Plus
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="button danger-outline"
                              disabled={busy}
                              onClick={() =>
                                void changeSubscription(
                                  user.uid,
                                  'cancel',
                                )
                              }
                            >
                              Confirm cancellation
                            </button>

                            <button
                              type="button"
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                setCancelUid(null)
                              }
                            >
                              Keep Plus
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'activate',
                              1,
                            )
                          }
                        >
                          Activate 1 month
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'activate',
                              3,
                            )
                          }
                        >
                          Activate 3 months
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'activate',
                              12,
                            )
                          }
                        >
                          Activate 1 year
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              user.uid,
                              'activate',
                              1,
                              'complimentary',
                            )
                          }
                        >
                          Complimentary 1 month
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AdminSubscriptionRequests
        onChanged={load}
      />

      <div className="admin-bottom-grid">
        <section className="panel admin-limits-panel">
          <span className="eyebrow">
            BajetBN Basic
          </span>

          <h2>
            Default limits
          </h2>

          <div className="admin-limit-grid">
            <div>
              <span>Household Spaces</span>
              <strong>1</strong>
            </div>

            <div>
              <span>Trip Spaces</span>
              <strong>1</strong>
            </div>

            <div>
              <span>SME Spaces</span>
              <strong>1</strong>
            </div>

            <div>
              <span>Inventory items</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeInventoryItems}
              </strong>
            </div>

            <div>
              <span>SME customers</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeCustomers}
              </strong>
            </div>

            <div>
              <span>SME sellers</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeSellers}
              </strong>
            </div>

            <div>
              <span>Extra SME member</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeAdditionalMembers}
              </strong>
            </div>
          </div>
        </section>

        <section className="panel admin-audit-panel">
          <span className="eyebrow">
            Audit
          </span>

          <h2>
            Recent subscription changes
          </h2>

          {audit.length === 0 ? (
            <div className="admin-empty-state">
              No subscription changes yet.
            </div>
          ) : (
            <div className="admin-audit-list">
              {audit.map((entry) => (
                <div
                  className="admin-audit-row"
                  key={entry.id}
                >
                  <div>
                    <strong>
                      {entry.targetEmail
                        || entry.targetUid}
                    </strong>

                    <span>
                      {entry.action}
                    </span>
                  </div>

                  <time>
                    {displayDate(entry.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
