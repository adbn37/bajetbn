import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  listAccountsForOwnerSpace,
} from '../../repositories/accountRepository';

import {
  getBusinessProfile,
  setBusinessPayrollEnabled,
} from '../../repositories/businessAdvancedRepository';

import {
  createBusinessEmployee,
  listBusinessEmployees,
  listBusinessPayrollRuns,
  postBusinessPayrollRun,
  retryBusinessPayrollRun,
  setBusinessEmployeeArchived,
  updateBusinessEmployee,
} from '../../repositories/businessPayrollRepository';

import {
  getSpace,
} from '../../repositories/spaceRepository';

import type {
  Account,
  BusinessEmployee,
  BusinessPayrollRun,
  BusinessProfile,
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

interface EmployeeForm {
  name: string;
  roleTitle: string;
  employeeNumber: string;
  phone: string;
  monthlyWage: string;
}

interface PayrollForm {
  employeeId: string;
  accountId: string;
  period: string;
  payDate: string;
  gross: string;
  deductions: string;
  note: string;
}

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

function blankEmployee(): EmployeeForm {
  return {
    name: '',
    roleTitle: '',
    employeeNumber: '',
    phone: '',
    monthlyWage: '0.00',
  };
}

function blankPayroll(): PayrollForm {
  const today =
    localToday();

  return {
    employeeId: '',
    accountId: '',
    period:
      today.slice(0, 7),
    payDate:
      today,
    gross:
      '0.00',
    deductions:
      '0.00',
    note:
      '',
  };
}

function toMinor(
  value: string,
): number {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
    || amount < 0
  ) {
    throw new Error(
      'Enter a valid amount.',
    );
  }

  return Math.round(
    amount * 100,
  );
}

