import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import {
  getBusinessInvoiceWorkspace,
} from '../../repositories/businessInvoiceRepository';
import {
  getBusinessQuotationWorkspace,
} from '../../repositories/businessQuotationRepository';
import {
  getBusinessSalesOrderWorkspace,
} from '../../repositories/businessSalesOrderRepository';
import {
  getMarketplacePosWorkspace,
  getSmePosStaffWorkspace,
  listSmePosReservations,
} from '../../repositories/smePosRepository';

import type {
  BusinessIndustry,
  BusinessInvoice,
  BusinessQuotation,
  BusinessSalesOrder,
  FinancialTransaction,
  SmePosPayout,
  SmePosReservation,
  SmePosSale,
} from '../../types/models';

import { formatMoney } from '../../utils/money';

type TimestampLike = {
  toMillis?: () => number;
};

type ActivityTone =
  | 'income'
  | 'expense'
  | 'neutral'
  | 'document'
  | 'warning';

interface BusinessActivityItem {
  id: string;
  title: string;
  detail: string;
  meta: string;
  amountMinor?: number;
  currency: string;
  tone: ActivityTone;
  icon: string;
  time: number;
  to: string;
}

function timestampMillis(
  value?: TimestampLike | null,
) {
  return value?.toMillis?.() || 0;
}

function dateMillis(
  value?: string | null,
) {
  if (!value) return 0;

  const parsed =
    Date.parse(
      value.length === 10
        ? value + 'T12:00:00'
        : value,
    );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function displayDate(
  time: number,
) {
  if (!time) return '';

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    },
  ).format(
    new Date(time),
  );
}

