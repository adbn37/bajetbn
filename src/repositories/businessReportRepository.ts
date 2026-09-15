import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from '../services/firebase';

export interface BusinessPosReportPayment {
  accountId: string;
  accountName: string;
  paymentMethod?: string | null;
  paymentMethodLabel?: string | null;
  amountMinor: number;
  returnedMinor: number;
}

export interface BusinessPosReportItem {
  productId: string;
  listingId?: string | null;
  productName: string;
  category?: string;
  sku?: string;
  barcode?: string;
  sellerId?: string | null;
  sellerName?: string | null;
  quantity: number;
  returnedQuantity: number;
  lineTotalMinor: number;
  lineCostMinor: number;
  netLineMinor: number;
  returnedMinor: number;
  commissionMinor: number;
  sellerEarningsMinor: number;
}

export interface BusinessPosReportSale {
  id: string;
  receiptNumber: string;
  sourceMode:
    | 'standard'
    | 'marketplace_consignment';
  status:
    | 'completed'
    | 'partially_returned'
    | 'refunded'
    | 'voided';
  returnStatus: string;
  customerId?: string | null;
  customerName?: string | null;
  createdBy: string;
  cashierName: string;
  saleDate: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  returnedMinor: number;
  costMinor: number;
  profitMinor: number;
  marketplaceCommissionMinor: number;
  sellerEarningsMinor: number;
  currency: string;
  note?: string;
  payments: BusinessPosReportPayment[];
  items: BusinessPosReportItem[];
}

export interface BusinessPosReportPayout {
  id: string;
  sellerId: string;
  sellerName: string;
  amountMinor: number;
  balanceAfterMinor: number;
  payoutDate: string;
  currency: string;
  reference?: string;
  payments: BusinessPosReportPayment[];
}

export interface BusinessPosReportSeller {
  id: string;
  name: string;
  balanceMinor: number;
  grossSalesMinor: number;
  commissionEarnedMinor: number;
  paidOutMinor: number;
  soldQuantity: number;
}

export interface BusinessPosReportStaff {
  uid: string;
  name: string;
  role: string;
}

export interface BusinessPosAdvancedReport {
  spaceId: string;
  posEnabled: boolean;
  mode:
    | 'standard'
    | 'marketplace_consignment'
    | null;
  shopName: string;
  currency: string;
  sales: BusinessPosReportSale[];
  payouts: BusinessPosReportPayout[];
  sellers: BusinessPosReportSeller[];
  staff: BusinessPosReportStaff[];
}

export async function getBusinessPosAdvancedReport(
  spaceId: string,
): Promise<BusinessPosAdvancedReport> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getBusinessPosAdvancedReport',
    );

  const result =
    await call({
      spaceId,
    });

  return result.data as BusinessPosAdvancedReport;
}
