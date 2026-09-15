import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getBusinessPosAdvancedReport,
  type BusinessPosAdvancedReport,
  type BusinessPosReportSale,
} from '../../repositories/businessReportRepository';

import type {
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

import {
  formatMoney,
} from '../../utils/money';

type ReportRange =
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'custom';

function todayKey() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Brunei',
      year:
        'numeric',
      month:
        '2-digit',
      day:
        '2-digit',
    },
  ).format(
    new Date(),
  );
}

function dateRange(
  range: ReportRange,
  customFrom: string,
  customTo: string,
) {
  const today =
    todayKey();

  if (range === 'custom') {
    const from =
      customFrom || today;

    return {
      from,
      to:
        customTo || from,
    };
  }

  if (range === 'today') {
    return {
      from:
        today,
      to:
        today,
    };
  }

  const anchor =
    new Date(
      `${today}T12:00:00+08:00`,
    );

  if (range === 'week') {
    const weekday =
      anchor.getDay();

    const offset =
      weekday === 0
        ? -6
        : 1 - weekday;

    anchor.setDate(
      anchor.getDate()
      + offset,
    );

    const from =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Brunei',
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit',
        },
      ).format(anchor);

    return {
      from,
      to:
        today,
    };
  }

  if (range === 'month') {
    return {
      from:
        `${today.slice(0, 7)}-01`,
      to:
        today,
    };
  }

  return {
    from:
      `${today.slice(0, 4)}-01-01`,
    to:
      today,
  };
}

function csvCell(
  value: unknown,
) {
  const text =
    String(
      value ?? '',
    );

  return (
    '"'
    + text.replace(
        /"/g,
        '""',
      )
    + '"'
  );
}

