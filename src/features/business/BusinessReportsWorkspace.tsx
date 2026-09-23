import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  SmePosItemPhoto,
} from '../../components/SmePosItemPhoto';

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
} from '../../repositories/smePosRepository';

import {
  listBusinessReportTransactionsForSpace,
} from '../../repositories/transactionRepository';

import type {
  BusinessIndustry,
  BusinessInvoice,
  BusinessQuotation,
  BusinessSalesOrder,
  FinancialTransaction,
  SmePosListing,
  SmePosPayout,
  SmePosProduct,
  SmePosSale,
  SmePosSeller,
} from '../../types/models';

import { formatMoney } from '../../utils/money';

type ReportRange =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last7'
  | 'month'
  | 'lastMonth'
  | 'custom';

type ReportTab =
  | 'money'
  | 'sales'
  | 'stock'
  | 'sellers'
  | 'documents'
  | 'profit';

interface DateWindow {
  start: string;
  end: string;
}

function isoDate(
  value: Date,
) {
  return value
    .toISOString()
    .slice(0, 10);
}

function startOfWeek(
  date: Date,
) {
  const next =
    new Date(date);

  const weekday =
    next.getDay();

  const delta =
    weekday === 0
      ? -6
      : 1 - weekday;

  next.setDate(
    next.getDate()
    + delta,
  );

  return next;
}

function rangeWindow(
  range: ReportRange,
  customStart: string,
  customEnd: string,
): DateWindow {
  const today =
    new Date();

  const current =
    isoDate(today);

  if (range === 'today') {
    return {
      start: current,
      end: current,
    };
  }

  if (range === 'yesterday') {
    const yesterday =
      new Date(today);

    yesterday.setDate(
      yesterday.getDate() - 1,
    );

    const value =
      isoDate(yesterday);

    return {
      start: value,
      end: value,
    };
  }

  if (range === 'week') {
    return {
      start:
        isoDate(
          startOfWeek(today),
        ),
      end: current,
    };
  }

  if (range === 'last7') {
    const start =
      new Date(today);

    start.setDate(
      start.getDate() - 6,
    );

    return {
      start:
        isoDate(start),
      end: current,
    };
  }

  if (range === 'lastMonth') {
    const firstCurrent =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

    const end =
      new Date(
        firstCurrent.getTime()
        - 86400000,
      );

    const start =
      new Date(
        end.getFullYear(),
        end.getMonth(),
        1,
      );

    return {
      start:
        isoDate(start),
      end:
        isoDate(end),
    };
  }

  if (range === 'custom') {
    return {
      start:
        customStart
        || current,
      end:
        customEnd
        || customStart
        || current,
    };
  }

  return {
    start:
      isoDate(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ),
      ),
    end: current,
  };
}

function inWindow(
  date: string,
  window: DateWindow,
) {
  return (
    date >= window.start
    && date <= window.end
  );
}

function csvCell(
  value: string | number,
) {
  const text =
    String(value ?? '');

  return (
    '"'
    + text.replace(
      /"/g,
      '""',
    )
    + '"'
  );
}

function downloadCsv(
  name: string,
  rows: Array<Array<string | number>>,
) {
  const csv =
    rows
      .map(
        (row) =>
          row
            .map(csvCell)
            .join(','),
      )
      .join('\n');

  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8',
      },
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = name;
  anchor.click();

  URL.revokeObjectURL(url);
}

function htmlCell(
  value: string | number,
) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rowsToHtmlTable(
  rows: Array<Array<string | number>>,
) {
  const [header, ...body] = rows;

  return (
    '<table><thead><tr>'
    + header
      .map(
        (cell) =>
          '<th>' + htmlCell(cell) + '</th>',
      )
      .join('')
    + '</tr></thead><tbody>'
    + body
      .map(
        (row) =>
          '<tr>'
          + row
            .map(
              (cell) =>
                '<td>' + htmlCell(cell) + '</td>',
            )
            .join('')
          + '</tr>',
      )
      .join('')
    + '</tbody></table>'
  );
}

