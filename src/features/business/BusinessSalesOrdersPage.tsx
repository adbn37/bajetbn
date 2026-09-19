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

import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  convertBusinessSalesOrderToInvoice,
  getBusinessSalesOrderWorkspace,
  setBusinessSalesOrderStatus,
} from '../../repositories/businessSalesOrderRepository';
import { getSpace } from '../../repositories/spaceRepository';
import type {
  BusinessSalesOrder,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

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

function statusLabel(
  status: BusinessSalesOrder['status'],
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

export function BusinessSalesOrdersPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [orders, setOrders] =
    useState<BusinessSalesOrder[]>([]);

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

  const [selected, setSelected] =
    useState<BusinessSalesOrder | null>(
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

        const workspace =
          await getBusinessSalesOrderWorkspace(
            spaceId,
          );

        setOrders(
          workspace.salesOrders,
        );

        setCanManage(
          workspace.canManageSalesOrders
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

  const openOrders = useMemo(
    () =>
      orders.filter(
        (item) =>
          item.status === 'draft'
          || item.status === 'confirmed',
      ),
    [orders],
  );

  const openValue = useMemo(
    () =>
      openOrders.reduce(
        (sum, item) =>
          sum + item.totalMinor,
        0,
      ),
    [openOrders],
  );

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading Sales Orders...
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
          eyebrow="Sales & Documents"
          title="Business Space not found"
          description="Open a Business Space to manage Sales Orders."
        />
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Sales & Documents"
          title={space.name}
          description="Sales Order administration is available to the Business Owner and authorised Business Admins."
          action={
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

  const changeStatus = async (
    order: BusinessSalesOrder,
    status: 'confirmed' | 'cancelled',
  ) => {
    setBusy(true);
    setError('');

    try {
      await setBusinessSalesOrderStatus(
        order.id,
        status,
      );

      setFeedback(
        order.salesOrderNumber
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
    order: BusinessSalesOrder,
  ) => {
    setBusy(true);
    setError('');

    try {
      const issueDate =
        localToday();

      const result =
        await convertBusinessSalesOrderToInvoice(
          order.id,
          issueDate,
          plusDays(
            issueDate,
            7,
          ),
        );

      setFeedback(
        order.salesOrderNumber
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
    <main className="page business-sales-orders-page">
      <PageHeader
        eyebrow="Sales & Documents"
        title="Sales Orders"
        description="Confirm accepted customer work before invoicing. Sales Orders created from Quotations retain the customer, pricing and document trail."
        action={
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

      <div className="summary-grid">
        <article className="summary-card featured">
          <span>Open Sales Orders</span>
          <strong>{openOrders.length}</strong>
          <small>Draft and confirmed</small>
        </article>

        <article className="summary-card">
          <span>Open order value</span>
          <strong>
            {money(
              openValue,
              space.currency,
            )}
          </strong>
          <small>Not yet invoiced</small>
        </article>

        <article className="summary-card">
          <span>Invoiced</span>
          <strong>
            {
              orders.filter(
                (item) =>
                  item.status === 'invoiced',
              ).length
            }
          </strong>
          <small>Converted into invoices</small>
        </article>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Sales Order history</h3>
            <p>
              Sales Orders are created from accepted Quotations.
            </p>
          </div>
        </div>

        <div className="business-document-list-v115">
          {orders.map(
            (order) => (
              <button
                type="button"
                key={order.id}
                className="business-document-row-v115"
                onClick={() =>
                  setSelected(order)
                }
              >
                <div>
                  <strong>
                    {order.salesOrderNumber}
                  </strong>
                  <small>
                    {order.customerName}
                    {' · '}
                    {order.orderDate}
                    {' · From '}
                    {order.sourceQuotationNumber}
                  </small>
                </div>

                <span className="status-badge posted">
                  {statusLabel(
                    order.status,
                  )}
                </span>

                <strong>
                  {money(
                    order.totalMinor,
                    order.currency,
                  )}
                </strong>
              </button>
            ),
          )}
        </div>

        {!orders.length && (
          <div className="empty-inline">
            No Sales Orders yet. Open an accepted Quotation and choose Create Sales Order.
          </div>
        )}
      </section>

      {selected && (
        <Modal
          title={selected.salesOrderNumber}
          onClose={() =>
            !busy
            && setSelected(null)
          }
        >
          <div className="business-quotation-preview-v115">
            <header>
              <div>
                <span className="eyebrow">
                  Sales Order
                </span>
                <h2>
                  {selected.salesOrderNumber}
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
              From quotation
              {' '}
              {selected.sourceQuotationNumber}
            </p>

            <p>
              Order date:
              {' '}
              {selected.orderDate}
              <br />
              Expected:
              {' '}
              {selected.expectedDate}
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
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() =>
                  void changeStatus(
                    selected,
                    'confirmed',
                  )
                }
              >
                Confirm Sales Order
              </button>
            )}

            {selected.status === 'confirmed' && (
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

            {[
              'draft',
              'confirmed',
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
                Cancel Sales Order
              </button>
            )}

            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                setSelected(null)
              }
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