function paymentMethodName(
  value:
    string | null | undefined,
  custom:
    string | null | undefined,
) {
  if (custom) {
    return custom;
  }

  if (!value) {
    return 'Not recorded';
  }

  return value
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function saleNetMinor(
  sale:
    BusinessPosReportSale,
) {
  if (
    sale.status
    === 'voided'
  ) {
    return 0;
  }

  return Math.max(
    0,
    sale.totalMinor
    - sale.returnedMinor,
  );
}

function saleItemNetQuantity(
  sale:
    BusinessPosReportSale,
) {
  return sale.items.reduce(
    (
      total,
      item,
    ) =>
      total
      + Math.max(
          0,
          item.quantity
          - item.returnedQuantity,
        ),
    0,
  );
}

function saleMatchesSearch(
  sale:
    BusinessPosReportSale,
  search: string,
) {
  const term =
    search.trim().toLowerCase();

  if (!term) {
    return true;
  }

  const values = [
    sale.receiptNumber,
    sale.customerName,
    sale.cashierName,
    sale.note,
    ...sale.items.flatMap(
      (item) => [
        item.productName,
        item.category,
        item.sellerName,
        item.sku,
        item.barcode,
      ],
    ),
  ];

  return values.some(
    (value) =>
      String(
        value || '',
      )
        .toLowerCase()
        .includes(term),
  );
}

export function BusinessPosReportPanel({
  space,
}: {
  space:
    Space;
}) {
  const [data, setData] =
    useState<
      BusinessPosAdvancedReport
      | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [range, setRange] =
    useState<ReportRange>(
      'month',
    );

  const [customFrom, setCustomFrom] =
    useState(
      todayKey(),
    );

  const [customTo, setCustomTo] =
    useState(
      todayKey(),
    );

  const [accountId, setAccountId] =
    useState('');

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState('');

  const [cashierUid, setCashierUid] =
    useState('');

  const [customer, setCustomer] =
    useState('');

  const [sellerId, setSellerId] =
    useState('');

  const [product, setProduct] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [receipt, setReceipt] =
    useState('');

  const [status, setStatus] =
    useState('');

  const [mode, setMode] =
    useState('');

  const [search, setSearch] =
    useState('');

  useEffect(
    () => {
      let active =
        true;

      queueMicrotask(() => {
        if (!active) return;
        setLoading(true);
        setError('');
      });

      getBusinessPosAdvancedReport(
        space.id,
      )
        .then(
          (result) => {
            if (!active) {
              return;
            }

            setData(
              result,
            );
          },
        )
        .catch(
          (nextError) => {
            if (!active) {
              return;
            }

            setError(
              getErrorMessage(
                nextError,
              ),
            );
          },
        )
        .finally(
          () => {
            if (active) {
              setLoading(
                false,
              );
            }
          },
        );

      return () => {
        active = false;
      };
    },
    [space.id],
  );

  const reportWindow =
    dateRange(
      range,
      customFrom,
      customTo,
    );

  const accounts =
    useMemo(
      () => {
        const byId =
          new Map<
            string,
            string
          >();

        data?.sales.forEach(
          (sale) =>
            sale.payments.forEach(
              (payment) =>
                byId.set(
                  payment.accountId,
                  payment.accountName,
                ),
            ),
        );

        data?.payouts.forEach(
          (payout) =>
            payout.payments.forEach(
              (payment) =>
                byId.set(
                  payment.accountId,
                  payment.accountName,
                ),
            ),
        );

        return [
          ...byId.entries(),
        ].sort(
          (a, b) =>
            a[1].localeCompare(
              b[1],
            ),
        );
      },
      [data],
    );

  const paymentMethods =
    useMemo(
      () => {
        const values =
          new Map<
            string,
            string
          >();

        data?.sales.forEach(
          (sale) =>
            sale.payments.forEach(
              (payment) => {
                const key =
                  payment.paymentMethod
                  || payment.paymentMethodLabel
                  || 'unknown';

                values.set(
                  key,
                  paymentMethodName(
                    payment.paymentMethod,
                    payment.paymentMethodLabel,
                  ),
                );
              },
            ),
        );

        return [
          ...values.entries(),
        ].sort(
          (a, b) =>
            a[1].localeCompare(
              b[1],
            ),
        );
      },
      [data],
    );

  const customers =
    useMemo(
      () =>
        Array.from(
          new Set(
            (data?.sales || [])
              .map(
                (sale) =>
                  sale.customerName
                  || '',
              )
              .filter(Boolean),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [data],
    );

  const products =
    useMemo(
      () =>
        Array.from(
          new Set(
            (data?.sales || [])
              .flatMap(
                (sale) =>
                  sale.items.map(
                    (item) =>
                      item.productName,
                  ),
              )
              .filter(Boolean),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [data],
    );

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            (data?.sales || [])
              .flatMap(
                (sale) =>
                  sale.items.map(
                    (item) =>
                      item.category
                      || '',
                  ),
              )
              .filter(Boolean),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [data],
    );

  const filteredSales =
    useMemo(
      () =>
        (
          data?.sales
          || []
        ).filter(
          (sale) => {
            if (
              sale.saleDate
                < reportWindow.from
              || sale.saleDate
                > reportWindow.to
            ) {
              return false;
            }

            if (
              accountId
              && !sale.payments.some(
                (payment) =>
                  payment.accountId
                  === accountId,
              )
            ) {
              return false;
            }

            if (
              paymentMethod
              && !sale.payments.some(
                (payment) =>
                  (
                    payment.paymentMethod
                    || payment.paymentMethodLabel
                    || 'unknown'
                  )
                  === paymentMethod,
              )
            ) {
              return false;
            }

            if (
              cashierUid
              && sale.createdBy
                !== cashierUid
            ) {
              return false;
            }

            if (
              customer
              === '__walk_in__'
              && sale.customerId
            ) {
              return false;
            }

            if (
              customer
              && customer
                !== '__walk_in__'
              && sale.customerName
                !== customer
            ) {
              return false;
            }

            if (
              sellerId
              && !sale.items.some(
                (item) =>
                  item.sellerId
                  === sellerId,
              )
            ) {
              return false;
            }

            if (
              product
              && !sale.items.some(
                (item) =>
                  item.productName
                  === product,
              )
            ) {
              return false;
            }

            if (
              category
              && !sale.items.some(
                (item) =>
                  item.category
                  === category,
              )
            ) {
              return false;
            }

            if (
              receipt.trim()
              && !sale.receiptNumber
                .toLowerCase()
                .includes(
                  receipt
                    .trim()
                    .toLowerCase(),
                )
            ) {
              return false;
            }

            if (
              status
              && sale.status
                !== status
            ) {
              return false;
            }

            if (
              mode
              && sale.sourceMode
                !== mode
            ) {
              return false;
            }

            return saleMatchesSearch(
              sale,
              search,
            );
          },
        ),
      [
        accountId,
        cashierUid,
        category,
        customer,
        data,
        mode,
        paymentMethod,
        product,
        receipt,
        search,
        sellerId,
        status,
        reportWindow.from,
        reportWindow.to,
      ],
    );

  const activeSales =
    filteredSales.filter(
      (sale) =>
        sale.status
        !== 'voided',
    );

  const grossSalesMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + sale.subtotalMinor,
      0,
    );

  const discountsMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + sale.discountMinor,
      0,
    );

  const refundsMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + sale.returnedMinor,
      0,
    );

  const netSalesMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + saleNetMinor(
            sale,
          ),
      0,
    );

  const itemCount =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + saleItemNetQuantity(
            sale,
          ),
      0,
    );

  const averageSaleMinor =
    activeSales.length
      ? Math.round(
          netSalesMinor
          / activeSales.length,
        )
      : 0;

  const estimatedProfitMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + sale.profitMinor,
      0,
    );

  const marketplaceCommissionMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + sale.marketplaceCommissionMinor,
      0,
    );

  const sellerEarningsMinor =
    activeSales.reduce(
      (sum, sale) =>
        sum
        + sale.sellerEarningsMinor,
      0,
    );

  const filteredPayouts =
    (
      data?.payouts
      || []
    ).filter(
      (payout) =>
        payout.payoutDate
          >= reportWindow.from
        && payout.payoutDate
          <= reportWindow.to
        && (
          !sellerId
          || payout.sellerId
            === sellerId
        )
        && (
          !accountId
          || payout.payments.some(
            (payment) =>
              payment.accountId
              === accountId,
          )
        ),
    );

  const sellerPayoutMinor =
    filteredPayouts.reduce(
      (sum, payout) =>
        sum
        + payout.amountMinor,
      0,
    );

  const sellerOutstandingMinor =
    (
      data?.sellers
      || []
    )
      .filter(
        (seller) =>
          !sellerId
          || seller.id
            === sellerId,
      )
      .reduce(
        (sum, seller) =>
          sum
          + Math.max(
              0,
              seller.balanceMinor,
            ),
        0,
      );

  const salesByAccount =
    (() => {
        const totals =
          new Map<
            string,
            {
              name:
                string;
              amountMinor:
                number;
            }
          >();

        activeSales.forEach(
          (sale) =>
            sale.payments.forEach(
              (payment) => {
                const amountMinor =
                  Math.max(
                    0,
                    payment.amountMinor
                    - payment.returnedMinor,
                  );

                const current =
                  totals.get(
                    payment.accountId,
                  );

                totals.set(
                  payment.accountId,
                  {
                    name:
                      payment.accountName,
                    amountMinor:
                      (
                        current?.amountMinor
                        || 0
                      )
                      + amountMinor,
                  },
                );
              },
            ),
        );

        return [
          ...totals.entries(),
        ]
          .map(
            ([id, value]) => ({
              id,
              ...value,
            }),
          )
          .sort(
            (a, b) =>
              b.amountMinor
              - a.amountMinor,
          );
      })();

  const salesByPaymentMethod =
    (() => {
        const totals =
          new Map<
            string,
            {
              name:
                string;
              amountMinor:
                number;
            }
          >();

        activeSales.forEach(
          (sale) =>
            sale.payments.forEach(
              (payment) => {
                const key =
                  payment.paymentMethod
                  || payment.paymentMethodLabel
                  || 'unknown';

                const current =
                  totals.get(key);

                totals.set(
                  key,
                  {
                    name:
                      paymentMethodName(
                        payment.paymentMethod,
                        payment.paymentMethodLabel,
                      ),
                    amountMinor:
                      (
                        current?.amountMinor
                        || 0
                      )
                      + Math.max(
                          0,
                          payment.amountMinor
                          - payment.returnedMinor,
                        ),
                  },
                );
              },
            ),
        );

        return [
          ...totals.entries(),
        ]
          .map(
            ([id, value]) => ({
              id,
              ...value,
            }),
          )
          .sort(
            (a, b) =>
              b.amountMinor
              - a.amountMinor,
          );
      })();

  const productSummary =
    (() => {
        const totals =
          new Map<
            string,
            {
              quantity:
                number;
              amountMinor:
                number;
            }
          >();

        activeSales.forEach(
          (sale) =>
            sale.items.forEach(
              (item) => {
                const current =
                  totals.get(
                    item.productName,
                  );

                totals.set(
                  item.productName,
                  {
                    quantity:
                      (
                        current?.quantity
                        || 0
                      )
                      + Math.max(
                          0,
                          item.quantity
                          - item.returnedQuantity,
                        ),
                    amountMinor:
                      (
                        current?.amountMinor
                        || 0
                      )
                      + Math.max(
                          0,
                          item.netLineMinor
                          - item.returnedMinor,
                        ),
                  },
                );
              },
            ),
        );

        return [
          ...totals.entries(),
        ]
          .map(
            ([name, value]) => ({
              name,
              ...value,
            }),
          )
          .sort(
            (a, b) =>
              b.amountMinor
              - a.amountMinor,
          )
          .slice(
            0,
            10,
          );
      })();

  function resetFilters() {
    setRange('month');
    setCustomFrom(
      todayKey(),
    );
    setCustomTo(
      todayKey(),
    );
    setAccountId('');
    setPaymentMethod('');
    setCashierUid('');
    setCustomer('');
    setSellerId('');
    setProduct('');
    setCategory('');
    setReceipt('');
    setStatus('');
    setMode('');
    setSearch('');
  }

  function exportCsv() {
    const header = [
      'Date',
      'Receipt',
      'POS Type',
      'Status',
      'Customer',
      'Cashier',
      'Gross',
      'Discount',
      'Refund',
      'Net Sales',
      'Profit',
      'Marketplace Commission',
      'Seller Earnings',
      'Payment Accounts',
      'Payment Methods',
      'Items',
    ];

    const rows =
      filteredSales.map(
        (sale) => [
          sale.saleDate,
          sale.receiptNumber,
          sale.sourceMode,
          sale.status,
          sale.customerName
            || 'Walk-in customer',
          sale.cashierName,
          (
            sale.subtotalMinor
            / 100
          ).toFixed(2),
          (
            sale.discountMinor
            / 100
          ).toFixed(2),
          (
            sale.returnedMinor
            / 100
          ).toFixed(2),
          (
            saleNetMinor(sale)
            / 100
          ).toFixed(2),
          (
            sale.profitMinor
            / 100
          ).toFixed(2),
          (
            sale.marketplaceCommissionMinor
            / 100
          ).toFixed(2),
          (
            sale.sellerEarningsMinor
            / 100
          ).toFixed(2),
          sale.payments
            .map(
              (payment) =>
                payment.accountName,
            )
            .join(' | '),
          sale.payments
            .map(
              (payment) =>
                paymentMethodName(
                  payment.paymentMethod,
                  payment.paymentMethodLabel,
                ),
            )
            .join(' | '),
          sale.items
            .map(
              (item) =>
                `${item.productName} x${item.quantity}`,
            )
            .join(' | '),
        ],
      );

    const csv =
      [
        header,
        ...rows,
      ]
        .map(
          (row) =>
            row.map(
              csvCell,
            ).join(','),
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
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        'a',
      );

    link.href =
      url;

    link.download =
      `bajetbn-${space.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-pos-report-${reportWindow.from}-${reportWindow.to}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  if (loading) {
    return (
      <section className="panel">
        <div className="loading-panel">
          Loading Business POS reports…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <div className="notice error">
          {error}
        </div>
      </section>
    );
  }

  if (!data?.posEnabled) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Business POS
            </span>

            <h2>
              Advanced POS reports
            </h2>

            <p>
              This Business Space has no active POS report data yet.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel"
      data-business-pos-report
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            Advanced Business reports
          </span>

          <h2>
            {data.shopName || space.name} · POS
          </h2>

          <p>
            Standard POS and Marketplace sales, refunds, split payments and seller activity.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="button secondary"
            onClick={
              exportCsv
            }
          >
            Export CSV
          </button>

          <button
            type="button"
            className="button secondary"
            onClick={
              () =>
                window.print()
            }
          >
            Print report
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Period
          <select
            value={range}
            onChange={
              (event) =>
                setRange(
                  event.target.value as ReportRange,
                )
            }
          >
            <option value="today">
              Today
            </option>
            <option value="week">
              This week
            </option>
            <option value="month">
              This month
            </option>
            <option value="year">
              This year
            </option>
            <option value="custom">
              Custom range
            </option>
          </select>
        </label>

        {range === 'custom' && (
          <>
            <label>
              From
              <input
                type="date"
                value={customFrom}
                onChange={
                  (event) =>
                    setCustomFrom(
                      event.target.value,
                    )
                }
              />
            </label>

            <label>
              To
              <input
                type="date"
                value={customTo}
                onChange={
                  (event) =>
                    setCustomTo(
                      event.target.value,
                    )
                }
              />
            </label>
          </>
        )}

        <label>
          POS type
          <select
            value={mode}
            onChange={
              (event) =>
                setMode(
                  event.target.value,
                )
            }
          >
            <option value="">
              All POS
            </option>
            <option value="standard">
              Standard POS
            </option>
            <option value="marketplace_consignment">
              Marketplace POS
            </option>
          </select>
        </label>

        <label>
          Payment account
          <select
            value={accountId}
            onChange={
              (event) =>
                setAccountId(
                  event.target.value,
                )
            }
          >
            <option value="">
              All accounts
            </option>

            {accounts.map(
              ([id, name]) => (
                <option
                  value={id}
                  key={id}
                >
                  {name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Payment method
          <select
            value={paymentMethod}
            onChange={
              (event) =>
                setPaymentMethod(
                  event.target.value,
                )
            }
          >
            <option value="">
              All methods
            </option>

            {paymentMethods.map(
              ([id, name]) => (
                <option
                  key={id}
                  value={id}
                >
                  {name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Cashier / staff
          <select
            value={cashierUid}
            onChange={
              (event) =>
                setCashierUid(
                  event.target.value,
                )
            }
          >
            <option value="">
              All staff
            </option>

            {data.staff.map(
              (member) => (
                <option
                  key={member.uid}
                  value={member.uid}
                >
                  {member.name}
                  {' · '}
                  {member.role}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Customer
          <select
            value={customer}
            onChange={
              (event) =>
                setCustomer(
                  event.target.value,
                )
            }
          >
            <option value="">
              All customers
            </option>

            <option value="__walk_in__">
              Walk-in customer
            </option>

            {customers.map(
              (name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Seller
          <select
            value={sellerId}
            onChange={
              (event) =>
                setSellerId(
                  event.target.value,
                )
            }
          >
            <option value="">
              All sellers
            </option>

            {data.sellers.map(
              (seller) => (
                <option
                  key={seller.id}
                  value={seller.id}
                >
                  {seller.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Product / item
          <select
            value={product}
            onChange={
              (event) =>
                setProduct(
                  event.target.value,
                )
            }
          >
            <option value="">
              All products
            </option>

            {products.map(
              (name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={
              (event) =>
                setCategory(
                  event.target.value,
                )
            }
          >
            <option value="">
              All categories
            </option>

            {categories.map(
              (name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Sale status
          <select
            value={status}
            onChange={
              (event) =>
                setStatus(
                  event.target.value,
                )
            }
          >
            <option value="">
              All statuses
            </option>
            <option value="completed">
              Completed
            </option>
            <option value="partially_returned">
              Partially returned
            </option>
            <option value="refunded">
              Refunded
            </option>
            <option value="voided">
              Voided
            </option>
          </select>
        </label>

        <label>
          Receipt number
          <input
            value={receipt}
            onChange={
              (event) =>
                setReceipt(
                  event.target.value,
                )
            }
            placeholder="Receipt number"
          />
        </label>

        <label>
          Search
          <input
            value={search}
            onChange={
              (event) =>
                setSearch(
                  event.target.value,
                )
            }
            placeholder="Customer, item, seller, staff…"
          />
        </label>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          onClick={
            resetFilters
          }
        >
          Reset filters
        </button>

        <small>
          {reportWindow.from}
          {' → '}
          {reportWindow.to}
          {' · '}
          {filteredSales.length}
          {' sale'}
          {filteredSales.length === 1 ? '' : 's'}
        </small>
      </div>

      <div className="summary-grid">
        <article className="summary-card featured">
          <span>
            Gross sales
          </span>
          <strong>
            {formatMoney(
              grossSalesMinor,
              data.currency,
            )}
          </strong>
        </article>

        <article className="summary-card">
          <span>
            Discounts
          </span>
          <strong>
            {formatMoney(
              discountsMinor,
              data.currency,
            )}
          </strong>
        </article>

        <article className="summary-card">
          <span>
            Returns / refunds
          </span>
          <strong>
            {formatMoney(
              refundsMinor,
              data.currency,
            )}
          </strong>
        </article>

        <article className="summary-card featured">
          <span>
            Net sales
          </span>
          <strong>
            {formatMoney(
              netSalesMinor,
              data.currency,
            )}
          </strong>
        </article>

        <article className="summary-card">
          <span>
            Transactions
          </span>
          <strong>
            {activeSales.length}
          </strong>
        </article>

        <article className="summary-card">
          <span>
            Items sold
          </span>
          <strong>
            {itemCount}
          </strong>
        </article>

        <article className="summary-card">
          <span>
            Average sale
          </span>
          <strong>
            {formatMoney(
              averageSaleMinor,
              data.currency,
            )}
          </strong>
        </article>

        <article className="summary-card">
          <span>
            Estimated profit
          </span>
          <strong>
            {formatMoney(
              estimatedProfitMinor,
              data.currency,
            )}
          </strong>
        </article>
      </div>

      {data.mode === 'marketplace_consignment'
        || activeSales.some(
          (sale) =>
            sale.sourceMode
            === 'marketplace_consignment',
        )
        ? (
          <div className="summary-grid">
            <article className="summary-card featured">
              <span>
                Marketplace commission
              </span>
              <strong>
                {formatMoney(
                  marketplaceCommissionMinor,
                  data.currency,
                )}
              </strong>
            </article>

            <article className="summary-card">
              <span>
                Seller earnings
              </span>
              <strong>
                {formatMoney(
                  sellerEarningsMinor,
                  data.currency,
                )}
              </strong>
            </article>

            <article className="summary-card">
              <span>
                Seller payouts
              </span>
              <strong>
                {formatMoney(
                  sellerPayoutMinor,
                  data.currency,
                )}
              </strong>
            </article>

            <article className="summary-card">
              <span>
                Seller outstanding
              </span>
              <strong>
                {formatMoney(
                  sellerOutstandingMinor,
                  data.currency,
                )}
              </strong>
            </article>
          </div>
        )
        : null}

      <div className="reports-grid">
        <article className="panel report-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Payment allocation
              </span>
              <h3>
                Sales by account
              </h3>
              <p>
                Split payments are allocated to their actual payment accounts.
              </p>
            </div>
          </div>

          <div className="report-mini-list">
            {salesByAccount.map(
              (item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                  </span>
                  <strong>
                    {formatMoney(
                      item.amountMinor,
                      data.currency,
                    )}
                  </strong>
                </div>
              ),
            )}

            {!salesByAccount.length && (
              <div className="report-empty">
                No account allocation for these filters.
              </div>
            )}
          </div>
        </article>

        <article className="panel report-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Payment methods
              </span>
              <h3>
                Sales by payment method
              </h3>
            </div>
          </div>

          <div className="report-mini-list">
            {salesByPaymentMethod.map(
              (item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                  </span>
                  <strong>
                    {formatMoney(
                      item.amountMinor,
                      data.currency,
                    )}
                  </strong>
                </div>
              ),
            )}

            {!salesByPaymentMethod.length && (
              <div className="report-empty">
                No payment method activity.
              </div>
            )}
          </div>
        </article>

        <article className="panel report-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Products
              </span>
              <h3>
                Top items
              </h3>
            </div>
          </div>

          <div className="report-mini-list">
            {productSummary.map(
              (item) => (
                <div key={item.name}>
                  <span>
                    {item.name}
                    {' · '}
                    {item.quantity}
                    {' sold'}
                  </span>
                  <strong>
                    {formatMoney(
                      item.amountMinor,
                      data.currency,
                    )}
                  </strong>
                </div>
              ),
            )}

            {!productSummary.length && (
              <div className="report-empty">
                No item activity.
              </div>
            )}
          </div>
        </article>
      </div>

      <section>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Sale records
            </span>
            <h3>
              Filtered transactions
            </h3>
          </div>
        </div>

        <div className="sme-pos-sales-list">
          {filteredSales.map(
            (sale) => (
              <article
                key={sale.id}
                className="transaction-row"
              >
                <div className="transaction-main">
                  <strong>
                    {sale.receiptNumber}
                  </strong>
                  <small>
                    {sale.saleDate}
                    {' · '}
                    {sale.customerName
                      || 'Walk-in customer'}
                    {' · '}
                    {sale.cashierName}
                  </small>
                </div>

                <div className="transaction-context">
                  <strong>
                    {sale.sourceMode
                      === 'marketplace_consignment'
                      ? 'Marketplace POS'
                      : 'Standard POS'}
                  </strong>

                  <small>
                    {sale.items
                      .map(
                        (item) =>
                          item.productName,
                      )
                      .join(', ')}
                  </small>
                </div>

                <div className="transaction-amount">
                  <strong>
                    {formatMoney(
                      saleNetMinor(
                        sale,
                      ),
                      data.currency,
                    )}
                  </strong>

                  <small>
                    {sale.status}
                  </small>
                </div>
              </article>
            ),
          )}

          {!filteredSales.length && (
            <div className="report-empty">
              No POS sales match these filters.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