function downloadExcelHtml(
  name: string,
  title: string,
  rows: Array<Array<string | number>>,
) {
  const html =
    '<!doctype html><html><head><meta charset="utf-8">'
    + '<style>body{font-family:Arial,sans-serif;font-size:12px}'
    + 'h1{font-size:18px;margin:0 0 12px}'
    + 'table{border-collapse:collapse;width:100%}'
    + 'th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}'
    + 'th{background:#eee;font-weight:700}</style>'
    + '</head><body><h1>' + htmlCell(title) + '</h1>'
    + rowsToHtmlTable(rows)
    + '</body></html>';

  const blob = new Blob(
    ['\ufeff' + html],
    { type: 'application/vnd.ms-excel;charset=utf-8' },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printReportHtml(
  title: string,
  subtitle: string,
  rows: Array<Array<string | number>>,
) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');

  if (!popup) {
    throw new Error(
      'Allow pop-ups to print or save this report as PDF.',
    );
  }

  popup.document.write(
    '<!doctype html><html><head><meta charset="utf-8">'
    + '<title>' + htmlCell(title) + '</title>'
    + '<style>@page{size:A4 landscape;margin:10mm}'
    + 'body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:10px}'
    + 'header{margin-bottom:12px}h1{font-size:18px;margin:0 0 4px}'
    + 'p{margin:0;color:#555;font-size:10px}'
    + 'table{border-collapse:collapse;width:100%;table-layout:auto}'
    + 'th,td{border-bottom:1px solid #ddd;padding:5px 6px;vertical-align:top}'
    + 'th{background:#f2f2f2;text-align:left;font-size:9px}'
    + 'td{font-size:9px}tr{break-inside:avoid}</style>'
    + '</head><body><header><h1>' + htmlCell(title) + '</h1>'
    + '<p>' + htmlCell(subtitle) + '</p></header>'
    + rowsToHtmlTable(rows)
    + '<script>window.addEventListener("load",()=>window.print());<\/script>'
    + '</body></html>',
  );

  popup.document.close();
}

function netSale(
  sale: SmePosSale,
) {
  return Math.max(
    0,
    sale.totalMinor
    - sale.returnedMinor
    - (sale.voidedMinor || 0),
  );
}

function humanizeSaleStatus(
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

function salePaymentSummary(
  sale: SmePosSale,
) {
  if (sale.payments?.length) {
    return sale.payments
      .map(
        (payment) =>
          [
            payment.paymentMethodLabel
              || payment.paymentMethod
              || 'Payment',
            payment.accountName,
          ]
            .filter(Boolean)
            .join(' · '),
      )
      .join(' + ');
  }

  return [
    sale.paymentMethodLabel
      || sale.paymentMethod
      || '',
    sale.paymentAccountName,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function BusinessReportsWorkspace({
  spaceId,
  currency,
  businessIndustry,
}: {
  spaceId: string;
  currency: string;
  businessIndustry: BusinessIndustry;
}) {
  const [
    tab,
    setTab,
  ] = useState<ReportTab>('sales');

  const [
    range,
    setRange,
  ] = useState<ReportRange>('month');

  const [
    customStart,
    setCustomStart,
  ] = useState('');

  const [
    customEnd,
    setCustomEnd,
  ] = useState('');

  const [sellerFilter, setSellerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [documentStatusFilter, setDocumentStatusFilter] = useState('');

  const [
    sales,
    setSales,
  ] = useState<SmePosSale[]>([]);

  const [
    products,
    setProducts,
  ] = useState<SmePosProduct[]>([]);

  const [
    listings,
    setListings,
  ] = useState<SmePosListing[]>([]);

  const [
    sellers,
    setSellers,
  ] = useState<SmePosSeller[]>([]);

  const [
    payouts,
    setPayouts,
  ] = useState<SmePosPayout[]>([]);

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

  const [
    moneyTransactions,
    setMoneyTransactions,
  ] = useState<FinancialTransaction[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(
    () => {
      let active = true;

      void (async () => {
        setLoading(true);

        const [
          quoteResult,
          orderResult,
          invoiceResult,
          posResult,
          moneyResult,
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
          businessIndustry === 'marketplace'
            ? getMarketplacePosWorkspace(
                spaceId,
              )
            : getSmePosStaffWorkspace(
                spaceId,
              ),
          listBusinessReportTransactionsForSpace(
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

        setMoneyTransactions(
          moneyResult.status === 'fulfilled'
            ? moneyResult.value
            : [],
        );

        if (posResult.status === 'fulfilled') {
          setSales(
            posResult.value.sales || [],
          );

          if (
            'listings'
            in posResult.value
          ) {
            setListings(
              posResult.value.listings || [],
            );
            setSellers(
              posResult.value.sellers || [],
            );
            setPayouts(
              posResult.value.payouts || [],
            );
            setProducts([]);
          } else {
            setProducts(
              posResult.value.products || [],
            );
            setListings([]);
            setSellers([]);
            setPayouts([]);
          }
        } else {
          setSales([]);
          setProducts([]);
          setListings([]);
          setSellers([]);
          setPayouts([]);
        }

        setLoading(false);
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

  const window =
    useMemo(
      () =>
        rangeWindow(
          range,
          customStart,
          customEnd,
        ),
      [
        customEnd,
        customStart,
        range,
      ],
    );

  const catalogByItemId =
    useMemo(
      () => {
        const map = new Map<
          string,
          { category: string; sellerId: string }
        >();

        for (const product of products) {
          map.set(product.id, {
            category: product.category || '',
            sellerId: '',
          });
        }

        for (const listing of listings) {
          map.set(listing.id, {
            category: listing.category || '',
            sellerId: listing.sellerId,
          });
        }

        return map;
      },
      [listings, products],
    );

  const catalogDetailByItemId =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              photoPath?: string | null;
              category: string;
              sellerName: string;
            }
          >();

        for (const product of products) {
          map.set(
            product.id,
            {
              photoPath:
                product.photoPath,
              category:
                product.category || '',
              sellerName: '',
            },
          );
        }

        for (const listing of listings) {
          map.set(
            listing.id,
            {
              photoPath:
                listing.photoPath,
              category:
                listing.category || '',
              sellerName:
                listing.sellerName,
            },
          );
        }

        return map;
      },
      [
        listings,
        products,
      ],
    );

  const sellerOptions =
    useMemo(
      () =>
        sellers
          .filter((item) => !item.deletedAt)
          .map((item) => ({
            id: item.id,
            name: item.name,
          }))
          .sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
      [sellers],
    );

  const categoryOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            [
              ...products.map(
                (item) => item.category || '',
              ),
              ...listings.map(
                (item) => item.category || '',
              ),
            ].filter(Boolean),
          ),
        ).sort(),
      [listings, products],
    );

  const itemOptions =
    useMemo(
      () => {
        const values = new Map<string, string>();

        for (const sale of sales) {
          for (const item of sale.items) {
            const id =
              item.listingId || item.productId;

            if (id) {
              values.set(id, item.productName);
            }
          }
        }

        return Array.from(values.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) =>
            a.name.localeCompare(b.name),
          );
      },
      [sales],
    );

  const paymentOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            sales
              .map(
                (sale) =>
                  sale.paymentMethodLabel
                  || sale.paymentMethod
                  || '',
              )
              .filter(Boolean),
          ),
        ).sort(),
      [sales],
    );

  const accountOptions =
    useMemo(
      () =>
        Array.from(
          new Map(
            sales
              .filter(
                (sale) => sale.paymentAccountId,
              )
              .map(
                (sale) => [
                  sale.paymentAccountId,
                  sale.paymentAccountName,
                ],
              ),
          ).entries(),
        )
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
      [sales],
    );

  const filteredSales =
    useMemo(
      () =>
        sales.filter(
          (sale) => {
            if (
              !inWindow(
                sale.saleDate,
                window,
              )
            ) {
              return false;
            }

            if (
              paymentFilter
              && (
                sale.paymentMethodLabel
                || sale.paymentMethod
                || ''
              ) !== paymentFilter
            ) {
              return false;
            }

            if (
              accountFilter
              && sale.paymentAccountId
                !== accountFilter
            ) {
              return false;
            }

            if (
              itemFilter
              && !sale.items.some(
                (item) =>
                  (
                    item.listingId
                    || item.productId
                  ) === itemFilter,
              )
            ) {
              return false;
            }

            if (
              sellerFilter
              && !sale.items.some(
                (item) =>
                  item.sellerId === sellerFilter,
              )
            ) {
              return false;
            }

            if (
              categoryFilter
              && !sale.items.some(
                (item) => {
                  const id =
                    item.listingId
                    || item.productId;

                  return (
                    id
                    && catalogByItemId
                      .get(id)
                      ?.category
                      === categoryFilter
                  );
                },
              )
            ) {
              return false;
            }

            return true;
          },
        ),
      [
        accountFilter,
        catalogByItemId,
        categoryFilter,
        itemFilter,
        paymentFilter,
        sales,
        sellerFilter,
        window,
      ],
    );

  const filteredPayouts =
    useMemo(
      () =>
        payouts.filter(
          (item) =>
            inWindow(
              item.payoutDate,
              window,
            ),
        ),
      [
        payouts,
        window,
      ],
    );

  const filteredQuotations =
    useMemo(
      () =>
        quotations.filter(
          (item) =>
            inWindow(
              item.quoteDate,
              window,
            )
            && (
              !documentStatusFilter
              || item.status
                === documentStatusFilter
            ),
        ),
      [
        documentStatusFilter,
        quotations,
        window,
      ],
    );

  const filteredSalesOrders =
    useMemo(
      () =>
        salesOrders.filter(
          (item) =>
            inWindow(
              item.orderDate,
              window,
            )
            && (
              !documentStatusFilter
              || item.status
                === documentStatusFilter
            ),
        ),
      [
        documentStatusFilter,
        salesOrders,
        window,
      ],
    );

  const filteredInvoices =
    useMemo(
      () =>
        invoices.filter(
          (item) =>
            inWindow(
              item.issueDate,
              window,
            )
            && (
              !documentStatusFilter
              || item.status
                === documentStatusFilter
            ),
        ),
      [
        documentStatusFilter,
        invoices,
        window,
      ],
    );

  const filteredMoneyTransactions =
    useMemo(
      () =>
        moneyTransactions.filter(
          (item) =>
            item.status === 'posted'
            && item.type !== 'reversal'
            && inWindow(
              item.transactionDate,
              window,
            ),
        ),
      [
        moneyTransactions,
        window,
      ],
    );

  const moneyInTotal =
    filteredMoneyTransactions
      .filter(
        (item) =>
          item.type === 'income',
      )
      .reduce(
        (sum, item) =>
          sum + item.amountMinor,
        0,
      );

  const moneyOutTotal =
    filteredMoneyTransactions
      .filter(
        (item) =>
          item.type === 'expense',
      )
      .reduce(
        (sum, item) =>
          sum + item.amountMinor,
        0,
      );

  const moneyNetTotal =
    moneyInTotal
    - moneyOutTotal;

  const salesTotal =
    filteredSales.reduce(
      (sum, sale) =>
        sum + netSale(sale),
      0,
    );

  const refundTotal =
    filteredSales.reduce(
      (sum, sale) =>
        sum
        + sale.returnedMinor
        + (sale.voidedMinor || 0),
      0,
    );

  const costTotal =
    filteredSales.reduce(
      (sum, sale) =>
        sum + sale.costMinor,
      0,
    );

  const commissionTotal =
    filteredSales.reduce(
      (sum, sale) =>
        sum
        + (
          sale.marketplaceCommissionMinor
          || 0
        ),
      0,
    );

  const profitTotal =
    filteredSales.reduce(
      (sum, sale) =>
        sum + sale.profitMinor,
      0,
    )
    - refundTotal;

  const payoutTotal =
    filteredPayouts.reduce(
      (sum, item) =>
        sum + item.amountMinor,
      0,
    );

  const soldByItem =
    useMemo(
      () => {
        const rows =
          new Map<
            string,
            {
              name: string;
              quantity: number;
              revenueMinor: number;
              sellerName: string;
            }
          >();

        for (
          const sale
          of filteredSales
        ) {
          for (
            const item
            of sale.items
          ) {
            const key =
              item.listingId
              || item.productId
              || item.productName;

            const current =
              rows.get(key)
              || {
                name:
                  item.productName,
                quantity: 0,
                revenueMinor: 0,
                sellerName:
                  item.sellerName
                  || '',
              };

            current.quantity +=
              Math.max(
                0,
                item.quantity
                - item.returnedQuantity,
              );

            current.revenueMinor +=
              Math.max(
                0,
                item.netLineMinor
                || item.lineTotalMinor,
              )
              - (
                item.returnedMinor
                || 0
              );

            rows.set(
              key,
              current,
            );
          }
        }

        return rows;
      },
      [filteredSales],
    );

  const sellerRows =
    useMemo(
      () => {
        const rows =
          new Map<
            string,
            {
              sellerName: string;
              salesMinor: number;
              commissionMinor: number;
              sellerEarningsMinor: number;
              soldQuantity: number;
            }
          >();

        for (
          const sale
          of filteredSales
        ) {
          for (
            const item
            of sale.items
          ) {
            if (!item.sellerId) {
              continue;
            }

            const current =
              rows.get(
                item.sellerId,
              )
              || {
                sellerName:
                  item.sellerName
                  || 'Seller',
                salesMinor: 0,
                commissionMinor: 0,
                sellerEarningsMinor: 0,
                soldQuantity: 0,
              };

            current.salesMinor +=
              Math.max(
                0,
                item.netLineMinor
                || item.lineTotalMinor,
              )
              - (
                item.returnedMinor
                || 0
              );

            current.commissionMinor +=
              Math.max(
                0,
                (
                  item.commissionMinor
                  || 0
                )
                - (
                  item.commissionReturnedMinor
                  || 0
                ),
              );

            current.sellerEarningsMinor +=
              Math.max(
                0,
                (
                  item.sellerEarningMinor
                  || 0
                )
                - (
                  item.sellerEarningReturnedMinor
                  || 0
                ),
              );

            current.soldQuantity +=
              Math.max(
                0,
                item.quantity
                - item.returnedQuantity,
              );

            rows.set(
              item.sellerId,
              current,
            );
          }
        }

        return Array.from(
          rows.entries(),
        )
          .map(
            ([sellerId, row]) => ({
              sellerId,
              ...row,
              payoutMinor:
                filteredPayouts
                  .filter(
                    (payout) =>
                      payout.sellerId
                      === sellerId,
                  )
                  .reduce(
                    (sum, payout) =>
                      sum
                      + payout.amountMinor,
                    0,
                  ),
            }),
          )
          .filter(
            (item) =>
              !sellerFilter
              || item.sellerId
                === sellerFilter,
          )
          .sort(
            (a, b) =>
              b.salesMinor
              - a.salesMinor,
          );
      },
      [
        filteredPayouts,
        filteredSales,
        sellerFilter,
      ],
    );

  const stockRows =
    useMemo(
      () => {
        const base =
          businessIndustry
            === 'marketplace'
            ? listings.map(
                (item) => ({
                  id: item.id,
                  name: item.name,
                  category:
                    item.category || '',
                  sellerName:
                    item.sellerName,
                  quantityOnHand:
                    item.quantityOnHand,
                  lowStockLevel:
                    item.lowStockLevel,
                }),
              )
            : products.map(
                (item) => ({
                  id: item.id,
                  name: item.name,
                  category:
                    item.category || '',
                  sellerName: '',
                  quantityOnHand:
                    item.quantityOnHand,
                  lowStockLevel:
                    item.lowStockLevel,
                }),
              );

        return base
          .map(
            (item) => {
              const sold =
                soldByItem.get(
                  item.id,
                );

              return {
                ...item,
                soldQuantity:
                  sold?.quantity || 0,
                revenueMinor:
                  sold?.revenueMinor || 0,
              };
            },
          )
          .filter(
            (item) =>
              (
                !categoryFilter
                || item.category
                  === categoryFilter
              )
              && (
                !itemFilter
                || item.id
                  === itemFilter
              )
              && (
                !sellerFilter
                || (
                  businessIndustry
                    === 'marketplace'
                  && listings.find(
                    (listing) =>
                      listing.id === item.id,
                  )?.sellerId
                    === sellerFilter
                )
              ),
          )
          .sort(
            (a, b) =>
              b.soldQuantity
              - a.soldQuantity,
          );
      },
      [
        businessIndustry,
        categoryFilter,
        itemFilter,
        listings,
        products,
        sellerFilter,
        soldByItem,
      ],
    );

  const reportRows =
    (): Array<Array<string | number>> => {
      if (tab === 'money') {
        return [
          [
            'Date',
            'Type',
            'Category',
            'Counterparty',
            'Payment',
            'Account ID',
            'Amount',
            'Source',
            'Note',
          ],
          ...filteredMoneyTransactions.map(
            (item) => [
              item.transactionDate,
              item.type,
              item.category,
              item.counterparty || '',
              item.paymentMethodLabel
                || item.paymentMethod
                || '',
              item.accountId,
              (
                (
                  item.type === 'expense'
                    ? -item.amountMinor
                    : item.amountMinor
                )
                / 100
              ).toFixed(2),
              item.labels
                ?.includes('adbn_tech')
                  ? 'ADBN TECH'
                  : 'BajetBN',
              item.note || '',
            ],
          ),
        ];
      }

      if (tab === 'sales') {
        return [
          [
            'Date',
            'Receipt',
            'Status',
            'Customer',
            'Payment',
            'Account',
            'Item',
            'SKU',
            'Barcode',
            'Category',
            'Seller',
            'Qty',
            'Unit Price',
            'Item Discount',
            'Returned Qty',
            'Item Refund',
            'Net Line',
            'Sale Subtotal',
            'Sale Discount',
            'Sale Refund / Void',
            'Net Sale',
            'Cost',
            'Profit',
            'Commission',
            'Seller Earnings',
            'Note',
          ],
          ...filteredSales.flatMap(
            (sale) =>
              sale.items.map(
                (item) => {
                  const itemId =
                    item.listingId
                    || item.productId;

                  const catalog =
                    catalogDetailByItemId.get(
                      itemId,
                    );

                  const netLine =
                    Math.max(
                      0,
                      (
                        item.netLineMinor
                        ?? item.lineTotalMinor
                      )
                      - (
                        item.returnedMinor
                        || 0
                      ),
                    );

                  return [
                    sale.saleDate,
                    sale.receiptNumber,
                    humanizeSaleStatus(sale.status),
                    sale.customerName || 'Walk-in Customer',
                    salePaymentSummary(sale),
                    sale.paymentAccountName,
                    item.productName,
                    item.sku || '',
                    item.barcode || '',
                    catalog?.category || '',
                    item.sellerName
                      || catalog?.sellerName
                      || '',
                    item.quantity,
                    (item.unitPriceMinor / 100).toFixed(2),
                    ((item.discountShareMinor || 0) / 100).toFixed(2),
                    item.returnedQuantity,
                    ((item.returnedMinor || 0) / 100).toFixed(2),
                    (netLine / 100).toFixed(2),
                    (sale.subtotalMinor / 100).toFixed(2),
                    (sale.discountMinor / 100).toFixed(2),
                    ((sale.returnedMinor + (sale.voidedMinor || 0)) / 100).toFixed(2),
                    (netSale(sale) / 100).toFixed(2),
                    (sale.costMinor / 100).toFixed(2),
                    (sale.profitMinor / 100).toFixed(2),
                    ((sale.marketplaceCommissionMinor || 0) / 100).toFixed(2),
                    ((sale.sellerEarningsMinor || 0) / 100).toFixed(2),
                    sale.note || '',
                  ];
                },
              ),
          ),
        ];
      }

      if (tab === 'stock') {
        return [
          ['Item','Category','Seller','On hand','Low stock level','Sold in period','Revenue in period'],
          ...stockRows.map(
            (item) => [
              item.name,
              item.category,
              item.sellerName,
              item.quantityOnHand,
              item.lowStockLevel,
              item.soldQuantity,
              (item.revenueMinor / 100).toFixed(2),
            ],
          ),
        ];
      }

      if (tab === 'sellers') {
        return [
          ['Seller','Sold quantity','Gross sales','Commission','Seller earnings','Payouts'],
          ...sellerRows.map(
            (item) => [
              item.sellerName,
              item.soldQuantity,
              (item.salesMinor / 100).toFixed(2),
              (item.commissionMinor / 100).toFixed(2),
              (item.sellerEarningsMinor / 100).toFixed(2),
              (item.payoutMinor / 100).toFixed(2),
            ],
          ),
        ];
      }

      if (tab === 'documents') {
        return [
          ['Type','Number','Date','Customer','Status','Total'],
          ...filteredQuotations.map(
            (item) => [
              'Quotation',
              item.quotationNumber,
              item.quoteDate,
              item.customerName,
              item.status,
              (item.totalMinor / 100).toFixed(2),
            ],
          ),
          ...filteredSalesOrders.map(
            (item) => [
              'Sales Order',
              item.salesOrderNumber,
              item.orderDate,
              item.customerName,
              item.status,
              (item.totalMinor / 100).toFixed(2),
            ],
          ),
          ...filteredInvoices.map(
            (item) => [
              'Invoice',
              item.invoiceNumber,
              item.issueDate,
              item.customerName,
              item.status,
              (item.totalMinor / 100).toFixed(2),
            ],
          ),
        ];
      }

      return [
        ['Metric','Amount'],
        ['Net sales',(salesTotal / 100).toFixed(2)],
        ['Cost',(costTotal / 100).toFixed(2)],
        ['Refunds / voids',(refundTotal / 100).toFixed(2)],
        ['Profit',(profitTotal / 100).toFixed(2)],
        ['Marketplace commission',(commissionTotal / 100).toFixed(2)],
        ['Seller payouts',(payoutTotal / 100).toFixed(2)],
      ];
    };

  const reportFileStem =
    'bajetbn-business-'
    + tab
    + '-'
    + window.start
    + '-'
    + window.end;

  const reportTitle =
    'BajetBN Business Report · '
    + (
      tab === 'stock'
        ? 'Products / Stock'
        : tab === 'documents'
          ? 'Quotations / Invoices'
          : tab === 'profit'
            ? (
                businessIndustry === 'marketplace'
                  ? 'Profit / Commission'
                  : 'Profit'
              )
            : tab.charAt(0).toUpperCase()
              + tab.slice(1)
    );

  const reportSubtitle =
    window.start
    + ' to '
    + window.end
    + ' · Active report filters are applied';

  const exportCurrent =
    () => {
      downloadCsv(
        reportFileStem + '.csv',
        reportRows(),
      );
    };

  const exportExcel =
    () => {
      downloadExcelHtml(
        reportFileStem + '.xls',
        reportTitle,
        reportRows(),
      );
    };

  const printCurrent =
    () => {
      printReportHtml(
        reportTitle,
        reportSubtitle,
        reportRows(),
      );
    };

  const tabs: Array<{
    id: ReportTab;
    label: string;
  }> = [
    {
      id: 'money',
      label: 'Money',
    },
    {
      id: 'sales',
      label: 'Sales',
    },
    {
      id: 'stock',
      label:
        businessIndustry
          === 'marketplace'
          ? 'Products / Stock'
          : 'Products / Stock',
    },
    ...(businessIndustry === 'marketplace'
      ? [
          {
            id:
              'sellers' as ReportTab,
            label:
              'Sellers',
          },
        ]
      : []),
    {
      id: 'documents',
      label:
        'Quotations / Invoices',
    },
    {
      id: 'profit',
      label:
        businessIndustry
          === 'marketplace'
          ? 'Profit / Commission'
          : 'Profit',
    },
  ];

  if (loading) {
    return (
      <div className="loading-panel">
        Loading Business Reports…
      </div>
    );
  }

  return (
    <section
      className="business-reports-workspace-v115"
      data-business-reports-workspace
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>Business intelligence</span>
          <h2>Reports</h2>
        </div>

        <div className="business-report-export-actions-v115">
          <button
            className="button secondary compact"
            type="button"
            onClick={exportCurrent}
          >
            CSV
          </button>

          <button
            className="button secondary compact"
            type="button"
            onClick={exportExcel}
          >
            Excel
          </button>

          <button
            className="button secondary compact"
            type="button"
            onClick={printCurrent}
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div className="business-report-range-v115">
        <label>
          Period
          <select
            value={range}
            onChange={(event) =>
              setRange(
                event.target.value as ReportRange,
              )
            }
          >
            <option value="today">
              Today
            </option>
            <option value="yesterday">
              Yesterday
            </option>
            <option value="week">
              This week
            </option>
            <option value="last7">
              Last 7 days
            </option>
            <option value="month">
              This month
            </option>
            <option value="lastMonth">
              Last month
            </option>
            <option value="custom">
              Custom
            </option>
          </select>
        </label>

        {range === 'custom' && (
          <>
            <label>
              From
              <input
                type="date"
                value={customStart}
                onChange={(event) =>
                  setCustomStart(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              To
              <input
                type="date"
                value={customEnd}
                onChange={(event) =>
                  setCustomEnd(
                    event.target.value,
                  )
                }
              />
            </label>
          </>
        )}

        <div>
          <span>Showing</span>
          <strong>
            {window.start}
            {' → '}
            {window.end}
          </strong>
        </div>
      </div>

      <div
        className="business-report-filters-v115"
        data-business-report-filters
      >
        {businessIndustry === 'marketplace' && (
          <label>
            Seller
            <select
              value={sellerFilter}
              onChange={(event) =>
                setSellerFilter(event.target.value)
              }
            >
              <option value="">All sellers</option>
              {sellerOptions.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Category
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value,
              )
            }
          >
            <option value="">
              All categories
            </option>
            {categoryOptions.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Item
          <select
            value={itemFilter}
            onChange={(event) =>
              setItemFilter(event.target.value)
            }
          >
            <option value="">All items</option>
            {itemOptions.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Payment
          <select
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(
                event.target.value,
              )
            }
          >
            <option value="">
              All payment methods
            </option>
            {paymentOptions.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Account
          <select
            value={accountFilter}
            onChange={(event) =>
              setAccountFilter(
                event.target.value,
              )
            }
          >
            <option value="">All accounts</option>
            {accountOptions.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Document status
          <select
            value={documentStatusFilter}
            onChange={(event) =>
              setDocumentStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="">All statuses</option>
            {Array.from(
              new Set([
                ...quotations.map(
                  (item) => item.status,
                ),
                ...salesOrders.map(
                  (item) => item.status,
                ),
                ...invoices.map(
                  (item) => item.status,
                ),
              ]),
            )
              .sort()
              .map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
          </select>
        </label>

        <button
          type="button"
          className="button secondary compact"
          onClick={() => {
            setSellerFilter('');
            setCategoryFilter('');
            setItemFilter('');
            setPaymentFilter('');
            setAccountFilter('');
            setDocumentStatusFilter('');
          }}
        >
          Clear filters
        </button>
      </div>

      <div
        className="business-report-tabs-v115"
        aria-label="Business report sections"
      >
        {tabs.map(
          (item) => (
            <button
              type="button"
              key={item.id}
              className={
                tab === item.id
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setTab(item.id)
              }
            >
              {item.label}
            </button>
          ),
        )}
      </div>

      {tab === 'money' && (
        <>
          <div className="business-report-summary-v115">
            <article>
              <span>Money in</span>
              <strong>
                {formatMoney(
                  moneyInTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Money out</span>
              <strong>
                {formatMoney(
                  moneyOutTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Net cashflow</span>
              <strong>
                {formatMoney(
                  moneyNetTotal,
                  currency,
                )}
              </strong>
            </article>
          </div>

          <div className="adbn-tech-table-wrap-v115">
            <table className="adbn-tech-table-v115">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Counterparty</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Source</th>
                </tr>
              </thead>

              <tbody>
                {filteredMoneyTransactions.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>{item.transactionDate}</td>
                      <td>{item.type}</td>
                      <td>{item.category}</td>
                      <td>
                        {item.counterparty || '-'}
                      </td>
                      <td>
                        {item.paymentMethodLabel
                          || item.paymentMethod
                          || '-'}
                      </td>
                      <td>
                        <strong>
                          {item.type === 'expense'
                            ? '-'
                            : item.type === 'income'
                              ? '+'
                              : ''}
                          {formatMoney(
                            item.amountMinor,
                            item.currency,
                          )}
                        </strong>
                      </td>
                      <td>
                        {item.labels
                          ?.includes(
                            'adbn_tech',
                          )
                          ? 'ADBN TECH'
                          : 'BajetBN'}
                      </td>
                    </tr>
                  ),
                )}

                {!filteredMoneyTransactions.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="muted"
                    >
                      No Money activity in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sales' && (
        <>
          <div className="business-report-summary-v115">
            <article>
              <span>Net sales</span>
              <strong>
                {formatMoney(
                  salesTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Sales</span>
              <strong>
                {filteredSales.length}
              </strong>
            </article>

            <article>
              <span>Refunds / voids</span>
              <strong>
                {formatMoney(
                  refundTotal,
                  currency,
                )}
              </strong>
            </article>
          </div>

          <div
            className="business-sales-detail-list-v115"
            data-business-sales-detail-list
          >
            {filteredSales.length
              ? filteredSales.map(
                  (sale) => (
                    <details
                      key={sale.id}
                      className="business-sale-detail-v115"
                    >
                      <summary>
                        <div className="business-sale-summary-main-v115">
                          <strong>
                            {sale.receiptNumber}
                          </strong>
                          <small>
                            {sale.customerName
                              || 'Walk-in Customer'}
                          </small>
                          <small>
                            {salePaymentSummary(
                              sale,
                            )}
                          </small>
                        </div>

                        <span>
                          {sale.saleDate}
                        </span>

                        <span>
                          {sale.itemCount}
                          {' item'}
                          {sale.itemCount === 1
                            ? ''
                            : 's'}
                        </span>

                        <b>
                          {formatMoney(
                            netSale(sale),
                            sale.currency,
                          )}
                        </b>
                      </summary>

                      <div className="business-sale-expanded-v115">
                        <div className="business-sale-meta-grid-v115">
                          <div>
                            <span>Status</span>
                            <strong>
                              {humanizeSaleStatus(
                                sale.status,
                              )}
                            </strong>
                          </div>
                          <div>
                            <span>Customer</span>
                            <strong>
                              {sale.customerName
                                || 'Walk-in Customer'}
                            </strong>
                          </div>
                          <div>
                            <span>Sale date</span>
                            <strong>
                              {sale.saleDate}
                            </strong>
                          </div>
                          <div>
                            <span>Source</span>
                            <strong>
                              {sale.sourceMode
                                .replace(
                                  /_/g,
                                  ' ',
                                )}
                            </strong>
                          </div>
                          <div>
                            <span>Payment</span>
                            <strong>
                              {salePaymentSummary(
                                sale,
                              )
                                || 'Not recorded'}
                            </strong>
                          </div>
                          <div>
                            <span>Account</span>
                            <strong>
                              {sale.paymentAccountName
                                || 'Not recorded'}
                            </strong>
                          </div>
                        </div>

                        <div className="business-sale-items-v115">
                          {sale.items.map(
                            (
                              item,
                              index,
                            ) => {
                              const itemId =
                                item.listingId
                                || item.productId;

                              const catalog =
                                catalogDetailByItemId.get(
                                  itemId,
                                );

                              const netLine =
                                Math.max(
                                  0,
                                  (
                                    item.netLineMinor
                                    ?? item.lineTotalMinor
                                  )
                                  - (
                                    item.returnedMinor
                                    || 0
                                  ),
                                );

                              return (
                                <article
                                  key={
                                    (
                                      itemId
                                      || item.productName
                                    )
                                    + '-'
                                    + index
                                  }
                                  className="business-sale-item-v115"
                                >
                                  <div className="business-sale-item-photo-v115">
                                    {catalog?.photoPath
                                      ? (
                                        <SmePosItemPhoto
                                          photoPath={
                                            catalog.photoPath
                                          }
                                          name={
                                            item.productName
                                          }
                                          className="business-report-sale-photo-v115"
                                        />
                                      )
                                      : (
                                        <span aria-hidden="true">
                                          IMG
                                        </span>
                                      )}
                                  </div>

                                  <div className="business-sale-item-copy-v115">
                                    <strong>
                                      {item.productName}
                                    </strong>

                                    <small>
                                      {[
                                        item.sku
                                          ? 'SKU ' + item.sku
                                          : '',
                                        item.barcode
                                          ? 'Barcode ' + item.barcode
                                          : '',
                                        catalog?.category,
                                        item.sellerName
                                          || catalog?.sellerName,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </small>

                                    <small>
                                      Qty {item.quantity}
                                      {' × '}
                                      {formatMoney(
                                        item.unitPriceMinor,
                                        sale.currency,
                                      )}
                                      {item.returnedQuantity > 0
                                        ? ' · Returned '
                                          + item.returnedQuantity
                                        : ''}
                                    </small>
                                  </div>

                                  <div className="business-sale-item-money-v115">
                                    <strong>
                                      {formatMoney(
                                        netLine,
                                        sale.currency,
                                      )}
                                    </strong>

                                    {(item.discountShareMinor || 0) > 0 && (
                                      <small>
                                        Discount{' '}
                                        {formatMoney(
                                          item.discountShareMinor || 0,
                                          sale.currency,
                                        )}
                                      </small>
                                    )}

                                    {(item.returnedMinor || 0) > 0 && (
                                      <small>
                                        Refunded{' '}
                                        {formatMoney(
                                          item.returnedMinor || 0,
                                          sale.currency,
                                        )}
                                      </small>
                                    )}
                                  </div>
                                </article>
                              );
                            },
                          )}
                        </div>

                        {sale.payments
                          && sale.payments.length > 1
                          && (
                            <div className="business-sale-payment-splits-v115">
                              <span>Payment split</span>
                              {sale.payments.map(
                                (
                                  payment,
                                  index,
                                ) => (
                                  <div
                                    key={
                                      payment.transactionId
                                      || index
                                    }
                                  >
                                    <small>
                                      {payment.paymentMethodLabel
                                        || payment.paymentMethod
                                        || 'Payment'}
                                      {' · '}
                                      {payment.accountName}
                                    </small>
                                    <strong>
                                      {formatMoney(
                                        payment.amountMinor
                                        - payment.returnedMinor,
                                        sale.currency,
                                      )}
                                    </strong>
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                        <div className="business-sale-totals-v115">
                          <span>Subtotal</span>
                          <strong>
                            {formatMoney(
                              sale.subtotalMinor,
                              sale.currency,
                            )}
                          </strong>

                          <span>Discount</span>
                          <strong>
                            -{formatMoney(
                              sale.discountMinor,
                              sale.currency,
                            )}
                          </strong>

                          {sale.returnedMinor > 0 && (
                            <>
                              <span>Refunded</span>
                              <strong>
                                -{formatMoney(
                                  sale.returnedMinor,
                                  sale.currency,
                                )}
                              </strong>
                            </>
                          )}

                          {(sale.voidedMinor || 0) > 0 && (
                            <>
                              <span>Voided</span>
                              <strong>
                                -{formatMoney(
                                  sale.voidedMinor || 0,
                                  sale.currency,
                                )}
                              </strong>
                            </>
                          )}

                          <span>Net sale</span>
                          <strong className="business-sale-net-v115">
                            {formatMoney(
                              netSale(sale),
                              sale.currency,
                            )}
                          </strong>

                          <span>Cost</span>
                          <strong>
                            {formatMoney(
                              sale.costMinor,
                              sale.currency,
                            )}
                          </strong>

                          <span>Profit</span>
                          <strong>
                            {formatMoney(
                              sale.profitMinor,
                              sale.currency,
                            )}
                          </strong>

                          {businessIndustry
                            === 'marketplace'
                            && (
                              <>
                                <span>Commission</span>
                                <strong>
                                  {formatMoney(
                                    sale.marketplaceCommissionMinor
                                    || 0,
                                    sale.currency,
                                  )}
                                </strong>

                                <span>Seller earnings</span>
                                <strong>
                                  {formatMoney(
                                    sale.sellerEarningsMinor
                                    || 0,
                                    sale.currency,
                                  )}
                                </strong>
                              </>
                            )}
                        </div>

                        {sale.note && (
                          <div className="business-sale-note-v115">
                            <span>Note</span>
                            <p>{sale.note}</p>
                          </div>
                        )}

                        <div className="business-sale-detail-actions-v115">
                          <Link
                            className="button secondary compact"
                            to={
                              '/spaces/'
                              + spaceId
                              + '/pos?tab=sales'
                            }
                          >
                            Open in POS
                          </Link>
                        </div>
                      </div>
                    </details>
                  ),
                )
              : (
                <p className="muted">
                  No sales in this period.
                </p>
              )}
          </div>
        </>
      )}

      {tab === 'stock' && (
        <div className="business-report-table-v115">
          {stockRows.length
            ? stockRows.map(
                (item) => (
                  <Link
                    key={item.id}
                    className="business-report-row-v115"
                    to={
                      '/spaces/'
                      + spaceId
                      + '/pos?tab='
                      + (
                        businessIndustry
                          === 'marketplace'
                          ? 'listings'
                          : 'products'
                      )
                    }
                  >
                    <div>
                      <strong>
                        {item.name}
                      </strong>
                      <small>
                        {[
                          item.category,
                          item.sellerName,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>

                    <span>
                      On hand{' '}
                      {item.quantityOnHand}
                    </span>

                    <span>
                      Sold{' '}
                      {item.soldQuantity}
                    </span>

                    <b>
                      {formatMoney(
                        item.revenueMinor,
                        currency,
                      )}
                    </b>
                  </Link>
                ),
              )
            : (
              <p className="muted">
                No products are available for this report.
              </p>
            )}
        </div>
      )}

      {tab === 'sellers' && (
        <>
          <div className="business-report-summary-v115">
            <article>
              <span>Commission</span>
              <strong>
                {formatMoney(
                  commissionTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Payouts</span>
              <strong>
                {formatMoney(
                  payoutTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Sellers</span>
              <strong>
                {sellers.length}
              </strong>
            </article>
          </div>

          <div className="business-report-table-v115">
            {sellerRows.length
              ? sellerRows.map(
                  (item) => (
                    <Link
                      key={item.sellerId}
                      className="business-report-row-v115"
                      to={
                        '/spaces/'
                        + spaceId
                        + '/pos?tab=sellers'
                      }
                    >
                      <div>
                        <strong>
                          {item.sellerName}
                        </strong>
                        <small>
                          {item.soldQuantity}
                          {' sold'}
                        </small>
                      </div>

                      <span>
                        Commission{' '}
                        {formatMoney(
                          item.commissionMinor,
                          currency,
                        )}
                      </span>

                      <span>
                        Payouts{' '}
                        {formatMoney(
                          item.payoutMinor,
                          currency,
                        )}
                      </span>

                      <b>
                        {formatMoney(
                          item.salesMinor,
                          currency,
                        )}
                      </b>
                    </Link>
                  ),
                )
              : (
                <p className="muted">
                  No seller sales in this period.
                </p>
              )}
          </div>
        </>
      )}

      {tab === 'documents' && (
        <>
          <div className="business-report-summary-v115">
            <article>
              <span>Quotations</span>
              <strong>
                {filteredQuotations.length}
              </strong>
            </article>

            <article>
              <span>Sales Orders</span>
              <strong>
                {filteredSalesOrders.length}
              </strong>
            </article>

            <article>
              <span>Invoices</span>
              <strong>
                {filteredInvoices.length}
              </strong>
            </article>
          </div>

          <div className="business-report-table-v115">
            {[
              ...filteredQuotations.map(
                (item) => ({
                  id:
                    'q-' + item.id,
                  type:
                    'Quotation',
                  number:
                    item.quotationNumber,
                  date:
                    item.quoteDate,
                  customer:
                    item.customerName,
                  status:
                    item.status,
                  total:
                    item.totalMinor,
                  to:
                    '/spaces/'
                    + spaceId
                    + '/business/quotations?quotationId='
                    + item.id,
                }),
              ),
              ...filteredSalesOrders.map(
                (item) => ({
                  id:
                    'so-' + item.id,
                  type:
                    'Sales Order',
                  number:
                    item.salesOrderNumber,
                  date:
                    item.orderDate,
                  customer:
                    item.customerName,
                  status:
                    item.status,
                  total:
                    item.totalMinor,
                  to:
                    '/spaces/'
                    + spaceId
                    + '/business/sales-orders?salesOrderId='
                    + item.id,
                }),
              ),
              ...filteredInvoices.map(
                (item) => ({
                  id:
                    'i-' + item.id,
                  type:
                    'Invoice',
                  number:
                    item.invoiceNumber,
                  date:
                    item.issueDate,
                  customer:
                    item.customerName,
                  status:
                    item.status,
                  total:
                    item.totalMinor,
                  to:
                    '/spaces/'
                    + spaceId
                    + '/business/invoices?invoiceId='
                    + item.id,
                }),
              ),
            ]
              .sort(
                (a, b) =>
                  b.date.localeCompare(
                    a.date,
                  ),
              )
              .map(
                (item) => (
                  <Link
                    key={item.id}
                    className="business-report-row-v115"
                    to={item.to}
                  >
                    <div>
                      <strong>
                        {item.type}
                        {' '}
                        {item.number}
                      </strong>
                      <small>
                        {item.customer}
                      </small>
                    </div>

                    <span>
                      {item.date}
                    </span>

                    <span>
                      {item.status}
                    </span>

                    <b>
                      {formatMoney(
                        item.total,
                        currency,
                      )}
                    </b>
                  </Link>
                ),
              )}
          </div>
        </>
      )}

      {tab === 'profit' && (
        <>
          <div className="business-report-summary-v115">
            <article>
              <span>Net sales</span>
              <strong>
                {formatMoney(
                  salesTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Cost</span>
              <strong>
                {formatMoney(
                  costTotal,
                  currency,
                )}
              </strong>
            </article>

            <article>
              <span>Profit</span>
              <strong>
                {formatMoney(
                  profitTotal,
                  currency,
                )}
              </strong>
            </article>

            {businessIndustry === 'marketplace' && (
              <>
                <article>
                  <span>Commission</span>
                  <strong>
                    {formatMoney(
                      commissionTotal,
                      currency,
                    )}
                  </strong>
                </article>

                <article>
                  <span>Seller payouts</span>
                  <strong>
                    {formatMoney(
                      payoutTotal,
                      currency,
                    )}
                  </strong>
                </article>
              </>
            )}
          </div>

          <div className="notice">
            Profit and commission use the POS sale data available for the selected period. They do not replace formal accounting or tax reports.
          </div>
        </>
      )}

      <p className="muted business-report-export-note-v115">
        CSV, Excel-compatible .xls and Print / PDF use the selected report, period and active filters.
      </p>
    </section>
  );
}
