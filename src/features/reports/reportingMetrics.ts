import type {
  FinancialTransaction,
} from '../../types/models';

export interface ReportDateRange {
  start: string;
  end: string;
}

export interface CashFlowReportFilter {
  range: ReportDateRange;
  spaceId?: string;
  accountId?: string;
  categoryKey?: string;
}

export interface CashFlowReportSummary {
  moneyIn: number;
  moneyOut: number;
  netCashFlow: number;
}

interface SerializedTimestampLike {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
}

export function reportTransactionCategoryKey(
  transaction: FinancialTransaction,
) {
  return (
    transaction.categoryId
    || `name:${(
      transaction.category
      || 'Other'
    ).toLowerCase()}`
  );
}

export function reportPostedAtMillis(
  value: unknown,
) {
  if (
    value === null
    || value === undefined
  ) {
    return 0;
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : 0;
  }

  if (
    typeof value === 'string'
  ) {
    const parsed =
      Date.parse(
        value,
      );

    return Number.isNaN(
      parsed,
    )
      ? 0
      : parsed;
  }

  if (
    typeof value !== 'object'
  ) {
    return 0;
  }

  const timestamp =
    value as SerializedTimestampLike;

  if (
    typeof timestamp.toMillis
    === 'function'
  ) {
    const milliseconds =
      Number(
        timestamp.toMillis(),
      );

    return Number.isFinite(
      milliseconds,
    )
      ? milliseconds
      : 0;
  }

  const seconds =
    Number(
      timestamp.seconds
      ?? timestamp._seconds,
    );

  if (
    !Number.isFinite(
      seconds,
    )
  ) {
    return 0;
  }

  const nanoseconds =
    Number(
      timestamp.nanoseconds
      ?? timestamp._nanoseconds
      ?? 0,
    );

  return (
    seconds * 1000
    + (
      Number.isFinite(
        nanoseconds,
      )
        ? Math.floor(
            nanoseconds
            / 1_000_000,
          )
        : 0
    )
  );
}

export function compareReportTransactions(
  a: FinancialTransaction,
  b: FinancialTransaction,
) {
  const dateCompare =
    b.transactionDate.localeCompare(
      a.transactionDate,
    );

  if (
    dateCompare !== 0
  ) {
    return dateCompare;
  }

  return (
    reportPostedAtMillis(
      b.postedAt,
    )
    - reportPostedAtMillis(
      a.postedAt,
    )
  );
}

export function mergeReportTransactions(
  ...transactionLists:
    FinancialTransaction[][]
) {
  const merged =
    new Map<
      string,
      FinancialTransaction
    >();

  transactionLists.forEach(
    (
      transactions,
    ) => {
      transactions.forEach(
        (
          transaction,
        ) => {
          merged.set(
            transaction.id,
            transaction,
          );
        },
      );
    },
  );

  return [
    ...merged.values(),
  ].sort(
    compareReportTransactions,
  );
}

export function isCashFlowReportTransaction(
  transaction: FinancialTransaction,
) {
  return (
    transaction.status === 'posted'
    && (
      transaction.type === 'income'
      || transaction.type === 'expense'
    )
  );
}

export function matchesCashFlowReportFilter(
  transaction: FinancialTransaction,
  filter: CashFlowReportFilter,
) {
  if (
    !isCashFlowReportTransaction(
      transaction,
    )
  ) {
    return false;
  }

  if (
    transaction.transactionDate
      < filter.range.start
    || transaction.transactionDate
      > filter.range.end
  ) {
    return false;
  }

  if (
    filter.spaceId
    && transaction.spaceId
      !== filter.spaceId
  ) {
    return false;
  }

  if (
    filter.accountId
    && transaction.accountId
      !== filter.accountId
    && transaction.destinationAccountId
      !== filter.accountId
  ) {
    return false;
  }

  if (
    filter.categoryKey
    && reportTransactionCategoryKey(
      transaction,
    )
      !== filter.categoryKey
  ) {
    return false;
  }

  return true;
}

export function filterCashFlowReportTransactions(
  transactions: FinancialTransaction[],
  filter: CashFlowReportFilter,
) {
  return transactions.filter(
    (
      transaction,
    ) =>
      matchesCashFlowReportFilter(
        transaction,
        filter,
      ),
  );
}

export function summarizeCashFlow(
  transactions: FinancialTransaction[],
): CashFlowReportSummary {
  let moneyIn =
    0;

  let moneyOut =
    0;

  transactions.forEach(
    (
      transaction,
    ) => {
      if (
        !isCashFlowReportTransaction(
          transaction,
        )
      ) {
        return;
      }

      if (
        transaction.type === 'income'
      ) {
        moneyIn +=
          transaction.amountMinor;

        return;
      }

      moneyOut +=
        transaction.amountMinor;
    },
  );

  return {
    moneyIn,
    moneyOut,
    netCashFlow:
      moneyIn
      - moneyOut,
  };
}
