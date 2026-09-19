import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

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

import type {
  BusinessIndustry,
  BusinessInvoice,
  BusinessQuotation,
  BusinessSalesOrder,
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

  const exportCurrent =
    () => {
      const prefix =
        'bajetbn-business-'
        + tab
        + '-'
        + window.start
        + '-'
        + window.end
        + '.csv';

      if (tab === 'sales') {
        downloadCsv(
          prefix,
          [
            [
              'Date',
              'Receipt',
              'Customer',
              'Items',
              'Net sales',
              'Refunded / voided',
              'Payment account',
            ],
            ...filteredSales.map(
              (sale) => [
                sale.saleDate,
                sale.receiptNumber,
                sale.customerName
                || 'Walk-in Customer',
                sale.itemCount,
                (
                  netSale(sale)
                  / 100
                ).toFixed(2),
                (
                  (
                    sale.returnedMinor
                    + (
                      sale.voidedMinor
                      || 0
                    )
                  )
                  / 100
                ).toFixed(2),
                sale.paymentAccountName,
              ],
            ),
          ],
        );

        return;
      }

      if (tab === 'stock') {
        downloadCsv(
          prefix,
          [
            [
              'Item',
              'Category',
              'Seller',
              'On hand',
              'Low stock level',
              'Sold in period',
              'Revenue in period',
            ],
            ...stockRows.map(
              (item) => [
                item.name,
                item.category,
                item.sellerName,
                item.quantityOnHand,
                item.lowStockLevel,
                item.soldQuantity,
                (
                  item.revenueMinor
                  / 100
                ).toFixed(2),
              ],
            ),
          ],
        );

        return;
      }

      if (tab === 'sellers') {
        downloadCsv(
          prefix,
          [
            [
              'Seller',
              'Sold quantity',
              'Gross sales',
              'Commission',
              'Seller earnings',
              'Payouts',
            ],
            ...sellerRows.map(
              (item) => [
                item.sellerName,
                item.soldQuantity,
                (
                  item.salesMinor
                  / 100
                ).toFixed(2),
                (
                  item.commissionMinor
                  / 100
                ).toFixed(2),
                (
                  item.sellerEarningsMinor
                  / 100
                ).toFixed(2),
                (
                  item.payoutMinor
                  / 100
                ).toFixed(2),
              ],
            ),
          ],
        );

        return;
      }

      if (tab === 'documents') {
        downloadCsv(
          prefix,
          [
            [
              'Type',
              'Number',
              'Date',
              'Customer',
              'Status',
              'Total',
            ],
            ...filteredQuotations.map(
              (item) => [
                'Quotation',
                item.quotationNumber,
                item.quoteDate,
                item.customerName,
                item.status,
                (
                  item.totalMinor
                  / 100
                ).toFixed(2),
              ],
            ),
            ...filteredSalesOrders.map(
              (item) => [
                'Sales Order',
                item.salesOrderNumber,
                item.orderDate,
                item.customerName,
                item.status,
                (
                  item.totalMinor
                  / 100
                ).toFixed(2),
              ],
            ),
            ...filteredInvoices.map(
              (item) => [
                'Invoice',
                item.invoiceNumber,
                item.issueDate,
                item.customerName,
                item.status,
                (
                  item.totalMinor
                  / 100
                ).toFixed(2),
              ],
            ),
          ],
        );

        return;
      }

      downloadCsv(
        prefix,
        [
          [
            'Metric',
            'Amount',
          ],
          [
            'Net sales',
            (
              salesTotal / 100
            ).toFixed(2),
          ],
          [
            'Cost',
            (
              costTotal / 100
            ).toFixed(2),
          ],
          [
            'Refunds / voids',
            (
              refundTotal / 100
            ).toFixed(2),
          ],
          [
            'Profit',
            (
              profitTotal / 100
            ).toFixed(2),
          ],
          [
            'Marketplace commission',
            (
              commissionTotal / 100
            ).toFixed(2),
          ],
          [
            'Seller payouts',
            (
              payoutTotal / 100
            ).toFixed(2),
          ],
        ],
      );
    };

  const tabs: Array<{
    id: ReportTab;
    label: string;
  }> = [
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

        <button
          className="button secondary compact"
          type="button"
          onClick={exportCurrent}
        >
          Export CSV
        </button>
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

          <div className="business-report-table-v115">
            {filteredSales.length
              ? filteredSales.map(
                  (sale) => (
                    <Link
                      key={sale.id}
                      className="business-report-row-v115"
                      to={
                        '/spaces/'
                        + spaceId
                        + '/pos?tab=sales'
                      }
                    >
                      <div>
                        <strong>
                          {sale.receiptNumber}
                        </strong>
                        <small>
                          {sale.customerName
                            || 'Walk-in Customer'}
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
                    </Link>
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
        CSV export is available for the selected report and period. PDF and Excel export are not included in this slice.
      </p>
    </section>
  );
}
