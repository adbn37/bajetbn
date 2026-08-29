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

import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';

import { useAuth } from '../../contexts/AuthContext';

import { listAccountsForOwnerSpace } from '../../repositories/accountRepository';

import {
  getBusinessProfile,
  listBusinessContacts,
} from '../../repositories/businessAdvancedRepository';

import {
  cancelBusinessInvoice,
  createBusinessInvoice,
  issueBusinessInvoice,
  listBusinessInvoicePayments,
  listBusinessInvoices,
  recordBusinessInvoicePayment,
  updateBusinessInvoice,
  type BusinessInvoiceInput,
} from '../../repositories/businessInvoiceRepository';

import { getSpace } from '../../repositories/spaceRepository';

import type {
  Account,
  BusinessContact,
  BusinessInvoice,
  BusinessInvoicePayment,
  BusinessProfile,
  PaymentMethodCode,
  Space,
} from '../../types/models';

import { getErrorMessage } from '../../utils/errors';

interface LineForm {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceForm {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: LineForm[];
}

interface PaymentForm {
  accountId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethodCode;
  paymentMethodLabel: string;
  note: string;
}

function localToday(): string {
  const now = new Date();

  return new Date(
    now.getTime()
      - now.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

function plusDays(
  date: string,
  days: number,
): string {
  const parsed = new Date(
    date + 'T00:00:00',
  );

  parsed.setDate(
    parsed.getDate() + days,
  );

  const offset =
    parsed.getTimezoneOffset();

  return new Date(
    parsed.getTime()
      - offset * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

function money(
  value: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency,
    },
  ).format(value / 100);
}

function minorInput(
  value: number,
): string {
  return (value / 100).toFixed(2);
}

function blankLine(): LineForm {
  return {
    description: '',
    quantity: '1',
    unitPrice: '0.00',
  };
}

function emptyInvoiceForm(): InvoiceForm {
  const issueDate = localToday();

  return {
    customerId: '',
    issueDate,
    dueDate:
      plusDays(issueDate, 7),
    notes: '',
    lines: [
      blankLine(),
    ],
  };
}

function paymentForm(
  invoice: BusinessInvoice,
  accounts: Account[],
): PaymentForm {
  return {
    accountId:
      accounts[0]?.id || '',
    amount:
      minorInput(
        invoice.balanceDueMinor,
      ),
    paymentDate:
      localToday(),
    paymentMethod:
      'bank_transfer',
    paymentMethodLabel: '',
    note: '',
  };
}

function displayStatus(
  invoice: BusinessInvoice,
): string {
  if (
    (
      invoice.status === 'issued'
      || invoice.status === 'partially_paid'
    )
    && invoice.dueDate < localToday()
  ) {
    return 'Overdue';
  }

  if (
    invoice.status === 'partially_paid'
  ) {
    return 'Partially Paid';
  }

  return invoice.status
    .replace('_', ' ')
    .replace(
      /w/g,
      (value) =>
        value.toUpperCase(),
    );
}

function invoiceInput(
  invoice: BusinessInvoice,
): InvoiceForm {
  return {
    customerId:
      invoice.customerId,
    issueDate:
      invoice.issueDate,
    dueDate:
      invoice.dueDate,
    notes:
      invoice.notes,
    lines:
      invoice.lines.map(
        (line) => ({
          description:
            line.description,
          quantity:
            String(line.quantity),
          unitPrice:
            minorInput(
              line.unitPriceMinor,
            ),
        }),
      ),
  };
}

function normalizeInput(
  spaceId: string,
  form: InvoiceForm,
): BusinessInvoiceInput {
  if (!form.customerId) {
    throw new Error(
      'Choose a customer.',
    );
  }

  if (
    !form.issueDate
    || !form.dueDate
  ) {
    throw new Error(
      'Issue date and due date are required.',
    );
  }

  if (
    form.dueDate < form.issueDate
  ) {
    throw new Error(
      'Due date cannot be before the issue date.',
    );
  }

  const lines =
    form.lines.map(
      (line) => {
        const quantity =
          Number(line.quantity);

        const price =
          Number(line.unitPrice);

        if (
          !Number.isInteger(quantity)
          || quantity <= 0
        ) {
          throw new Error(
            'Each invoice quantity must be a whole number greater than zero.',
          );
        }

        if (
          !Number.isFinite(price)
          || price < 0
        ) {
          throw new Error(
            'Each unit price must be zero or more.',
          );
        }

        if (!line.description.trim()) {
          throw new Error(
            'Each invoice line needs a description.',
          );
        }

        return {
          description:
            line.description.trim(),
          quantity,
          unitPriceMinor:
            Math.round(
              price * 100,
            ),
        };
      },
    );

  return {
    spaceId,
    customerId:
      form.customerId,
    issueDate:
      form.issueDate,
    dueDate:
      form.dueDate,
    notes:
      form.notes.trim(),
    lines,
  };
}

export function BusinessInvoicesPage() {
  const [
    cancelInvoiceTarget,
    setCancelInvoiceTarget,
  ] = useState<BusinessInvoice | null>(
    null,
  );

  const { user } = useAuth();

  const { spaceId = '' } =
    useParams();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [profile, setProfile] =
    useState<BusinessProfile | null>(
      null,
    );

  const [contacts, setContacts] =
    useState<BusinessContact[]>([]);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [invoices, setInvoices] =
    useState<BusinessInvoice[]>([]);

  const [payments, setPayments] =
    useState<
      BusinessInvoicePayment[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [feedback, setFeedback] =
    useState('');

  const [editor, setEditor] =
    useState<
      'new'
      | BusinessInvoice
      | null
    >(null);

  const [form, setForm] =
    useState<InvoiceForm>(
      emptyInvoiceForm(),
    );

  const [
    selectedInvoice,
    setSelectedInvoice,
  ] =
    useState<
      BusinessInvoice | null
    >(null);

  const [
    paymentInvoice,
    setPaymentInvoice,
  ] =
    useState<
      BusinessInvoice | null
    >(null);

  const [
    payForm,
    setPayForm,
  ] =
    useState<PaymentForm | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        if (
          !user
          || !spaceId
        ) {
          return;
        }

        setLoading(true);
        setError('');

        try {
          const nextSpace =
            await getSpace(spaceId);

          setSpace(nextSpace);

          if (
            !nextSpace
            || nextSpace.type !== 'sme'
          ) {
            return;
          }

          const [
            nextProfile,
            nextContacts,
            nextAccounts,
            nextInvoices,
          ] = await Promise.all([
            getBusinessProfile(
              spaceId,
            ),
            listBusinessContacts(
              spaceId,
            ),
            listAccountsForOwnerSpace(
              user.uid,
              spaceId,
            ),
            listBusinessInvoices(
              user.uid,
              spaceId,
            ),
          ]);

          setProfile(nextProfile);

          setContacts(
            nextContacts,
          );

          setAccounts(
            nextAccounts,
          );

          setInvoices(
            nextInvoices,
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

  const customers =
    useMemo(
      () =>
        contacts.filter(
          (item) =>
            !item.archivedAt
            && (
              item.kind === 'customer'
              || item.kind === 'both'
            ),
        ),
      [contacts],
    );

  const receivableMinor =
    useMemo(
      () =>
        invoices.reduce(
          (sum, invoice) =>
            invoice.status === 'issued'
            || invoice.status
              === 'partially_paid'
              ? sum
                + invoice.balanceDueMinor
              : sum,
          0,
        ),
      [invoices],
    );

  const paidMinor =
    useMemo(
      () =>
        invoices.reduce(
          (sum, invoice) =>
            sum
            + invoice.amountPaidMinor,
          0,
        ),
      [invoices],
    );

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading invoices...
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
          eyebrow="Business invoices"
          title="SME Space not found"
          description="Open an SME Space to manage invoices."
        />

        <Link
          className="button primary"
          to="/spaces"
        >
          Back to Spaces
        </Link>
      </main>
    );
  }

  if (
    space.ownerId !== user?.uid
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business invoices"
          title={space.name}
          description="Invoice administration is restricted to the business owner."
          action={
            <Link
              className="button secondary"
              to={
                '/spaces/'
                + space.id
              }
            >
              Back to Space
            </Link>
          }
        />
      </main>
    );
  }

  const openNewInvoice = () => {
    const next =
      emptyInvoiceForm();

    if (customers[0]) {
      next.customerId =
        customers[0].id;
    }

    setForm(next);
    setEditor('new');
    setSelectedInvoice(null);
    setPaymentInvoice(null);
    setError('');
  };

  const openEditInvoice = (
    invoice: BusinessInvoice,
  ) => {
    setForm(
      invoiceInput(invoice),
    );

    setEditor(invoice);
    setSelectedInvoice(null);
    setPaymentInvoice(null);
    setError('');
  };

  const changeLine = (
    index: number,
    patch: Partial<LineForm>,
  ) => {
    setForm(
      (current) => ({
        ...current,
        lines:
          current.lines.map(
            (line, lineIndex) =>
              lineIndex === index
                ? {
                    ...line,
                    ...patch,
                  }
                : line,
          ),
      }),
    );
  };

  const removeLine = (
    index: number,
  ) => {
    setForm(
      (current) => ({
        ...current,
        lines:
          current.lines.length <= 1
            ? current.lines
            : current.lines.filter(
                (
                  _line,
                  lineIndex,
                ) =>
                  lineIndex !== index,
              ),
      }),
    );
  };

  const saveInvoice = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const input =
        normalizeInput(
          space.id,
          form,
        );

      if (editor === 'new') {
        await createBusinessInvoice(
          input,
        );

        setFeedback(
          'Invoice created as a draft.',
        );
      } else if (editor) {
        await updateBusinessInvoice(
          editor.id,
          {
            customerId:
              input.customerId,
            issueDate:
              input.issueDate,
            dueDate:
              input.dueDate,
            notes:
              input.notes,
            lines:
              input.lines,
          },
        );

        setFeedback(
          'Draft invoice updated.',
        );
      }

      setEditor(null);

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const issueInvoice = async (
    invoice: BusinessInvoice,
  ) => {
    setBusy(true);
    setError('');

    try {
      await issueBusinessInvoice(
        invoice.id,
      );

      setFeedback(
        invoice.invoiceNumber
        + ' issued.',
      );

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelInvoice = (
    invoice: BusinessInvoice,
  ) => {
    setCancelInvoiceTarget(
      invoice,
    );
  };

  const performCancelInvoice = async (
    invoice: BusinessInvoice,
  ) => {
    setBusy(true);
    setError('');

    try {
      await cancelBusinessInvoice(
        invoice.id,
      );

      setFeedback(
        invoice.invoiceNumber
        + ' cancelled.',
      );

      setSelectedInvoice(null);

      setCancelInvoiceTarget(
        null,
      );

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const openInvoice = async (
    invoice: BusinessInvoice,
  ) => {
    setSelectedInvoice(invoice);
    setEditor(null);
    setPaymentInvoice(null);
    setPayments([]);
    setError('');

    try {
      const nextPayments =
        await listBusinessInvoicePayments(
          user.uid,
          invoice.id,
        );

      setPayments(
        nextPayments,
      );
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    }
  };

  const openPayment = (
    invoice: BusinessInvoice,
  ) => {
    setPaymentInvoice(
      invoice,
    );

    setPayForm(
      paymentForm(
        invoice,
        accounts,
      ),
    );

    setEditor(null);
    setSelectedInvoice(null);
    setError('');
  };

  const savePayment = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (
      !paymentInvoice
      || !payForm
    ) {
      return;
    }

    const value =
      Number(
        payForm.amount,
      );

    if (
      !Number.isFinite(value)
      || value <= 0
    ) {
      setError(
        'Payment amount must be greater than zero.',
      );

      return;
    }

    if (!payForm.accountId) {
      setError(
        'Choose the Business Account receiving this payment.',
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      await recordBusinessInvoicePayment({
        invoiceId:
          paymentInvoice.id,
        accountId:
          payForm.accountId,
        amountMinor:
          Math.round(
            value * 100,
          ),
        paymentDate:
          payForm.paymentDate,
        paymentMethod:
          payForm.paymentMethod,
        paymentMethodLabel:
          payForm.paymentMethod
            === 'other'
            ? payForm.paymentMethodLabel
            : undefined,
        note:
          payForm.note,
      });

      setFeedback(
        'Invoice payment posted to the selected Business Account.',
      );

      setPaymentInvoice(null);
      setPayForm(null);

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page business-invoices-page">
      <PageHeader
        eyebrow="Business Admin"
        title="Invoices"
        description={
          'Create invoices, track receivables, and post payments directly into '
          + space.name
          + ' Business Accounts.'
        }
        action={
          <div className="button-row">
            <Link
              className="button secondary"
              to={
                '/spaces/'
                + space.id
                + '/business'
              }
            >
              Business Admin
            </Link>

            <button
              type="button"
              className="button primary"
              onClick={
                openNewInvoice
              }
            >
              New Invoice
            </button>
          </div>
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
            Receivable
          </span>

          <strong>
            {money(
              receivableMinor,
              space.currency,
            )}
          </strong>

          <small>
            Outstanding invoices
          </small>
        </article>

        <article className="summary-card">
          <span>
            Collected
          </span>

          <strong>
            {money(
              paidMinor,
              space.currency,
            )}
          </strong>

          <small>
            Invoice payments recorded
          </small>
        </article>

        <article className="summary-card">
          <span>
            Invoices
          </span>

          <strong>
            {invoices.length}
          </strong>

          <small>
            All invoice records
          </small>
        </article>

        <article className="summary-card">
          <span>
            Business Account
          </span>

          <strong>
            {accounts.length}
          </strong>

          <small>
            Available for payment posting
          </small>
        </article>
      </section>

      {!profile && (
        <div className="notice">
          Set up your Business Profile for the preferred business name and invoice prefix.
        </div>
      )}

      {customers.length === 0 && (
        <div className="notice">
          Add a customer under Business Admin → Customers & Vendors before creating an invoice.
        </div>
      )}

      {editor && (
        <section className="panel invoice-editor">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {editor === 'new'
                  ? 'New invoice'
                  : editor.invoiceNumber}
              </span>

              <h2>
                {editor === 'new'
                  ? 'Create Draft Invoice'
                  : 'Edit Draft Invoice'}
              </h2>
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={
                () =>
                  setEditor(null)
              }
            >
              Close
            </button>
          </div>

          <form
            className="form-stack"
            onSubmit={saveInvoice}
          >
            <div className="form-grid">
              <label>
                Customer
                <select
                  required
                  value={
                    form.customerId
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          customerId:
                            event.target.value,
                        }),
                      )
                  }
                >
                  <option value="">
                    Choose customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {customer.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Issue date
                <input
                  type="date"
                  required
                  value={
                    form.issueDate
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          issueDate:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label>
                Due date
                <input
                  type="date"
                  required
                  value={
                    form.dueDate
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          dueDate:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>
            </div>

            <div className="invoice-lines">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    Items
                  </span>

                  <h3>
                    Invoice Lines
                  </h3>
                </div>

                <button
                  type="button"
                  className="button secondary"
                  onClick={
                    () =>
                      setForm(
                        (current) => ({
                          ...current,
                          lines: [
                            ...current.lines,
                            blankLine(),
                          ],
                        }),
                      )
                  }
                >
                  Add Line
                </button>
              </div>

              {form.lines.map(
                (
                  line,
                  index,
                ) => (
                  <div
                    className="invoice-line-editor"
                    key={index}
                  >
                    <label className="invoice-line-description">
                      Description
                      <input
                        required
                        maxLength={160}
                        value={
                          line.description
                        }
                        onChange={
                          (event) =>
                            changeLine(
                              index,
                              {
                                description:
                                  event.target.value,
                              },
                            )
                        }
                      />
                    </label>

                    <label>
                      Qty
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={
                          line.quantity
                        }
                        onChange={
                          (event) =>
                            changeLine(
                              index,
                              {
                                quantity:
                                  event.target.value,
                              },
                            )
                        }
                      />
                    </label>

                    <label>
                      Unit price
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={
                          line.unitPrice
                        }
                        onChange={
                          (event) =>
                            changeLine(
                              index,
                              {
                                unitPrice:
                                  event.target.value,
                              },
                            )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="text-button danger"
                      disabled={
                        form.lines.length
                        <= 1
                      }
                      onClick={
                        () =>
                          removeLine(
                            index,
                          )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ),
              )}
            </div>

            <label>
              Notes
              <textarea
                maxLength={1000}
                value={form.notes}
                onChange={
                  (event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                }
              />
            </label>

            <div className="button-row">
              <button
                type="submit"
                className="button primary"
                disabled={
                  busy
                  || customers.length
                    === 0
                }
              >
                {busy
                  ? 'Saving...'
                  : editor === 'new'
                    ? 'Create Draft'
                    : 'Save Draft'}
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={
                  () =>
                    setEditor(null)
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {paymentInvoice && payForm && (
        <section className="panel invoice-payment-editor">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Record payment
              </span>

              <h2>
                {paymentInvoice.invoiceNumber}
              </h2>

              <p>
                Balance due: {
                  money(
                    paymentInvoice.balanceDueMinor,
                    paymentInvoice.currency,
                  )
                }
              </p>
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={
                () => {
                  setPaymentInvoice(
                    null,
                  );

                  setPayForm(null);
                }
              }
            >
              Close
            </button>
          </div>

          {accounts.length === 0 && (
            <div className="notice error">
              Create a Business Account for this SME Space before recording an invoice payment.
            </div>
          )}

          <form
            className="form-grid"
            onSubmit={savePayment}
          >
            <label>
              Receiving account
              <select
                required
                value={
                  payForm.accountId
                }
                onChange={
                  (event) =>
                    setPayForm(
                      (current) =>
                        current
                          ? {
                              ...current,
                              accountId:
                                event.target.value,
                            }
                          : current,
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
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={
                  payForm.amount
                }
                onChange={
                  (event) =>
                    setPayForm(
                      (current) =>
                        current
                          ? {
                              ...current,
                              amount:
                                event.target.value,
                            }
                          : current,
                    )
                }
              />
            </label>

            <label>
              Payment date
              <input
                type="date"
                required
                value={
                  payForm.paymentDate
                }
                onChange={
                  (event) =>
                    setPayForm(
                      (current) =>
                        current
                          ? {
                              ...current,
                              paymentDate:
                                event.target.value,
                            }
                          : current,
                    )
                }
              />
            </label>

            <label>
              Payment method
              <select
                value={
                  payForm.paymentMethod
                }
                onChange={
                  (event) =>
                    setPayForm(
                      (current) =>
                        current
                          ? {
                              ...current,
                              paymentMethod:
                                event.target.value as PaymentMethodCode,
                            }
                          : current,
                    )
                }
              >
                <option value="bank_transfer">
                  Bank transfer
                </option>

                <option value="cash">
                  Cash
                </option>

                <option value="debit_card">
                  Debit card
                </option>

                <option value="credit_card">
                  Credit card
                </option>

                <option value="e_wallet">
                  E-wallet
                </option>

                <option value="qr_payment">
                  QR payment
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>

            {payForm.paymentMethod
              === 'other' && (
              <label>
                Other method
                <input
                  required
                  maxLength={80}
                  value={
                    payForm.paymentMethodLabel
                  }
                  onChange={
                    (event) =>
                      setPayForm(
                        (current) =>
                          current
                            ? {
                                ...current,
                                paymentMethodLabel:
                                  event.target.value,
                              }
                            : current,
                      )
                  }
                />
              </label>
            )}

            <label className="span-2">
              Note
              <textarea
                maxLength={500}
                value={
                  payForm.note
                }
                onChange={
                  (event) =>
                    setPayForm(
                      (current) =>
                        current
                          ? {
                              ...current,
                              note:
                                event.target.value,
                            }
                          : current,
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
                  || accounts.length
                    === 0
                }
              >
                {busy
                  ? 'Posting...'
                  : 'Post Payment'}
              </button>
            </div>
          </form>
        </section>
      )}

      {selectedInvoice && (
        <section className="panel invoice-print-sheet">
          <div className="invoice-print-actions">
            <div className="button-row">
              <button
                type="button"
                className="button primary"
                onClick={
                  () =>
                    window.print()
                }
              >
                Print Invoice
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={
                  () =>
                    setSelectedInvoice(
                      null,
                    )
                }
              >
                Close
              </button>
            </div>
          </div>

          <div className="invoice-document-header">
            <div>
              <span className="eyebrow">
                Invoice
              </span>

              <h2>
                {profile?.businessName
                  || space.name}
              </h2>

              <p>
                {profile?.address}
              </p>

              <p>
                {[
                  profile?.phone,
                  profile?.email,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <div className="invoice-number-block">
              <strong>
                {selectedInvoice.invoiceNumber}
              </strong>

              <span>
                {displayStatus(
                  selectedInvoice,
                )}
              </span>
            </div>
          </div>

          <div className="invoice-party-grid">
            <div>
              <span className="eyebrow">
                Bill to
              </span>

              <strong>
                {selectedInvoice.customerName}
              </strong>

              <p>
                {selectedInvoice.customerAddress}
              </p>

              <p>
                {[
                  selectedInvoice.customerPhone,
                  selectedInvoice.customerEmail,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <div>
              <span className="eyebrow">
                Dates
              </span>

              <p>
                Issue: {
                  selectedInvoice.issueDate
                }
              </p>

              <p>
                Due: {
                  selectedInvoice.dueDate
                }
              </p>
            </div>
          </div>

          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>
                    Description
                  </th>

                  <th>
                    Qty
                  </th>

                  <th>
                    Unit
                  </th>

                  <th>
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {selectedInvoice.lines.map(
                  (line) => (
                    <tr key={line.id}>
                      <td>
                        {line.description}
                      </td>

                      <td>
                        {line.quantity}
                      </td>

                      <td>
                        {money(
                          line.unitPriceMinor,
                          selectedInvoice.currency,
                        )}
                      </td>

                      <td>
                        {money(
                          line.lineTotalMinor,
                          selectedInvoice.currency,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="invoice-total-grid">
            <span>
              Subtotal
            </span>

            <strong>
              {money(
                selectedInvoice.subtotalMinor,
                selectedInvoice.currency,
              )}
            </strong>

            {selectedInvoice.taxEnabled && (
              <>
                <span>
                  {selectedInvoice.taxName}
                </span>

                <strong>
                  {money(
                    selectedInvoice.taxMinor,
                    selectedInvoice.currency,
                  )}
                </strong>
              </>
            )}

            <span>
              Total
            </span>

            <strong>
              {money(
                selectedInvoice.totalMinor,
                selectedInvoice.currency,
              )}
            </strong>

            <span>
              Paid
            </span>

            <strong>
              {money(
                selectedInvoice.amountPaidMinor,
                selectedInvoice.currency,
              )}
            </strong>

            <span>
              Balance due
            </span>

            <strong>
              {money(
                selectedInvoice.balanceDueMinor,
                selectedInvoice.currency,
              )}
            </strong>
          </div>

          {selectedInvoice.notes && (
            <div className="invoice-notes">
              <span className="eyebrow">
                Notes
              </span>

              <p>
                {selectedInvoice.notes}
              </p>
            </div>
          )}

          <div className="invoice-payment-history">
            <span className="eyebrow">
              Payment history
            </span>

            {payments.length === 0 ? (
              <p>
                No payments recorded.
              </p>
            ) : (
              payments.map(
                (payment) => (
                  <div
                    className="invoice-payment-row"
                    key={payment.id}
                  >
                    <span>
                      {payment.paymentDate}
                    </span>

                    <span>
                      {payment.status}
                    </span>

                    <strong>
                      {money(
                        payment.amountMinor,
                        payment.currency,
                      )}
                    </strong>
                  </div>
                ),
              )
            )}
          </div>
        </section>
      )}

      <section className="panel invoice-list-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Invoice register
            </span>

            <h2>
              All Invoices
            </h2>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="mini-empty">
            <h3>
              No invoices yet
            </h3>

            <p>
              Create a draft invoice for a business customer.
            </p>

            <button
              type="button"
              className="button primary"
              disabled={
                customers.length === 0
              }
              onClick={
                openNewInvoice
              }
            >
              New Invoice
            </button>
          </div>
        ) : (
          <div className="business-invoice-list">
            {invoices.map(
              (invoice) => (
                <article
                  className="business-invoice-card"
                  key={invoice.id}
                >
                  <div className="business-invoice-main">
                    <div className="business-invoice-meta">
                      <span>
                        {invoice.invoiceNumber}
                      </span>

                      <span
                        className={
                          'invoice-status '
                          + invoice.status
                        }
                      >
                        {displayStatus(
                          invoice,
                        )}
                      </span>
                    </div>

                    <h3>
                      {invoice.customerName}
                    </h3>

                    <p>
                      Issued {
                        invoice.issueDate
                      } · Due {
                        invoice.dueDate
                      }
                    </p>
                  </div>

                  <div className="business-invoice-money">
                    <strong>
                      {money(
                        invoice.totalMinor,
                        invoice.currency,
                      )}
                    </strong>

                    <span>
                      Due {
                        money(
                          invoice.balanceDueMinor,
                          invoice.currency,
                        )
                      }
                    </span>
                  </div>

                  <div className="button-row">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={
                        () =>
                          void openInvoice(
                            invoice,
                          )
                      }
                    >
                      View / Print
                    </button>

                    {invoice.status
                      === 'draft' && (
                      <>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={
                            () =>
                              openEditInvoice(
                                invoice,
                              )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="button primary"
                          disabled={busy}
                          onClick={
                            () =>
                              void issueInvoice(
                                invoice,
                              )
                          }
                        >
                          Issue
                        </button>
                      </>
                    )}

                    {(
                      invoice.status
                        === 'issued'
                      || invoice.status
                        === 'partially_paid'
                    ) && (
                      <button
                        type="button"
                        className="button primary"
                        disabled={
                          busy
                          || accounts.length
                            === 0
                        }
                        onClick={
                          () =>
                            openPayment(
                              invoice,
                            )
                        }
                      >
                        Record Payment
                      </button>
                    )}

                    {(
                      invoice.status
                        === 'draft'
                      || (
                        invoice.status
                          === 'issued'
                        && invoice.amountPaidMinor
                          === 0
                      )
                    ) && (
                      <button
                        type="button"
                        className="text-button danger"
                        disabled={busy}
                        onClick={
                          () =>
                            void cancelInvoice(
                              invoice,
                            )
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
      {cancelInvoiceTarget && (
        <Modal
          title="Cancel invoice"
          onClose={() => {
            if (!busy) {
              setCancelInvoiceTarget(
                null,
              );
            }
          }}
        >
          <div className="stack">
            <p>
              Cancel{' '}
              <strong>
                {cancelInvoiceTarget.invoiceNumber}
              </strong>
              ?
            </p>

            <p className="muted">
              The invoice will be marked as cancelled.
            </p>

            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  setCancelInvoiceTarget(
                    null,
                  )
                }
              >
                Keep invoice
              </button>

              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void performCancelInvoice(
                    cancelInvoiceTarget!,
                  )
                }
              >
                {busy
                  ? 'Cancelling…'
                  : 'Cancel invoice'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </main>
  );
}