function sentenceStatus(
  value: string,
) {
  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function paymentLabel(
  transaction: FinancialTransaction,
) {
  if (transaction.businessInvoicePaymentId) {
    return 'Invoice payment';
  }

  if (transaction.commitmentPaymentId) {
    return 'Bill payment';
  }

  if (
    transaction.linkedMoneyKind
      === 'seller_payout'
  ) {
    return 'Seller payout';
  }

  if (transaction.type === 'income') {
    return 'Money in';
  }

  if (transaction.type === 'expense') {
    return 'Expense';
  }

  return 'Transfer';
}

function transactionActivity(
  spaceId: string,
  item: FinancialTransaction,
): BusinessActivityItem {
  const time =
    timestampMillis(item.postedAt)
    || timestampMillis(item.createdAt)
    || dateMillis(
      item.transactionDate,
    );

  const title =
    item.businessInvoicePaymentId
      ? 'Invoice payment'
      : paymentLabel(item);

  const detail =
    item.counterparty?.trim()
    || item.note?.trim()
    || item.category?.trim()
    || title;

  const meta = [
    item.category,
    item.paymentMethodLabel,
    item.transactionDate,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id:
      'transaction-'
      + item.id,
    title,
    detail,
    meta,
    amountMinor:
      item.amountMinor,
    currency:
      item.currency,
    tone:
      item.type === 'income'
        ? 'income'
        : item.type === 'expense'
          ? 'expense'
          : 'neutral',
    icon:
      item.type === 'income'
        ? '↓'
        : item.type === 'expense'
          ? '↑'
          : '↔',
    time,
    to:
      '/spaces/'
      + spaceId
      + '/business/money',
  };
}

function saleActivity(
  spaceId: string,
  sale: SmePosSale,
): BusinessActivityItem {
  const marketplace =
    sale.sourceMode
      === 'marketplace_consignment';

  const firstItem =
    sale.items[0];

  const detail =
    sale.itemCount === 1
    && firstItem
      ? firstItem.productName
        + ' × '
        + firstItem.quantity
      : sale.itemCount
        + ' items';

  const meta = [
    sale.customerName
      || 'Walk-in Customer',
    sale.paymentMethodLabel,
    sale.paymentAccountName,
    sale.receiptNumber,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id:
      'sale-'
      + sale.id,
    title:
      (marketplace
        ? 'Marketplace Sale '
        : 'POS Sale ')
      + sale.receiptNumber,
    detail,
    meta,
    amountMinor:
      sale.totalMinor,
    currency:
      sale.currency,
    tone:
      sale.status === 'voided'
        ? 'warning'
        : 'income',
    icon:
      marketplace
        ? 'M'
        : 'P',
    time:
      timestampMillis(
        sale.createdAt,
      )
      || dateMillis(
        sale.saleDate,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/pos?tab=sales',
  };
}

function refundActivity(
  spaceId: string,
  sale: SmePosSale,
): BusinessActivityItem | null {
  if (
    sale.returnedMinor <= 0
    && (
      sale.voidedMinor
      || 0
    ) <= 0
  ) {
    return null;
  }

  const amount =
    (sale.voidedMinor || 0)
    > 0
      ? sale.voidedMinor || 0
      : sale.returnedMinor;

  const voided =
    (sale.voidedMinor || 0)
    > 0;

  return {
    id:
      'refund-'
      + sale.id,
    title:
      voided
        ? 'POS sale voided'
        : 'POS refund',
    detail:
      sale.receiptNumber
      + ' · '
      + (
        sale.customerName
        || 'Walk-in Customer'
      ),
    meta: [
      voided
        ? sale.voidReason
        : sale.returnStatus
          === 'full'
          ? 'Full refund'
          : 'Partial refund',
      sale.paymentAccountName,
    ]
      .filter(Boolean)
      .join(' · '),
    amountMinor:
      amount,
    currency:
      sale.currency,
    tone:
      'expense',
    icon:
      'R',
    time:
      timestampMillis(
        sale.voidedAt,
      )
      || dateMillis(
        sale.voidDate,
      )
      || dateMillis(
        sale.lastReturnDate,
      )
      || timestampMillis(
        sale.updatedAt,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/pos?tab=sales',
  };
}

function payoutActivity(
  spaceId: string,
  payout: SmePosPayout,
): BusinessActivityItem {
  return {
    id:
      'payout-'
      + payout.id,
    title:
      'Seller payout',
    detail:
      payout.sellerName,
    meta: [
      payout.paymentMethodLabel,
      payout.paymentAccountName,
      payout.reference,
    ]
      .filter(Boolean)
      .join(' · '),
    amountMinor:
      payout.amountMinor,
    currency:
      payout.currency,
    tone:
      'expense',
    icon:
      'S',
    time:
      timestampMillis(
        payout.createdAt,
      )
      || dateMillis(
        payout.payoutDate,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/pos?tab=payouts',
  };
}

function reservationActivity(
  spaceId: string,
  item: SmePosReservation,
): BusinessActivityItem {
  return {
    id:
      'reservation-'
      + item.id,
    title:
      'Booking '
      + item.reservationNumber,
    detail:
      item.customerName
      + ' · '
      + item.itemCount
      + (
        item.itemCount === 1
          ? ' item'
          : ' items'
      ),
    meta: [
      sentenceStatus(
        item.status,
      ),
      item.depositMinor > 0
        ? 'Deposit '
          + formatMoney(
            item.depositMinor,
            item.currency,
          )
        : '',
      item.dueDate
        ? 'Due ' + item.dueDate
        : '',
    ]
      .filter(Boolean)
      .join(' · '),
    amountMinor:
      item.totalMinor,
    currency:
      item.currency,
    tone:
      item.status === 'cancelled'
        ? 'warning'
        : 'neutral',
    icon:
      'B',
    time:
      timestampMillis(
        item.updatedAt,
      )
      || timestampMillis(
        item.createdAt,
      )
      || dateMillis(
        item.reservationDate,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/pos?tab=bookings',
  };
}

function quotationActivity(
  spaceId: string,
  item: BusinessQuotation,
): BusinessActivityItem {
  const status =
    item.status;

  const title =
    status === 'accepted'
      ? 'Quotation accepted'
      : status === 'rejected'
        ? 'Quotation rejected'
        : status === 'sent'
          ? 'Quotation sent'
          : status === 'converted'
            ? 'Quotation converted'
            : status === 'cancelled'
              ? 'Quotation cancelled'
              : 'Quotation drafted';

  const time =
    status === 'accepted'
      ? timestampMillis(
          item.acceptedAt,
        )
      : status === 'rejected'
        ? timestampMillis(
            item.rejectedAt,
          )
        : status === 'sent'
          ? timestampMillis(
              item.sentAt,
            )
          : status === 'converted'
            ? timestampMillis(
                item.convertedAt,
              )
          : status === 'cancelled'
            ? timestampMillis(
                item.cancelledAt,
              )
            : timestampMillis(
                item.createdAt,
              );

  return {
    id:
      'quotation-'
      + item.id,
    title:
      title
      + ' · '
      + item.quotationNumber,
    detail:
      item.customerName,
    meta:
      'Valid until '
      + item.validUntil,
    amountMinor:
      item.totalMinor,
    currency:
      item.currency,
    tone:
      status === 'rejected'
      || status === 'cancelled'
        ? 'warning'
        : 'document',
    icon:
      'Q',
    time:
      time
      || timestampMillis(
        item.updatedAt,
      )
      || dateMillis(
        item.quoteDate,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/business/quotations',
  };
}

function salesOrderActivity(
  spaceId: string,
  item: BusinessSalesOrder,
): BusinessActivityItem {
  const title =
    item.status === 'confirmed'
      ? 'Sales Order confirmed'
      : item.status === 'invoiced'
        ? 'Sales Order invoiced'
        : item.status === 'cancelled'
          ? 'Sales Order cancelled'
          : 'Sales Order drafted';

  return {
    id:
      'sales-order-'
      + item.id,
    title:
      title
      + ' · '
      + item.salesOrderNumber,
    detail:
      item.customerName
      + ' · From '
      + item.sourceQuotationNumber,
    meta:
      'Expected '
      + item.expectedDate,
    amountMinor:
      item.totalMinor,
    currency:
      item.currency,
    tone:
      item.status === 'cancelled'
        ? 'warning'
        : 'document',
    icon:
      'SO',
    time:
      item.status === 'confirmed'
        ? timestampMillis(
            item.confirmedAt,
          )
        : item.status === 'invoiced'
          ? timestampMillis(
              item.invoicedAt,
            )
          : item.status === 'cancelled'
            ? timestampMillis(
                item.cancelledAt,
              )
            : timestampMillis(
                item.createdAt,
              )
      || timestampMillis(
        item.updatedAt,
      )
      || dateMillis(
        item.orderDate,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/business/sales-orders',
  };
}

function invoiceActivity(
  spaceId: string,
  item: BusinessInvoice,
): BusinessActivityItem {
  const title =
    item.status === 'issued'
      ? 'Invoice issued'
      : item.status === 'partially_paid'
        ? 'Invoice partially paid'
        : item.status === 'paid'
          ? 'Invoice paid'
          : item.status === 'cancelled'
            ? 'Invoice cancelled'
            : 'Invoice drafted';

  return {
    id:
      'invoice-'
      + item.id,
    title:
      title
      + ' · '
      + item.invoiceNumber,
    detail:
      item.customerName,
    meta: [
      'Due ' + item.dueDate,
      item.balanceDueMinor > 0
        ? 'Balance '
          + formatMoney(
            item.balanceDueMinor,
            item.currency,
          )
        : '',
    ]
      .filter(Boolean)
      .join(' · '),
    amountMinor:
      item.totalMinor,
    currency:
      item.currency,
    tone:
      item.status === 'cancelled'
        ? 'warning'
        : 'document',
    icon:
      'I',
    time:
      item.status === 'issued'
        ? timestampMillis(
            item.issuedAt,
          )
        : item.status === 'cancelled'
          ? timestampMillis(
              item.cancelledAt,
            )
          : timestampMillis(
              item.updatedAt,
            )
      || timestampMillis(
        item.createdAt,
      )
      || dateMillis(
        item.issueDate,
      ),
    to:
      '/spaces/'
      + spaceId
      + '/business/invoices',
  };
}

export function BusinessActivityTimeline({
  spaceId,
  businessIndustry,
  transactions,
}: {
  spaceId: string;
  businessIndustry: BusinessIndustry;
  transactions: FinancialTransaction[];
}) {
  const [
    sales,
    setSales,
  ] = useState<SmePosSale[]>([]);

  const [
    payouts,
    setPayouts,
  ] = useState<SmePosPayout[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<SmePosReservation[]>([]);

  const [
    quotations,
    setQuotations,
  ] = useState<BusinessQuotation[]>([]);

  const [
    salesOrders,
    setSalesOrders,
  ] = useState<BusinessSalesOrder[]>([]);

  const [
    invoices,
    setInvoices,
  ] = useState<BusinessInvoice[]>([]);

  useEffect(
    () => {
      let active = true;

      void (async () => {
        const [
          quoteResult,
          orderResult,
          invoiceResult,
          reservationResult,
          posResult,
        ] = await Promise.allSettled([
          getBusinessQuotationWorkspace(
            spaceId,
          ),
          getBusinessSalesOrderWorkspace(
            spaceId,
          ),
          getBusinessInvoiceWorkspace(
            spaceId,
          ),
          listSmePosReservations(
            spaceId,
            true,
          ),
          businessIndustry === 'marketplace'
            ? getMarketplacePosWorkspace(
                spaceId,
              )
            : getSmePosStaffWorkspace(
                spaceId,
              ),
        ]);

        if (!active) return;

        setQuotations(
          quoteResult.status === 'fulfilled'
            ? quoteResult.value.quotations
            : [],
        );

        setSalesOrders(
          orderResult.status === 'fulfilled'
            ? orderResult.value.salesOrders
            : [],
        );

        setInvoices(
          invoiceResult.status === 'fulfilled'
            ? invoiceResult.value.invoices
            : [],
        );

        setReservations(
          reservationResult.status === 'fulfilled'
            ? reservationResult.value
            : [],
        );

        if (posResult.status === 'fulfilled') {
          setSales(
            posResult.value.sales || [],
          );

          setPayouts(
            'payouts' in posResult.value
              ? posResult.value.payouts || []
              : [],
          );
        } else {
          setSales([]);
          setPayouts([]);
        }
      })();

      return () => {
        active = false;
      };
    },
    [
      businessIndustry,
      spaceId,
    ],
  );

  const activities =
    useMemo(
      () => {
        const saleTransactionIds =
          new Set<string>();

        const payoutTransactionIds =
          new Set<string>();

        for (const sale of sales) {
          saleTransactionIds.add(
            sale.transactionId,
          );

          for (
            const transactionId
            of sale.transactionIds || []
          ) {
            saleTransactionIds.add(
              transactionId,
            );
          }
        }

        for (const payout of payouts) {
          payoutTransactionIds.add(
            payout.transactionId,
          );

          for (
            const transactionId
            of payout.transactionIds || []
          ) {
            payoutTransactionIds.add(
              transactionId,
            );
          }
        }

        const result: BusinessActivityItem[] = [];

        for (const sale of sales) {
          result.push(
            saleActivity(
              spaceId,
              sale,
            ),
          );

          const refund =
            refundActivity(
              spaceId,
              sale,
            );

          if (refund) {
            result.push(refund);
          }
        }

        for (const payout of payouts) {
          result.push(
            payoutActivity(
              spaceId,
              payout,
            ),
          );
        }

        for (
          const reservation
          of reservations
        ) {
          result.push(
            reservationActivity(
              spaceId,
              reservation,
            ),
          );
        }

        for (
          const quotation
          of quotations
        ) {
          result.push(
            quotationActivity(
              spaceId,
              quotation,
            ),
          );
        }

        for (
          const salesOrder
          of salesOrders
        ) {
          result.push(
            salesOrderActivity(
              spaceId,
              salesOrder,
            ),
          );
        }

        for (const invoice of invoices) {
          result.push(
            invoiceActivity(
              spaceId,
              invoice,
            ),
          );
        }

        for (
          const transaction
          of transactions
        ) {
          if (
            saleTransactionIds.has(
              transaction.id,
            )
            || payoutTransactionIds.has(
              transaction.id,
            )
          ) {
            continue;
          }

          result.push(
            transactionActivity(
              spaceId,
              transaction,
            ),
          );
        }

        return result
          .filter(
            (item) =>
              item.time > 0,
          )
          .sort(
            (a, b) =>
              b.time - a.time,
          )
          .slice(
            0,
            8,
          );
      },
      [
        invoices,
        payouts,
        quotations,
        reservations,
        sales,
        salesOrders,
        spaceId,
        transactions,
      ],
    );

  if (!activities.length) {
    return (
      <p className="muted">
        No Business activity yet.
      </p>
    );
  }

  return (
    <div
      className="business-activity-timeline-v115"
      data-business-activity-timeline
    >
      {activities.map(
        (item) => (
          <Link
            className={
              'business-activity-timeline-row-v115 '
              + item.tone
            }
            key={item.id}
            to={item.to}
          >
            <span
              className="business-activity-timeline-icon-v115"
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span className="business-activity-timeline-copy-v115">
              <strong>
                {item.title}
              </strong>

              <small>
                {item.detail}
              </small>

              {item.meta && (
                <small>
                  {item.meta}
                </small>
              )}

              <time>
                {displayDate(
                  item.time,
                )}
              </time>
            </span>

            {typeof item.amountMinor
              === 'number'
              && (
                <b>
                  {item.tone === 'expense'
                    ? '-'
                    : item.tone === 'income'
                      ? '+'
                      : ''}
                  {formatMoney(
                    item.amountMinor,
                    item.currency,
                  )}
                </b>
              )}
          </Link>
        ),
      )}
    </div>
  );
}
