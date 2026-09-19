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

import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBusinessProfile,
  listBusinessContacts,
} from '../../repositories/businessAdvancedRepository';
import {
  convertBusinessQuotationToInvoice,
  createBusinessQuotation,
  getBusinessQuotationWorkspace,
  setBusinessQuotationStatus,
  updateBusinessQuotation,
  type BusinessQuotationInput,
} from '../../repositories/businessQuotationRepository';
import { getSpace } from '../../repositories/spaceRepository';
import type {
  BusinessContact,
  BusinessProfile,
  BusinessQuotation,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

interface LineForm {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface QuoteForm {
  customerId: string;
  quoteDate: string;
  validUntil: string;
  notes: string;
  lines: LineForm[];
}

function localToday() {
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
) {
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

function blankLine(): LineForm {
  return {
    description: '',
    quantity: '1',
    unitPrice: '0.00',
  };
}

function emptyQuoteForm(): QuoteForm {
  const quoteDate = localToday();

  return {
    customerId: '',
    quoteDate,
    validUntil:
      plusDays(
        quoteDate,
        14,
      ),
    notes: '',
    lines: [
      blankLine(),
    ],
  };
}

function money(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency,
    },
  ).format(
    value / 100,
  );
}

function minorInput(
  value: number,
) {
  return (
    value / 100
  ).toFixed(2);
}

function quotationInput(
  quotation: BusinessQuotation,
): QuoteForm {
  return {
    customerId:
      quotation.customerId,
    quoteDate:
      quotation.quoteDate,
    validUntil:
      quotation.validUntil,
    notes:
      quotation.notes,
    lines:
      quotation.lines.map(
        (line) => ({
          description:
            line.description,
          quantity:
            String(
              line.quantity,
            ),
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
  form: QuoteForm,
): BusinessQuotationInput {
  if (!form.customerId) {
    throw new Error(
      'Choose a customer.',
    );
  }

  if (
    !form.quoteDate
    || !form.validUntil
  ) {
    throw new Error(
      'Quotation date and valid-until date are required.',
    );
  }

  if (
    form.validUntil < form.quoteDate
  ) {
    throw new Error(
      'Valid-until date cannot be before the quotation date.',
    );
  }

  const lines =
    form.lines.map(
      (line) => {
        const quantity =
          Number(
            line.quantity,
          );

        const unitPrice =
          Number(
            line.unitPrice,
          );

        if (
          !Number.isInteger(quantity)
          || quantity <= 0
        ) {
          throw new Error(
            'Each quantity must be a whole number greater than zero.',
          );
        }

        if (
          !Number.isFinite(unitPrice)
          || unitPrice < 0
        ) {
          throw new Error(
            'Each unit price must be zero or more.',
          );
        }

        if (
          !line.description.trim()
        ) {
          throw new Error(
            'Each quotation line needs a description.',
          );
        }

        return {
          description:
            line.description.trim(),
          quantity,
          unitPriceMinor:
            Math.round(
              unitPrice * 100,
            ),
        };
      },
    );

  return {
    spaceId,
    customerId:
      form.customerId,
    quoteDate:
      form.quoteDate,
    validUntil:
      form.validUntil,
    lines,
    notes:
      form.notes.trim(),
  };
}

function statusLabel(
  status: BusinessQuotation['status'],
) {
  return status
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      (value) =>
        value.toUpperCase(),
    );
}

export function BusinessQuotationsPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [profile, setProfile] =
    useState<BusinessProfile | null>(
      null,
    );

  const [contacts, setContacts] =
    useState<BusinessContact[]>([]);

  const [quotations, setQuotations] =
    useState<BusinessQuotation[]>([]);

  const [canManage, setCanManage] =
    useState(false);

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
      | BusinessQuotation
      | null
    >(null);

  const [form, setForm] =
    useState<QuoteForm>(
      emptyQuoteForm(),
    );

  const [selected, setSelected] =
    useState<BusinessQuotation | null>(
      null,
    );

  const load = useCallback(
    async () => {
      if (!user || !spaceId) return;

      setLoading(true);
      setError('');
      setCanManage(false);

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
          workspace,
        ] = await Promise.all([
          getBusinessProfile(
            spaceId,
          ),
          listBusinessContacts(
            spaceId,
          ),
          getBusinessQuotationWorkspace(
            spaceId,
          ),
        ]);

        setProfile(nextProfile);
        setContacts(nextContacts);
        setQuotations(
          workspace.quotations,
        );
        setCanManage(
          workspace.canManageQuotations
            === true,
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

  const customers = useMemo(
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

  const activeQuotes = useMemo(
    () =>
      quotations.filter(
        (item) =>
          ![
            'converted',
            'cancelled',
            'rejected',
          ].includes(
            item.status,
          ),
      ),
    [quotations],
  );

  const activeValue = useMemo(
    () =>
      activeQuotes.reduce(
        (sum, item) =>
          sum + item.totalMinor,
        0,
      ),
    [activeQuotes],
  );

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading quotations...
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
          eyebrow="Business quotations"
          title="Business Space not found"
          description="Open a Business Space to manage quotations."
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

  if (!canManage) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business quotations"
          title={space.name}
          description="Quotation administration is available to the Business Owner and authorised Business Admins."
          action={
            <Link
              className="button secondary"
              to={
                '/business/'
                + space.id
                + '?workspace=documents'
              }
            >
              Back to Sales & Documents
            </Link>
          }
        />
        {error && (
          <div className="notice error">
            {error}
          </div>
        )}
      </main>
    );
  }

  const openNew = () => {
    const next =
      emptyQuoteForm();

    if (customers[0]) {
      next.customerId =
        customers[0].id;
    }

    setForm(next);
    setEditor('new');
    setSelected(null);
    setError('');
  };

  const openEdit = (
    quotation: BusinessQuotation,
  ) => {
    setForm(
      quotationInput(
        quotation,
      ),
    );
    setEditor(quotation);
    setSelected(null);
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

  const save = async (
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
        await createBusinessQuotation(
          input,
        );
        setFeedback(
          'Quotation created as a draft.',
        );
      } else if (editor) {
        await updateBusinessQuotation(
          editor.id,
          {
            customerId:
              input.customerId,
            quoteDate:
              input.quoteDate,
            validUntil:
              input.validUntil,
            lines:
              input.lines,
            notes:
              input.notes,
          },
        );
        setFeedback(
          'Draft quotation updated.',
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

  const changeStatus = async (
    quotation: BusinessQuotation,
    status:
      | 'sent'
      | 'accepted'
      | 'rejected'
      | 'cancelled',
  ) => {
    setBusy(true);
    setError('');

    try {
      await setBusinessQuotationStatus(
        quotation.id,
        status,
      );

      setFeedback(
        quotation.quotationNumber
        + ' marked '
        + status
        + '.',
      );

      setSelected(null);
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

  const convertToInvoice = async (
    quotation: BusinessQuotation,
  ) => {
    setBusy(true);
    setError('');

    try {
      const issueDate =
        localToday();

      const result =
        await convertBusinessQuotationToInvoice(
          quotation.id,
          issueDate,
          plusDays(
            issueDate,
            7,
          ),
        );

      setFeedback(
        quotation.quotationNumber
        + ' converted to '
        + result.invoiceNumber
        + '.',
      );

      setSelected(null);
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
    <main className="page business-quotations-page">
      <PageHeader
        eyebrow="Sales & Documents"
        title="Quotations"
        description={
          'Prepare customer quotations for '
          + (
            profile?.businessName
            || space.name
          )
          + ', then convert accepted quotations into invoices without retyping.'
        }
        action={
          <div className="button-row">
            <Link
              className="button secondary"
              to={
                '/business/'
                + space.id
                + '?workspace=documents'
              }
            >
              Back
            </Link>

            <button
              className="button primary"
              type="button"
              onClick={openNew}
              disabled={
                busy
                || !customers.length
              }
            >
              New Quotation
            </button>
          </div>
        }
      />

      {feedback && (
        <div className="notice success">
          {feedback}
        </div>
      )}

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!customers.length && (
        <div className="notice">
          Add a Business customer first before creating a quotation.
        </div>
      )}

      <div className="summary-grid">
        <article className="summary-card featured">
          <span>Active quotations</span>
          <strong>{activeQuotes.length}</strong>
          <small>
            Draft, sent and accepted
          </small>
        </article>

        <article className="summary-card">
          <span>Active quoted value</span>
          <strong>
            {money(
              activeValue,
              space.currency,
            )}
          </strong>
          <small>
            Excludes converted, rejected and cancelled
          </small>
        </article>

        <article className="summary-card">
          <span>Converted</span>
          <strong>
            {
              quotations.filter(
                (item) =>
                  item.status
                    === 'converted',
              ).length
            }
          </strong>
          <small>
            Converted to invoices
          </small>
        </article>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Quotation history</h3>
            <p>
              Draft, send, accept and convert quotations into invoices.
            </p>
          </div>
        </div>

        <div className="business-document-list-v115">
          {quotations.map(
            (quotation) => (
              <button
                key={quotation.id}
                type="button"
                className="business-document-row-v115"
                onClick={() =>
                  setSelected(
                    quotation,
                  )
                }
              >
                <div>
                  <strong>
                    {quotation.quotationNumber}
                  </strong>
                  <small>
                    {quotation.customerName}
                    {' · '}
                    {quotation.quoteDate}
                    {' · Valid until '}
                    {quotation.validUntil}
                  </small>
                </div>

                <span
                  className="status-badge posted"
                >
                  {statusLabel(
                    quotation.status,
                  )}
                </span>

                <strong>
                  {money(
                    quotation.totalMinor,
                    quotation.currency,
                  )}
                </strong>
              </button>
            ),
          )}
        </div>

        {!quotations.length && (
          <div className="empty-inline">
            No quotations yet.
          </div>
        )}
      </section>

      {editor && (
        <Modal
          title={
            editor === 'new'
              ? 'New Quotation'
              : 'Edit '
                + editor.quotationNumber
          }
          onClose={() =>
            !busy
            && setEditor(null)
          }
        >
          <form
            className="form-stack"
            onSubmit={save}
          >
            <label>
              Customer
              <select
                value={form.customerId}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      customerId:
                        event.target.value,
                    }),
                  )
                }
                required
              >
                <option value="">
                  Choose customer
                </option>
                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="form-grid">
              <label>
                Quotation date
                <input
                  type="date"
                  value={form.quoteDate}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        quoteDate:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />
              </label>

              <label>
                Valid until
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        validUntil:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />
              </label>
            </div>

            <div className="business-quotation-lines-v115">
              {form.lines.map(
                (line, index) => (
                  <div
                    className="business-quotation-line-v115"
                    key={index}
                  >
                    <label>
                      Description
                      <input
                        value={line.description}
                        onChange={(event) =>
                          changeLine(
                            index,
                            {
                              description:
                                event.target.value,
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Qty
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(event) =>
                          changeLine(
                            index,
                            {
                              quantity:
                                event.target.value,
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Unit price
                      <input
                        inputMode="decimal"
                        value={line.unitPrice}
                        onChange={(event) =>
                          changeLine(
                            index,
                            {
                              unitPrice:
                                event.target.value,
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <button
                      className="button ghost"
                      type="button"
                      disabled={
                        form.lines.length
                          <= 1
                      }
                      onClick={() =>
                        setForm(
                          (current) => ({
                            ...current,
                            lines:
                              current.lines.filter(
                                (
                                  _item,
                                  lineIndex,
                                ) =>
                                  lineIndex
                                  !== index,
                              ),
                          }),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ),
              )}
            </div>

            <button
              className="button secondary"
              type="button"
              onClick={() =>
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
              Add line
            </button>

            <label>
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
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

            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setEditor(null)
                }
                disabled={busy}
              >
                Cancel
              </button>

              <button
                className="button primary"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'Saving...'
                  : 'Save Quotation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal
          title={
            selected.quotationNumber
          }
          onClose={() =>
            !busy
            && setSelected(null)
          }
        >
          <div className="business-quotation-preview-v115">
            <header>
              <div>
                <span className="eyebrow">
                  Quotation
                </span>
                <h2>
                  {selected.quotationNumber}
                </h2>
              </div>

              <span className="status-badge posted">
                {statusLabel(
                  selected.status,
                )}
              </span>
            </header>

            <p>
              <strong>
                {selected.customerName}
              </strong>
              <br />
              {selected.customerPhone}
              {selected.customerEmail
                ? ' · '
                  + selected.customerEmail
                : ''}
            </p>

            <p>
              Quote date:
              {' '}
              {selected.quoteDate}
              <br />
              Valid until:
              {' '}
              {selected.validUntil}
            </p>

            <div className="sme-pos-receipt">
              {selected.lines.map(
                (line) => (
                  <div
                    className="sme-pos-receipt-line"
                    key={line.id}
                  >
                    <span>
                      {line.quantity}
                      {' × '}
                      {line.description}
                    </span>
                    <strong>
                      {money(
                        line.lineTotalMinor,
                        selected.currency,
                      )}
                    </strong>
                  </div>
                ),
              )}

              <div className="sme-pos-receipt-totals">
                <span>
                  Subtotal
                  <strong>
                    {money(
                      selected.subtotalMinor,
                      selected.currency,
                    )}
                  </strong>
                </span>

                {selected.taxEnabled && (
                  <span>
                    {selected.taxName}
                    <strong>
                      {money(
                        selected.taxMinor,
                        selected.currency,
                      )}
                    </strong>
                  </span>
                )}

                <span>
                  Total
                  <strong>
                    {money(
                      selected.totalMinor,
                      selected.currency,
                    )}
                  </strong>
                </span>
              </div>
            </div>

            {selected.notes && (
              <p>{selected.notes}</p>
            )}

            {selected.convertedInvoiceNumber && (
              <div className="notice success">
                Converted to
                {' '}
                <Link
                  to={
                    '/spaces/'
                    + space.id
                    + '/business/invoices'
                  }
                >
                  {selected.convertedInvoiceNumber}
                </Link>
              </div>
            )}
          </div>

          <div className="modal-actions">
            {selected.status === 'draft' && (
              <>
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    openEdit(selected)
                  }
                >
                  Edit
                </button>

                <button
                  className="button primary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void changeStatus(
                      selected,
                      'sent',
                    )
                  }
                >
                  Mark Sent
                </button>
              </>
            )}

            {selected.status === 'sent' && (
              <>
                <button
                  className="button primary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void changeStatus(
                      selected,
                      'accepted',
                    )
                  }
                >
                  Mark Accepted
                </button>

                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void changeStatus(
                      selected,
                      'rejected',
                    )
                  }
                >
                  Mark Rejected
                </button>
              </>
            )}

            {selected.status === 'accepted' && (
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() =>
                  void convertToInvoice(
                    selected,
                  )
                }
              >
                Convert to Invoice
              </button>
            )}

            {![
              'converted',
              'cancelled',
            ].includes(
              selected.status,
            ) && (
              <button
                className="button ghost danger"
                type="button"
                disabled={busy}
                onClick={() =>
                  void changeStatus(
                    selected,
                    'cancelled',
                  )
                }
              >
                Cancel Quotation
              </button>
            )}

            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setSelected(null)
              }
              disabled={busy}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
