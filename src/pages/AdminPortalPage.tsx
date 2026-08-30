import {
  useCallback,
  useEffect,
  useMemo,
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

type UserFilter =
  | 'all'
  | 'basic'
  | 'plus'
  | 'cancelled';

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
      timeZone: 'Asia/Brunei',
    },
  ).format(date);
}

function displaySource(
  value: string | null,
): string {
  if (!value) return '-';

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export function AdminPortalPage() {
  const { profile } = useAuth();

  const [users, setUsers] =
    useState<AdminSubscriptionUser[]>([]);

  const [audit, setAudit] =
    useState<AdminSubscriptionAudit[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busyUid, setBusyUid] =
    useState<string | null>(null);

  const [cancelUid, setCancelUid] =
    useState<string | null>(null);

  const [manageUid, setManageUid] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<UserFilter>('all');

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(25);

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

  useEffect(() => {
    setPage(1);
  }, [search, filter, pageSize]);

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

  const filteredUsers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return [...users]
        .filter((user) => {
          if (
            filter === 'basic'
            && user.effectivePlan !== 'basic'
          ) {
            return false;
          }

          if (
            filter === 'plus'
            && user.effectivePlan !== 'plus'
          ) {
            return false;
          }

          if (
            filter === 'cancelled'
            && user.subscriptionStatus
              .toLowerCase() !== 'cancelled'
          ) {
            return false;
          }

          if (!query) return true;

          return [
            user.fullName,
            user.email,
            user.subscriptionStatus,
            user.subscriptionSource || '',
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query),
          );
        })
        .sort((a, b) =>
          (
            a.fullName
            || a.email
          ).localeCompare(
            b.fullName
            || b.email,
          ),
        );
    }, [users, search, filter]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredUsers.length / pageSize,
      ),
    );

  const safePage =
    Math.min(page, totalPages);

  const visibleUsers =
    filteredUsers.slice(
      (safePage - 1) * pageSize,
      safePage * pageSize,
    );

  const managedUser =
    users.find(
      (user) =>
        user.uid === manageUid,
    ) || null;

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
          Plus access updates automatically after approval.
          When a paid period expires, the customer returns
          to Basic automatically while their data remains safe.
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
              Compact customer management for larger
              BajetBN user lists.
            </p>
          </div>

          <span className="admin-record-count">
            {filteredUsers.length} shown
          </span>
        </div>

        <div className="admin-user-toolbar">
          <label className="admin-search-box">
            <span>Search</span>

            <input
              type="search"
              value={search}
              placeholder="Name, email, status..."
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label>
            <span>Plan</span>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as UserFilter,
                )
              }
            >
              <option value="all">
                All users
              </option>

              <option value="basic">
                Basic
              </option>

              <option value="plus">
                Plus
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </label>

          <label>
            <span>Rows</span>

            <select
              value={pageSize}
              onChange={(event) =>
                setPageSize(
                  Number(event.target.value),
                )
              }
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        {loading && users.length === 0 ? (
          <div className="admin-empty-state">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-empty-state">
            No users match this search or filter.
          </div>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-subscription-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th>Source</th>
                    <th>Role</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {visibleUsers.map((user) => {
                    const isPlus =
                      user.effectivePlan === 'plus';

                    const isLifetime =
                      isPlus
                      && !user.subscriptionExpiresAt;

                    return (
                      <tr
                        key={user.uid}
                        className={
                          manageUid === user.uid
                            ? 'selected'
                            : undefined
                        }
                      >
                        <td>
                          <strong>
                            {user.fullName
                              || user.email
                              || 'BajetBN user'}
                          </strong>

                          <small>
                            {user.email}
                          </small>
                        </td>

                        <td>
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
                        </td>

                        <td>
                          {user.subscriptionStatus}
                        </td>

                        <td>
                          {isLifetime
                            ? 'Lifetime'
                            : displayDate(
                                user.subscriptionExpiresAt,
                              )}
                        </td>

                        <td>
                          {displaySource(
                            user.subscriptionSource,
                          )}
                        </td>

                        <td>
                          {user.platformRole
                            === 'platform_admin'
                            ? 'Admin'
                            : 'User'}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="button secondary compact"
                            onClick={() =>
                              setManageUid(
                                manageUid === user.uid
                                  ? null
                                  : user.uid,
                              )
                            }
                          >
                            {manageUid === user.uid
                              ? 'Close'
                              : 'Manage'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>
                Page {safePage} of {totalPages}
              </span>

              <div>
                <button
                  type="button"
                  className="button secondary compact"
                  disabled={safePage <= 1}
                  onClick={() =>
                    setPage(
                      Math.max(1, safePage - 1),
                    )
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="button secondary compact"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage(
                      Math.min(
                        totalPages,
                        safePage + 1,
                      ),
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {managedUser && (() => {
          const busy =
            busyUid === managedUser.uid;

          const isPlus =
            managedUser.effectivePlan === 'plus';

          const isLifetime =
            isPlus
            && !managedUser.subscriptionExpiresAt;

          const confirmingCancel =
            cancelUid === managedUser.uid;

          return (
            <div className="admin-manage-panel">
              <div className="admin-manage-heading">
                <div>
                  <span className="eyebrow">
                    Manage subscription
                  </span>

                  <h3>
                    {managedUser.fullName
                      || managedUser.email}
                  </h3>

                  <p>
                    {managedUser.email}
                  </p>
                </div>

                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() =>
                    setManageUid(null)
                  }
                >
                  Close
                </button>
              </div>

              <div className="admin-manage-summary">
                <span>
                  <small>Plan</small>
                  <strong>
                    {isPlus
                      ? 'BajetBN Plus'
                      : 'BajetBN Basic'}
                  </strong>
                </span>

                <span>
                  <small>Status</small>
                  <strong>
                    {managedUser.subscriptionStatus}
                  </strong>
                </span>

                <span>
                  <small>Expires</small>
                  <strong>
                    {isLifetime
                      ? 'Lifetime'
                      : displayDate(
                          managedUser.subscriptionExpiresAt,
                        )}
                  </strong>
                </span>

                <span>
                  <small>Source</small>
                  <strong>
                    {displaySource(
                      managedUser.subscriptionSource,
                    )}
                  </strong>
                </span>
              </div>

              <div className="admin-manage-actions">
                {!isLifetime && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void changeSubscription(
                        managedUser.uid,
                        'lifetime',
                        undefined,
                        'internal',
                      )
                    }
                  >
                    Grant Lifetime
                  </button>
                )}

                {isPlus ? (
                  <>
                    {([1, 3, 6, 12] as const)
                      .map((months) => (
                        <button
                          key={months}
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              managedUser.uid,
                              'extend',
                              months,
                            )
                          }
                        >
                          Extend {months === 12
                            ? '1 year'
                            : months + ' month'
                              + (months > 1 ? 's' : '')}
                        </button>
                      ))}

                    {!isLifetime && (
                      !confirmingCancel ? (
                        <button
                          type="button"
                          className="button danger-outline"
                          disabled={busy}
                          onClick={() =>
                            setCancelUid(
                              managedUser.uid,
                            )
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
                                managedUser.uid,
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
                      )
                    )}
                  </>
                ) : (
                  <>
                    {([1, 3, 6, 12] as const)
                      .map((months) => (
                        <button
                          key={months}
                          type="button"
                          className={
                            months === 1
                              ? 'button primary'
                              : 'button secondary'
                          }
                          disabled={busy}
                          onClick={() =>
                            void changeSubscription(
                              managedUser.uid,
                              'activate',
                              months,
                            )
                          }
                        >
                          Activate {months === 12
                            ? '1 year'
                            : months + ' month'
                              + (months > 1 ? 's' : '')}
                        </button>
                      ))}

                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void changeSubscription(
                          managedUser.uid,
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
            </div>
          );
        })()}
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
              <span>Business Spaces</span>
              <strong>1</strong>
            </div>

            <div>
              <span>Inventory items</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeInventoryItems}
              </strong>
            </div>

            <div>
              <span>Business customers</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeCustomers}
              </strong>
            </div>

            <div>
              <span>Business sellers</span>
              <strong>
                {BASIC_PLAN_LIMITS.smeSellers}
              </strong>
            </div>

            <div>
              <span>Extra Business member</span>
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
