import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { PageHeader } from '../components/PageHeader';
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
      | 'cancel',
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
    <div className="page-stack">
      <PageHeader
        eyebrow="BajetBN Platform Admin"
        title="Admin Portal"
        description="Manage BajetBN users and subscriptions."
      />

      <section className="card stack">
        <span className="eyebrow">
          Administrator
        </span>

        <h2>
          {profile?.email
            || 'Platform administrator'}
        </h2>

        <p>
          Subscription administrator:{' '}
          <strong>
            {BAJETBN_SUBSCRIPTION_ADMIN_EMAIL}
          </strong>
        </p>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading
            ? 'Refreshing…'
            : 'Refresh users'}
        </button>
      </section>

      <section className="card stack">
        <span className="eyebrow">
          Subscription overview
        </span>

        <h2>
          {plusCount} Plus · {basicCount} Basic
        </h2>

        <p>
          {users.length} total BajetBN users.
        </p>

        <p>
          When Plus expires, effective access returns
          to Basic automatically. Existing user data
          remains preserved.
        </p>

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

      <section className="card stack">
        <span className="eyebrow">
          Users
        </span>

        <h2>Subscriptions</h2>

        {loading && users.length === 0 ? (
          <p>Loading users…</p>
        ) : users.length === 0 ? (
          <p>No BajetBN users found.</p>
        ) : (
          <div className="stack">
            {users.map((user) => {
              const busy =
                busyUid === user.uid;

              const confirmingCancel =
                cancelUid === user.uid;

              return (
                <article
                  className="card stack"
                  key={user.uid}
                >
                  <div>
                    <strong>
                      {user.fullName
                        || user.email
                        || 'BajetBN user'}
                    </strong>

                    <p className="muted">
                      {user.email}
                    </p>
                  </div>

                  <p>
                    Plan:{' '}
                    <strong>
                      {user.effectivePlan
                        === 'plus'
                        ? 'BajetBN Plus'
                        : 'BajetBN Basic'}
                    </strong>
                  </p>

                  <p>
                    Status:{' '}
                    {user.subscriptionStatus}
                  </p>

                  <p>
                    Expires:{' '}
                    {displayDate(
                      user.subscriptionExpiresAt,
                    )}
                  </p>

                  {user.platformRole
                    === 'platform_admin' && (
                    <p>
                      Platform administrator
                    </p>
                  )}

                  {user.effectivePlan === 'plus' ? (
                    <div className="inline-actions">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeSubscription(
                            user.uid,
                            'extend',
                            1,
                          )
                        }
                      >
                        +1 month
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeSubscription(
                            user.uid,
                            'extend',
                            3,
                          )
                        }
                      >
                        +3 months
                      </button>

                      {!confirmingCancel ? (
                        <button
                          type="button"
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
                            disabled={busy}
                            onClick={() =>
                              setCancelUid(null)
                            }
                          >
                            Keep Plus
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="inline-actions">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeSubscription(
                            user.uid,
                            'activate',
                            1,
                          )
                        }
                      >
                        Plus 1 month
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeSubscription(
                            user.uid,
                            'activate',
                            3,
                          )
                        }
                      >
                        Plus 3 months
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void changeSubscription(
                            user.uid,
                            'activate',
                            12,
                          )
                        }
                      >
                        Plus 1 year
                      </button>

                      <button
                        type="button"
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
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card stack">
        <span className="eyebrow">
          BajetBN Basic
        </span>

        <h2>Default limits</h2>

        <ul>
          <li>1 Household Space</li>
          <li>1 Trip Space</li>
          <li>1 SME Space</li>

          <li>
            {BASIC_PLAN_LIMITS.smeInventoryItems}
            {' '}SME inventory items
          </li>

          <li>
            {BASIC_PLAN_LIMITS.smeCustomers}
            {' '}SME customers
          </li>

          <li>
            {BASIC_PLAN_LIMITS.smeSellers}
            {' '}SME sellers
          </li>

          <li>
            Owner +{' '}
            {BASIC_PLAN_LIMITS.smeAdditionalMembers}
            {' '}additional SME member
          </li>
        </ul>
      </section>

      <section className="card stack">
        <span className="eyebrow">
          Audit
        </span>

        <h2>Recent subscription changes</h2>

        {audit.length === 0 ? (
          <p>No subscription changes yet.</p>
        ) : (
          <ul>
            {audit.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {entry.targetEmail
                    || entry.targetUid}
                </strong>
                {' — '}
                {entry.action}
                {' — '}
                {displayDate(entry.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
