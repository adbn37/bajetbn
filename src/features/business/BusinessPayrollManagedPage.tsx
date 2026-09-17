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

import {
  ActionConfirmModal,
} from '../../components/ActionConfirmModal';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  deleteBusinessPayrollRun,
  getBusinessPayrollWorkspace,
  type BusinessPayrollWorkspace,
} from '../../repositories/businessPayrollAdminRepository';

import {
  retryBusinessPayrollRun,
} from '../../repositories/businessPayrollRepository';

import {
  issuePayslipDocument,
  listBusinessPrivateDocuments,
} from '../../repositories/privateDocumentRepository';

import type {
  BusinessEmployee,
  BusinessPayrollRun,
  BusinessPrivateDocument,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

import {
  BusinessPayrollPage,
} from './BusinessPayrollPage';

function localToday(): string {
  const now = new Date();

  return new Date(
    now.getTime()
      - now.getTimezoneOffset()
        * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

function money(
  amountMinor: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency,
    },
  ).format(
    amountMinor / 100,
  );
}

function activeEmployeeCount(
  employees: BusinessEmployee[],
): number {
  return employees.filter(
    (employee) =>
      !employee.archivedAt,
  ).length;
}

function activeRuns(
  runs: BusinessPayrollRun[],
): BusinessPayrollRun[] {
  return runs.filter(
    (run) =>
      run.status !== 'cancelled',
  );
}

function PayrollHistoryPanel({
  runs,
  payslips,
  isOwner,
  busy,
  onRetry,
  onIssuePayslip,
  onDelete,
}: {
  runs: BusinessPayrollRun[];
  payslips: BusinessPrivateDocument[];
  isOwner: boolean;
  busy: boolean;
  onRetry: (run: BusinessPayrollRun) => void;
  onIssuePayslip: (run: BusinessPayrollRun) => void;
  onDelete: (run: BusinessPayrollRun) => void;
}) {
  const visibleRuns =
    activeRuns(runs);

  const payslipByRunId =
    useMemo(
      () =>
        new Map(
          payslips
            .filter(
              (document) =>
                document.type === 'payslip'
                && document.status !== 'cancelled',
            )
            .map(
              (document) => [
                document.sourceId,
                document,
              ],
            ),
        ),
      [
        payslips,
      ],
    );

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            Payroll history
          </span>

          <h2>
            Payroll runs
          </h2>

          <p>
            Posted and pending wage records for this business.
            Owner and Business Admin can delete a run.
          </p>
        </div>
      </div>

      {visibleRuns.length === 0 ? (
        <div className="mini-empty">
          <h3>
            No active payroll history
          </h3>

          <p>
            Posted or pending payroll runs will appear here.
          </p>
        </div>
      ) : (
        <div className="business-contact-list">
          {visibleRuns.map(
            (run) => (
              <article
                className="business-contact-card"
                key={run.id}
              >
                <div>
                  <small>
                    {run.period}
                    {' · '}
                    {run.status}
                  </small>

                  <h3>
                    {run.employeeName}
                  </h3>

                  <p>
                    Gross{' '}
                    {money(
                      run.grossMinor,
                      run.currency,
                    )}
                    {' · '}
                    Deductions{' '}
                    {money(
                      run.deductionsMinor,
                      run.currency,
                    )}
                  </p>

                  <strong>
                    Net{' '}
                    {money(
                      run.netMinor,
                      run.currency,
                    )}
                  </strong>

                  {run.failureReason && (
                    <p>
                      Needs attention:{' '}
                      {run.failureReason}
                    </p>
                  )}
                </div>

                <div className="button-row">
                  {isOwner
                    && run.status === 'pending'
                    && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={
                          () =>
                            onRetry(run)
                        }
                      >
                        Retry Posting
                      </button>
                    )}

                  {isOwner
                    && run.status === 'posted'
                    && (
                      payslipByRunId.has(
                        run.id,
                      )
                        ? (
                          <Link
                            className="button secondary"
                            to={
                              '/documents/'
                              + payslipByRunId.get(
                                  run.id,
                                )!.id
                            }
                          >
                            Open Payslip
                          </Link>
                        )
                        : (
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy}
                            onClick={
                              () =>
                                onIssuePayslip(
                                  run,
                                )
                            }
                          >
                            Issue Payslip
                          </button>
                        )
                    )}

                  <button
                    type="button"
                    className="text-button danger"
                    disabled={busy}
                    onClick={
                      () =>
                        onDelete(run)
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function AdminPayrollPage({
  workspace,
  busy,
  error,
  feedback,
  onDelete,
}: {
  workspace: BusinessPayrollWorkspace;
  busy: boolean;
  error: string;
  feedback: string;
  onDelete: (run: BusinessPayrollRun) => void;
}) {
  const visibleRuns =
    activeRuns(
      workspace.runs,
    );

  const postedCount =
    visibleRuns.filter(
      (run) =>
        run.status === 'posted',
    ).length;

  const pendingCount =
    visibleRuns.filter(
      (run) =>
        run.status === 'pending',
    ).length;

  return (
    <main
      className="page"
      data-business-payroll-admin
    >
      <PageHeader
        eyebrow="Business payroll · Admin"
        title={workspace.spaceName}
        description="Business Admin can review payroll records and delete payroll runs. Posting payroll and editing employee records remain Owner-only."
        action={
          <Link
            className="button secondary"
            to={
              `/spaces/${workspace.spaceId}`
            }
          >
            Back to Space
          </Link>
        }
      />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {feedback && (
        <div className="notice success">
          {feedback}
        </div>
      )}

      <section className="summary-grid">
        <article className="summary-card featured">
          <span>
            Active employees
          </span>

          <strong>
            {activeEmployeeCount(
              workspace.employees,
            )}
          </strong>

          <small>
            Payroll records in this Business Space
          </small>
        </article>

        <article className="summary-card">
          <span>
            Posted payroll
          </span>

          <strong>
            {postedCount}
          </strong>

          <small>
            Wage transactions completed
          </small>
        </article>

        <article className="summary-card">
          <span>
            Needs attention
          </span>

          <strong>
            {pendingCount}
          </strong>

          <small>
            Pending payroll runs
          </small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Employees
            </span>

            <h2>
              Employee records
            </h2>

            <p>
              Admin view is read-only here.
              Employee editing stays with the Business Owner.
            </p>
          </div>
        </div>

        {workspace.employees.length === 0 ? (
          <div className="mini-empty">
            <h3>
              No employees yet
            </h3>
          </div>
        ) : (
          <div className="business-contact-list">
            {workspace.employees.map(
              (employee) => (
                <article
                  className="business-contact-card"
                  key={employee.id}
                >
                  <div>
                    {employee.archivedAt && (
                      <small>
                        Archived
                      </small>
                    )}

                    <h3>
                      {employee.name}
                    </h3>

                    <p>
                      {[
                        employee.roleTitle,
                        employee.employeeNumber,
                        employee.phone,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                        || 'Employee'}
                    </p>

                    <strong>
                      {money(
                        employee.monthlyWageMinor,
                        employee.currency
                          || workspace.currency,
                      )}
                    </strong>

                    <small>
                      {employee.linkedEmail
                        ? 'BajetBN linked · '
                          + employee.linkedEmail
                        : 'BajetBN account not linked'}
                    </small>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <PayrollHistoryPanel
        runs={workspace.runs}
        payslips={[]}
        isOwner={false}
        busy={busy}
        onRetry={() => undefined}
        onIssuePayslip={() => undefined}
        onDelete={onDelete}
      />
    </main>
  );
}

export function BusinessPayrollManagedPage() {
  const {
    user,
  } = useAuth();

  const {
    spaceId = '',
  } = useParams();

  const [
    workspace,
    setWorkspace,
  ] = useState<
    BusinessPayrollWorkspace
    | null
  >(
    null,
  );

  const [
    payslips,
    setPayslips,
  ] = useState<
    BusinessPrivateDocument[]
  >(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    feedback,
    setFeedback,
  ] = useState('');

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<
    BusinessPayrollRun
    | null
  >(
    null,
  );

  const [
    ownerRefreshKey,
    setOwnerRefreshKey,
  ] = useState(0);

  const load =
    useCallback(
      async () => {
        if (
          !user
          || !spaceId
        ) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError('');

        try {
          const nextWorkspace =
            await getBusinessPayrollWorkspace(
              spaceId,
            );

          setWorkspace(
            nextWorkspace,
          );

          if (
            nextWorkspace.isOwner
          ) {
            const nextPayslips =
              await listBusinessPrivateDocuments(
                spaceId,
                'payslip',
              );

            setPayslips(
              nextPayslips,
            );
          } else {
            setPayslips([]);
          }
        } catch (
          nextError
        ) {
          setWorkspace(null);
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
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) {
          void load();
        }
      });

      return () => {
        cancelled = true;
      };
    },
    [
      load,
    ],
  );

  async function refreshAfterAction(
    message: string,
  ) {
    setFeedback(message);

    setOwnerRefreshKey(
      (current) =>
        current + 1,
    );

    await load();
  }

  async function retryRun(
    run: BusinessPayrollRun,
  ) {
    setBusy(true);
    setError('');
    setFeedback('');

    try {
      await retryBusinessPayrollRun(
        run,
      );

      await refreshAfterAction(
        'Payroll posted successfully.',
      );
    } catch (
      nextError
    ) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );

      await load();
    } finally {
      setBusy(false);
    }
  }

  async function issuePayslip(
    run: BusinessPayrollRun,
  ) {
    if (!workspace) {
      return;
    }

    setBusy(true);
    setError('');
    setFeedback('');

    try {
      const result =
        await issuePayslipDocument(
          workspace.spaceId,
          run.id,
        );

      await refreshAfterAction(
        result.existing
          ? 'This payroll run already has an issued payslip.'
          : 'Private payslip issued.',
      );

      window.open(
        '/documents/'
          + result.documentId,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (
      nextError
    ) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (
      !deleteTarget
      || !workspace
    ) {
      return;
    }

    setBusy(true);
    setError('');
    setFeedback('');

    try {
      const result =
        await deleteBusinessPayrollRun({
          runId:
            deleteTarget.id,
          transactionDate:
            localToday(),
          reason:
            'Deleted payroll '
            + deleteTarget.period
            + ' · '
            + deleteTarget.employeeName,
        });

      setDeleteTarget(
        null,
      );

      await refreshAfterAction(
        result.reversalTransactionId
          ? 'Payroll deleted. The linked wage expense was reversed, the Business Account was restored, and any issued payslip was cancelled.'
          : 'Pending payroll run deleted.',
      );
    } catch (
      nextError
    ) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading payroll access...
        </div>
      </main>
    );
  }

  if (
    !workspace
  ) {
    return (
      <>
        <BusinessPayrollPage />

        {error && (
          <div
            className="page"
            style={{
              paddingTop: 0,
            }}
          >
            <div className="notice error">
              Payroll delete controls could not load: {error}
            </div>
          </div>
        )}
      </>
    );
  }

  if (
    !workspace.canViewPayroll
  ) {
    return (
      <BusinessPayrollPage />
    );
  }

  if (
    workspace.isAdmin
  ) {
    return (
      <>
        <AdminPayrollPage
          workspace={workspace}
          busy={busy}
          error={error}
          feedback={feedback}
          onDelete={
            (run) =>
              setDeleteTarget(
                run,
              )
          }
        />

        {deleteTarget && (
          <ActionConfirmModal
            state={{
              payload:
                deleteTarget,
              title:
                'Delete payroll payment?',
              description:
                'Delete '
                + deleteTarget.employeeName
                + ' payroll for '
                + deleteTarget.period
                + '?',
              confirmLabel:
                'Delete Payroll',
              tone:
                'danger',
              note:
                'If this payroll is posted, BajetBN will reverse the '
                + money(
                    deleteTarget.netMinor,
                    deleteTarget.currency,
                  )
                + ' wage expense, restore the Business Account, cancel the payslip, and keep an audit record.',
            }}
            busy={busy}
            error={error}
            onClose={
              () =>
                setDeleteTarget(
                  null,
                )
            }
            onConfirm={
              () =>
                void confirmDelete()
            }
          />
        )}
      </>
    );
  }

  const replaceExistingHistory =
    workspace.runs.length > 0;

  return (
    <div
      className={
        replaceExistingHistory
          ? 'business-payroll-managed-owner replace-payroll-history'
          : 'business-payroll-managed-owner'
      }
    >
      {replaceExistingHistory && (
        <style>
          {`
            .replace-payroll-history > main[data-business-payroll] > section.panel:last-of-type {
              display: none;
            }
          `}
        </style>
      )}

      <BusinessPayrollPage
        key={ownerRefreshKey}
      />

      {replaceExistingHistory && (
        <div
          className="page"
          style={{
            paddingTop: 0,
          }}
        >
          {error && (
            <div className="notice error">
              {error}
            </div>
          )}

          {feedback && (
            <div className="notice success">
              {feedback}
            </div>
          )}

          <PayrollHistoryPanel
            runs={workspace.runs}
            payslips={payslips}
            isOwner
            busy={busy}
            onRetry={
              (run) =>
                void retryRun(
                  run,
                )
            }
            onIssuePayslip={
              (run) =>
                void issuePayslip(
                  run,
                )
            }
            onDelete={
              (run) =>
                setDeleteTarget(
                  run,
                )
            }
          />
        </div>
      )}

      {deleteTarget && (
        <ActionConfirmModal
          state={{
            payload:
              deleteTarget,
            title:
              'Delete payroll payment?',
            description:
              'Delete '
              + deleteTarget.employeeName
              + ' payroll for '
              + deleteTarget.period
              + '?',
            confirmLabel:
              'Delete Payroll',
            tone:
              'danger',
            note:
              'If this payroll is posted, BajetBN will reverse the '
              + money(
                  deleteTarget.netMinor,
                  deleteTarget.currency,
                )
              + ' wage expense, restore the Business Account, cancel the payslip, and keep an audit record.',
          }}
          busy={busy}
          error={error}
          onClose={
            () =>
              setDeleteTarget(
                null,
              )
          }
          onConfirm={
            () =>
              void confirmDelete()
          }
        />
      )}
    </div>
  );
}