function minorInput(
  amountMinor: number,
): string {
  return (
    amountMinor / 100
  ).toFixed(2);
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

export function BusinessPayrollPage() {
  const {
    user,
  } = useAuth();

  const {
    spaceId = '',
  } = useParams();

  const [
    space,
    setSpace,
  ] = useState<Space | null>(
    null,
  );

  const [
    profile,
    setProfile,
  ] = useState<BusinessProfile | null>(
    null,
  );

  const [
    accounts,
    setAccounts,
  ] = useState<Account[]>(
    [],
  );

  const [
    employees,
    setEmployees,
  ] = useState<BusinessEmployee[]>(
    [],
  );

  const [
    runs,
    setRuns,
  ] = useState<BusinessPayrollRun[]>(
    [],
  );

  const [
    editingEmployee,
    setEditingEmployee,
  ] = useState<
    BusinessEmployee
    | 'new'
    | null
  >(
    null,
  );

  const [
    employeeForm,
    setEmployeeForm,
  ] = useState<EmployeeForm>(
    blankEmployee(),
  );

  const [
    payrollForm,
    setPayrollForm,
  ] = useState<PayrollForm>(
    blankPayroll(),
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
          const nextSpace =
            await getSpace(
              spaceId,
            );

          setSpace(
            nextSpace,
          );

          if (
            !nextSpace
            || nextSpace.type !== 'sme'
            || nextSpace.ownerId !== user.uid
          ) {
            return;
          }

          const [
            nextProfile,
            nextAccounts,
            nextEmployees,
            nextRuns,
          ] =
            await Promise.all([
              getBusinessProfile(
                spaceId,
              ),
              listAccountsForOwnerSpace(
                user.uid,
                spaceId,
              ),
              listBusinessEmployees(
                spaceId,
              ),
              listBusinessPayrollRuns(
                user.uid,
                spaceId,
              ),
            ]);

          setProfile(
            nextProfile,
          );

          setAccounts(
            nextAccounts,
          );

          setEmployees(
            nextEmployees,
          );

          setRuns(
            nextRuns,
          );

          setPayrollForm(
            (current) => ({
              ...current,
              accountId:
                current.accountId
                || nextAccounts[0]?.id
                || '',
            }),
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
    [
      load,
    ],
  );

  const activeEmployees =
    useMemo(
      () =>
        employees.filter(
          (employee) =>
            !employee.archivedAt,
        ),
      [
        employees,
      ],
    );

  const postedRuns =
    useMemo(
      () =>
        runs.filter(
          (run) =>
            run.status === 'posted',
        ),
      [
        runs,
      ],
    );

  const pendingRuns =
    useMemo(
      () =>
        runs.filter(
          (run) =>
            run.status === 'pending',
        ),
      [
        runs,
      ],
    );

  function openNewEmployee() {
    setEditingEmployee(
      'new',
    );

    setEmployeeForm(
      blankEmployee(),
    );

    setError('');
  }

  function openEmployee(
    employee:
      BusinessEmployee,
  ) {
    setEditingEmployee(
      employee,
    );

    setEmployeeForm({
      name:
        employee.name,
      roleTitle:
        employee.roleTitle,
      employeeNumber:
        employee.employeeNumber,
      phone:
        employee.phone,
      monthlyWage:
        minorInput(
          employee.monthlyWageMinor,
        ),
    });

    setError('');
  }

  async function saveEmployee(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!space) {
      return;
    }

    if (
      !employeeForm.name.trim()
    ) {
      setError(
        'Employee name is required.',
      );

      return;
    }

    let wageMinor: number;

    try {
      wageMinor =
        toMinor(
          employeeForm.monthlyWage,
        );
    } catch (
      nextError
    ) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );

      return;
    }

    setBusy(true);
    setError('');
    setFeedback('');

    try {
      const input = {
        name:
          employeeForm.name,
        roleTitle:
          employeeForm.roleTitle,
        employeeNumber:
          employeeForm.employeeNumber,
        phone:
          employeeForm.phone,
        monthlyWageMinor:
          wageMinor,
      };

      if (
        editingEmployee === 'new'
      ) {
        await createBusinessEmployee(
          space.id,
          {
            ...input,
            currency:
              space.currency
              || 'BND',
          },
        );

        setFeedback(
          'Employee added.',
        );
      } else if (
        editingEmployee
      ) {
        await updateBusinessEmployee(
          editingEmployee.id,
          input,
        );

        setFeedback(
          'Employee updated.',
        );
      }

      setEditingEmployee(
        null,
      );

      await load();
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

  async function changeEmployeeArchive(
    employee:
      BusinessEmployee,
    archived: boolean,
  ) {
    setBusy(true);
    setError('');
    setFeedback('');

    try {
      await setBusinessEmployeeArchived(
        employee.id,
        archived,
      );

      setFeedback(
        archived
          ? `${employee.name} archived.`
          : `${employee.name} restored.`,
      );

      await load();
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

  function chooseEmployee(
    employeeId: string,
  ) {
    const employee =
      activeEmployees.find(
        (item) =>
          item.id === employeeId,
      );

    setPayrollForm(
      (current) => ({
        ...current,
        employeeId,
        gross:
          employee
            ? minorInput(
                employee.monthlyWageMinor,
              )
            : '0.00',
      }),
    );
  }

  async function postPayroll(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!space) {
      return;
    }

    const employee =
      activeEmployees.find(
        (item) =>
          item.id
            === payrollForm.employeeId,
      );

    if (!employee) {
      setError(
        'Choose an employee.',
      );

      return;
    }

    const account =
      accounts.find(
        (item) =>
          item.id
            === payrollForm.accountId,
      );

    if (!account) {
      setError(
        'Choose a Business Account.',
      );

      return;
    }

    let grossMinor: number;
    let deductionsMinor: number;

    try {
      grossMinor =
        toMinor(
          payrollForm.gross,
        );

      deductionsMinor =
        toMinor(
          payrollForm.deductions,
        );
    } catch (
      nextError
    ) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );

      return;
    }

    if (
      grossMinor <= 0
      || deductionsMinor >= grossMinor
    ) {
      setError(
        'Gross pay must be above zero and deductions must be lower than gross pay.',
      );

      return;
    }

    if (
      !payrollForm.period
      || !payrollForm.payDate
    ) {
      setError(
        'Payroll period and pay date are required.',
      );

      return;
    }

    setBusy(true);
    setError('');
    setFeedback('');

    try {
      await postBusinessPayrollRun({
        spaceId:
          space.id,
        employeeId:
          employee.id,
        employeeName:
          employee.name,
        period:
          payrollForm.period,
        payDate:
          payrollForm.payDate,
        grossMinor,
        deductionsMinor,
        accountId:
          account.id,
        accountName:
          account.name,
        currency:
          account.currency
          || space.currency
          || 'BND',
        note:
          payrollForm.note,
      });

      setFeedback(
        'Payroll posted to the Business Account and Business transaction ledger.',
      );

      setPayrollForm(
        (current) => ({
          ...blankPayroll(),
          accountId:
            current.accountId,
        }),
      );

      await load();
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

  async function retryRun(
    run:
      BusinessPayrollRun,
  ) {
    setBusy(true);
    setError('');
    setFeedback('');

    try {
      await retryBusinessPayrollRun(
        run,
      );

      setFeedback(
        `${run.displayId} posted successfully.`,
      );

      await load();
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

  async function enablePayroll() {
    setBusy(true);
    setError('');
    setFeedback('');

    try {
      await setBusinessPayrollEnabled(
        spaceId,
        true,
      );

      setFeedback(
        'Payroll enabled.',
      );

      await load();
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
          Loading payroll...
        </div>
      </main>
    );
  }

  if (
    !space
    || space.type !== 'sme'
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business payroll"
          title="Business Space not found"
          description="Open an Business Space to use payroll."
        />
      </main>
    );
  }

  if (
    space.ownerId !== user?.uid
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business payroll"
          title={space.name}
          description="Employee wage information and payroll are restricted to the business owner."
          action={
            <Link
              className="button secondary"
              to={`/spaces/${space.id}`}
            >
              Back to Space
            </Link>
          }
        />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business payroll"
          title={space.name}
          description="Set up the Business Profile before using payroll."
          action={
            <Link
              className="button primary"
              to={`/spaces/${space.id}/business`}
            >
              Business Profile
            </Link>
          }
        />
      </main>
    );
  }

  const currency =
    space.currency
    || 'BND';

  return (
    <main
      className="page"
      data-business-payroll
    >
      <PageHeader
        eyebrow="Business payroll"
        title={space.name}
        description="Manage employees, payroll runs, wage posting and payroll history for this Business Space."
        action={
          <Link
            className="button secondary"
            to={`/spaces/${space.id}/business`}
          >
            Business Admin
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

      {!profile.payrollEnabled ? (
        <section className="panel">
          <span className="eyebrow">
            Payroll setup
          </span>

          <h2>
            Enable payroll
          </h2>

          <p>
            Employee and payroll records belong only to this Business Space.
            Wage payments use the normal BajetBN transaction ledger.
          </p>

          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={
              () =>
                void enablePayroll()
            }
          >
            Enable Payroll
          </button>
        </section>
      ) : (
        <>
          <section className="summary-grid">
            <article className="summary-card featured">
              <span>
                Active employees
              </span>

              <strong>
                {activeEmployees.length}
              </strong>

              <small>
                Available for payroll
              </small>
            </article>

            <article className="summary-card">
              <span>
                Posted payroll
              </span>

              <strong>
                {postedRuns.length}
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
                {pendingRuns.length}
              </strong>

              <small>
                Pending runs that can be retried
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
                  Save employee identity and default wage for future payroll runs.
                </p>
              </div>

              <button
                type="button"
                className="button primary"
                onClick={
                  openNewEmployee
                }
              >
                Add Employee
              </button>
            </div>

            {editingEmployee && (
              <form
                className="form-grid"
                onSubmit={
                  saveEmployee
                }
              >
                <label>
                  Employee name
                  <input
                    required
                    maxLength={120}
                    value={
                      employeeForm.name
                    }
                    onChange={
                      (event) =>
                        setEmployeeForm(
                          (current) => ({
                            ...current,
                            name:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label>
                  Role / position
                  <input
                    maxLength={120}
                    value={
                      employeeForm.roleTitle
                    }
                    onChange={
                      (event) =>
                        setEmployeeForm(
                          (current) => ({
                            ...current,
                            roleTitle:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label>
                  Employee number
                  <input
                    maxLength={80}
                    value={
                      employeeForm.employeeNumber
                    }
                    onChange={
                      (event) =>
                        setEmployeeForm(
                          (current) => ({
                            ...current,
                            employeeNumber:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label>
                  Phone
                  <input
                    maxLength={80}
                    value={
                      employeeForm.phone
                    }
                    onChange={
                      (event) =>
                        setEmployeeForm(
                          (current) => ({
                            ...current,
                            phone:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label>
                  Default monthly wage
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      employeeForm.monthlyWage
                    }
                    onChange={
                      (event) =>
                        setEmployeeForm(
                          (current) => ({
                            ...current,
                            monthlyWage:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <div className="button-row span-2">
                  <button
                    type="submit"
                    className="button primary"
                    disabled={busy}
                  >
                    {busy
                      ? 'Saving...'
                      : 'Save Employee'}
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={
                      () =>
                        setEditingEmployee(
                          null,
                        )
                    }
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {employees.length === 0 ? (
              <div className="mini-empty">
                <h3>
                  No employees yet
                </h3>

                <p>
                  Add an employee before creating a payroll run.
                </p>
              </div>
            ) : (
              <div className="business-contact-list">
                {employees.map(
                  (employee) => (
                    <article
                      className="business-contact-card"
                      key={employee.id}
                    >
                      <div>
                        <small>
                          {employee.displayId}
                          {employee.archivedAt
                            ? ' · Archived'
                            : ''}
                        </small>

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
                              || currency,
                          )}
                        </strong>
                      </div>

                      <div className="button-row">
                        {!employee.archivedAt && (
                          <button
                            type="button"
                            className="button secondary"
                            onClick={
                              () =>
                                openEmployee(
                                  employee,
                                )
                            }
                          >
                            Edit
                          </button>
                        )}

                        <button
                          type="button"
                          className={
                            employee.archivedAt
                              ? 'button secondary'
                              : 'text-button danger'
                          }
                          disabled={busy}
                          onClick={
                            () =>
                              void changeEmployeeArchive(
                                employee,
                                !employee.archivedAt,
                              )
                          }
                        >
                          {employee.archivedAt
                            ? 'Restore'
                            : 'Archive'}
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <span className="eyebrow">
              Payroll run
            </span>

            <h2>
              Post wage payment
            </h2>

            <p>
              Gross pay and deductions remain in payroll history.
              The net wage posts as an Business expense to the selected Business Account.
            </p>

            {accounts.length === 0 && (
              <div className="notice warning">
                Add a Business Account to this Business Space before posting payroll.
              </div>
            )}

            <form
              className="form-grid"
              onSubmit={
                postPayroll
              }
            >
              <label>
                Employee
                <select
                  required
                  value={
                    payrollForm.employeeId
                  }
                  onChange={
                    (event) =>
                      chooseEmployee(
                        event.target.value,
                      )
                  }
                >
                  <option value="">
                    Choose employee
                  </option>

                  {activeEmployees.map(
                    (employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Business Account
                <select
                  required
                  value={
                    payrollForm.accountId
                  }
                  onChange={
                    (event) =>
                      setPayrollForm(
                        (current) => ({
                          ...current,
                          accountId:
                            event.target.value,
                        }),
                      )
                  }
                >
                  <option value="">
                    Choose account
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Payroll period
                <input
                  type="month"
                  required
                  value={
                    payrollForm.period
                  }
                  onChange={
                    (event) =>
                      setPayrollForm(
                        (current) => ({
                          ...current,
                          period:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label>
                Pay date
                <input
                  type="date"
                  required
                  value={
                    payrollForm.payDate
                  }
                  onChange={
                    (event) =>
                      setPayrollForm(
                        (current) => ({
                          ...current,
                          payDate:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label>
                Gross pay
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={
                    payrollForm.gross
                  }
                  onChange={
                    (event) =>
                      setPayrollForm(
                        (current) => ({
                          ...current,
                          gross:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label>
                Deductions
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    payrollForm.deductions
                  }
                  onChange={
                    (event) =>
                      setPayrollForm(
                        (current) => ({
                          ...current,
                          deductions:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label className="span-2">
                Note
                <textarea
                  maxLength={500}
                  value={
                    payrollForm.note
                  }
                  onChange={
                    (event) =>
                      setPayrollForm(
                        (current) => ({
                          ...current,
                          note:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <div className="button-row span-2">
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    busy
                    || activeEmployees.length === 0
                    || accounts.length === 0
                  }
                >
                  {busy
                    ? 'Posting...'
                    : 'Post Payroll'}
                </button>
              </div>
            </form>
          </section>

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
                </p>
              </div>
            </div>

            {runs.length === 0 ? (
              <div className="mini-empty">
                <h3>
                  No payroll history yet
                </h3>

                <p>
                  Your first payroll run will appear here.
                </p>
              </div>
            ) : (
              <div className="business-contact-list">
                {runs.map(
                  (run) => (
                    <article
                      className="business-contact-card"
                      key={run.id}
                    >
                      <div>
                        <small>
                          {run.displayId}
                          {' · '}
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

                      {run.status === 'pending' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={
                            () =>
                              void retryRun(
                                run,
                              )
                          }
                        >
                          Retry Posting
                        </button>
                      )}
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}