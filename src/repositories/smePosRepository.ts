import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { requireFirebase } from '../services/firebase';
import type {
  PaymentMethodCode,
  SmePosAccess,
  SmePosCommissionType,
  SmePosCustomer,
  SmePosListing,
  SmePosListingCondition,
  SmePosMode,
  SmePosPaymentAccount,
  SmePosPayout,
  SmePosProduct,
  SmePosReservation,
  SmePosRole,
  SmePosSeller,
  SmePosSellerLedgerEntry,
  SmePosSale,
  SmePosSettings,
  SmePosStatus,
  SmePosUsageCounts,
} from '../types/models';

function byUpdatedAt<T extends { updatedAt?: { toMillis?: () => number }; createdAt?: { toMillis?: () => number } }>(items: T[]) {
  return items.sort((a, b) => (b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0));
}

export async function getSmePosSettings(spaceId: string): Promise<SmePosSettings | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'smePosSettings', spaceId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as SmePosSettings) : null;
}

export async function getMySmePosAccess(spaceId: string, uid: string): Promise<SmePosAccess | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'smePosAccess', `${spaceId}_${uid}`));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as SmePosAccess) : null;
}

export async function listSmePosAccess(spaceId: string): Promise<SmePosAccess[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosAccess'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SmePosAccess)
    .filter((item) => item.status === 'active')
    .sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
}

export async function getSmePosUsageCounts(spaceId: string): Promise<SmePosUsageCounts> {
  const { db } = requireFirebase();
  const collectionNames = [
    ['products', 'smePosProducts'],
    ['customers', 'smePosCustomers'],
    ['sellers', 'smePosSellers'],
    ['listings', 'smePosListings'],
    ['sales', 'smePosSales'],
  ] as const;
  const values = await Promise.all(collectionNames.map(async ([key, collectionName]) => {
    const result = await getCountFromServer(query(collection(db, collectionName), where('spaceId', '==', spaceId)));
    return [key, result.data().count] as const;
  }));
  return Object.fromEntries(values) as unknown as SmePosUsageCounts;
}

export async function listSmePosProducts(spaceId: string, includeArchived = false): Promise<SmePosProduct[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosProducts'), where('spaceId', '==', spaceId)));
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SmePosProduct);
  return byUpdatedAt(items.filter((item) => includeArchived || !item.archivedAt));
}

export async function listSmePosCustomers(spaceId: string, includeArchived = false): Promise<SmePosCustomer[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosCustomers'), where('spaceId', '==', spaceId)));
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SmePosCustomer);
  return byUpdatedAt(items.filter((item) => !item.deletedAt && (includeArchived || !item.archivedAt)));
}

export async function listSmePosPaymentAccounts(spaceId: string): Promise<SmePosPaymentAccount[]> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'getSmePosPaymentAccounts');
  const result = await call({ spaceId });
  return ((result.data as { accounts?: SmePosPaymentAccount[] })?.accounts || []);
}

export async function listSmePosSales(spaceId: string): Promise<SmePosSale[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosSales'), where('spaceId', '==', spaceId)));
  return byUpdatedAt(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SmePosSale));
}

export async function getSmePosStaffWorkspace(spaceId: string): Promise<{
  products: SmePosProduct[];
  customers: SmePosCustomer[];
  sales: SmePosSale[];
}> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'getSmePosStaffWorkspace');
  const result = await call({ spaceId });
  const data = result.data as { products?: SmePosProduct[]; customers?: SmePosCustomer[]; sales?: SmePosSale[] };
  return {
    products: data.products || [],
    customers: data.customers || [],
    sales: data.sales || [],
  };
}

export async function saveSmePosSetup(input: {
  spaceId: string;
  mode: SmePosMode;
  shopName: string;
  receiptName: string;
  receiptFooter?: string;
  defaultPaymentAccountId?: string | null;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'saveSmePosSetup');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function setSmePosStatus(spaceId: string, status: Exclude<SmePosStatus, 'draft'>) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setSmePosStatus');
  return call({ spaceId, status, idempotencyKey: crypto.randomUUID() });
}

export async function setSmePosAccessRole(input: {
  spaceId: string;
  memberUid: string;
  role: Exclude<SmePosRole, 'owner'>;
  active: boolean;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setSmePosAccessRole');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function saveSmePosProduct(input: {
  spaceId: string;
  productId?: string;
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
  photoPath?: string | null;
  note?: string;
  condition?: SmePosListingCondition;
  conditionNote?: string;
  sellingPriceMinor: number;
  costPriceMinor?: number | null;
  trackStock: boolean;
  quantityOnHand: number;
  lowStockLevel: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'saveSmePosProduct');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function setSmePosProductArchived(spaceId: string, productId: string, archived: boolean) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setSmePosProductArchived');
  return call({ spaceId, productId, archived, idempotencyKey: crypto.randomUUID() });
}

export async function updateSmePosProductStock(input: {
  spaceId: string;
  productId: string;
  quantityOnHand: number;
  lowStockLevel: number;
  stocktake?: boolean;
  note?: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'updateSmePosProductStock');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function receiveSmePosProductStock(input: {
  spaceId: string;
  productId: string;
  quantityReceived: number;
  note?: string;
}): Promise<{ data: { productId: string; quantityReceived: number; quantityOnHand: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'receiveSmePosProductStock');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { productId: string; quantityReceived: number; quantityOnHand: number } }>;
}

export async function saveSmePosCustomer(input: {
  spaceId: string;
  customerId?: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'saveSmePosCustomer');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function setSmePosCustomerArchived(spaceId: string, customerId: string, archived: boolean) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setSmePosCustomerArchived');
  return call({ spaceId, customerId, archived, idempotencyKey: crypto.randomUUID() });
}

export async function deleteSmePosCustomer(spaceId: string, customerId: string): Promise<{ data: { customerId: string; preservedHistory: boolean } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'deleteSmePosCustomer');
  return call({ spaceId, customerId, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { customerId: string; preservedHistory: boolean } }>;
}

export async function uploadSmePosItemPhoto(spaceId: string, file: File): Promise<{ photoPath: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image for the item photo.');
  if (file.size <= 0 || file.size >= 5 * 1024 * 1024) throw new Error('Item photo must be smaller than 5 MB.');
  const { storage } = requireFirebase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'item-photo';
  const photoPath = `spaces/${spaceId}/sme-pos-items/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, photoPath), file, { contentType: file.type });
  return { photoPath };
}

export async function getSmePosItemPhotoUrl(photoPath: string) {
  const { storage } = requireFirebase();
  return getDownloadURL(ref(storage, photoPath));
}

export async function deleteSmePosItemPhoto(photoPath: string) {
  if (!photoPath) return;
  const { storage } = requireFirebase();
  await deleteObject(ref(storage, photoPath));
}

export async function registerExistingSmePosProduct(input: {
  spaceId: string;
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
  photoPath?: string | null;
  note?: string;
  condition?: SmePosListingCondition;
  conditionNote?: string;
  sellingPriceMinor: number;
  costPriceMinor?: number | null;
  quantityOnHand: number;
  lowStockLevel: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'registerExistingSmePosProduct');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export interface SmePosPaymentInput {
  accountId: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  amountMinor: number;
}

export interface StandardPosQuickItemInput {
  clientId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface MarketplaceQuickItemInput extends StandardPosQuickItemInput {
  sellerId: string;
  condition?: SmePosListingCondition;
}

export async function listSmePosReservations(spaceId: string, includeClosed = false): Promise<SmePosReservation[]> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'listSmePosReservations');
  const result = await call({ spaceId, includeClosed });
  return ((result.data as { reservations?: SmePosReservation[] })?.reservations || []);
}

export async function createSmePosReservation(input: {
  spaceId: string;
  sourceMode: SmePosMode;
  items: Array<{ itemId: string; quantity: number }>;
  customerId: string;
  discountMinor: number;
  reservationDate: string;
  dueDate?: string | null;
  depositPayments?: SmePosPaymentInput[];
  note?: string;
}): Promise<{ data: { reservationId: string; reservationNumber: string; remainingMinor: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'createSmePosReservation');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { reservationId: string; reservationNumber: string; remainingMinor: number } }>;
}

export async function addSmePosReservationDeposit(input: {
  spaceId: string;
  reservationId: string;
  payments: SmePosPaymentInput[];
  paymentDate: string;
  note?: string;
}): Promise<{ data: { reservationId: string; depositMinor: number; remainingMinor: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'addSmePosReservationDeposit');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { reservationId: string; depositMinor: number; remainingMinor: number } }>;
}

export async function completeSmePosReservation(input: {
  spaceId: string;
  reservationId: string;
  payments: SmePosPaymentInput[];
  saleDate: string;
  note?: string;
}): Promise<{ data: { reservationId: string; saleId: string; receiptNumber: string; transactionId: string } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'completeSmePosReservation');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { reservationId: string; saleId: string; receiptNumber: string; transactionId: string } }>;
}

export async function cancelSmePosReservation(input: {
  spaceId: string;
  reservationId: string;
  cancelDate: string;
  reason?: string;
}): Promise<{ data: { reservationId: string; refundedMinor: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'cancelSmePosReservation');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { reservationId: string; refundedMinor: number } }>;
}

export async function checkoutStandardPos(input: {
  spaceId: string;
  items: Array<{ productId: string; quantity: number }>;
  quickItems?: StandardPosQuickItemInput[];
  customerId?: string | null;
  payments: SmePosPaymentInput[];
  discountMinor: number;
  saleDate: string;
  note?: string;
}): Promise<{ data: { saleId: string; receiptNumber: string; transactionId: string; transactionIds?: string[] } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'checkoutStandardPos');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { saleId: string; receiptNumber: string; transactionId: string } }>;
}

export async function listMarketplaceSellers(spaceId: string, includeArchived = false): Promise<SmePosSeller[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosSellers'), where('spaceId', '==', spaceId)));
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SmePosSeller);
  return byUpdatedAt(items.filter((item) => !item.deletedAt && (includeArchived || !item.archivedAt)));
}

export async function listMarketplaceListings(spaceId: string, includeArchived = false): Promise<SmePosListing[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosListings'), where('spaceId', '==', spaceId)));
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SmePosListing);
  return byUpdatedAt(items.filter((item) => !item.sellerDeletedAt && (includeArchived || !item.archivedAt)));
}

export async function getMarketplacePosWorkspace(spaceId: string): Promise<{
  sellers: SmePosSeller[];
  listings: SmePosListing[];
  customers: SmePosCustomer[];
  sales: SmePosSale[];
  sellerLedger: SmePosSellerLedgerEntry[];
  payouts: SmePosPayout[];
  mySeller: SmePosSeller | null;
  mySellerListings: SmePosListing[];
  mySellerSales: SmePosSale[];
  mySellerLedger: SmePosSellerLedgerEntry[];
  mySellerPayouts: SmePosPayout[];
}> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'getMarketplacePosWorkspace');
  const result = await call({ spaceId });
  const data = result.data as {
    sellers?: SmePosSeller[];
    listings?: SmePosListing[];
    customers?: SmePosCustomer[];
    sales?: SmePosSale[];
    sellerLedger?: SmePosSellerLedgerEntry[];
    payouts?: SmePosPayout[];
    mySeller?: SmePosSeller | null;
    mySellerListings?: SmePosListing[];
    mySellerSales?: SmePosSale[];
    mySellerLedger?: SmePosSellerLedgerEntry[];
    mySellerPayouts?: SmePosPayout[];
  };
  return {
    sellers: data.sellers || [],
    listings: data.listings || [],
    customers: data.customers || [],
    sales: data.sales || [],
    sellerLedger: data.sellerLedger || [],
    payouts: data.payouts || [],
    mySeller: data.mySeller || null,
    mySellerListings: data.mySellerListings || [],
    mySellerSales: data.mySellerSales || [],
    mySellerLedger: data.mySellerLedger || [],
    mySellerPayouts: data.mySellerPayouts || [],
  };
}

export async function saveMarketplaceSeller(input: {
  spaceId: string;
  sellerId?: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  linkedUid?: string | null;
  defaultCommissionType: SmePosCommissionType;
  defaultCommissionRateBps: number;
  defaultCommissionMinor: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'saveMarketplaceSeller');
  return call({
    ...input,
    commissionType: input.defaultCommissionType,
    commissionRateBps: input.defaultCommissionRateBps,
    commissionMinor: input.defaultCommissionMinor,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function setMarketplaceSellerArchived(spaceId: string, sellerId: string, archived: boolean) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setMarketplaceSellerArchived');
  return call({ spaceId, sellerId, archived, idempotencyKey: crypto.randomUUID() });
}

export async function deleteMarketplaceSeller(spaceId: string, sellerId: string): Promise<{ data: { sellerId: string; preservedHistory: boolean; archivedListings: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'deleteMarketplaceSeller');
  return call({ spaceId, sellerId, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { sellerId: string; preservedHistory: boolean; archivedListings: number } }>;
}

export async function saveMarketplaceListing(input: {
  spaceId: string;
  listingId?: string;
  sellerId: string;
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
  photoPath?: string | null;
  note?: string;
  condition: SmePosListingCondition;
  conditionNote?: string;
  sellingPriceMinor: number;
  commissionType: SmePosCommissionType;
  commissionRateBps: number;
  commissionMinor: number;
  quantityOnHand: number;
  lowStockLevel: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'saveMarketplaceListing');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function registerExistingMarketplaceListing(input: {
  spaceId: string;
  sellerId: string;
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
  photoPath?: string | null;
  note?: string;
  condition: SmePosListingCondition;
  conditionNote?: string;
  sellingPriceMinor: number;
  quantityOnHand: number;
  lowStockLevel: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'registerExistingMarketplaceListing');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateMarketplaceListingStock(input: {
  spaceId: string;
  listingId: string;
  quantityOnHand: number;
  lowStockLevel: number;
  stocktake?: boolean;
  note?: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'updateMarketplaceListingStock');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function receiveMarketplaceListingStock(input: {
  spaceId: string;
  listingId: string;
  quantityReceived: number;
  note?: string;
}): Promise<{ data: { listingId: string; quantityReceived: number; quantityOnHand: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'receiveMarketplaceListingStock');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { listingId: string; quantityReceived: number; quantityOnHand: number } }>;
}

export async function setMarketplaceListingArchived(spaceId: string, listingId: string, archived: boolean) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setMarketplaceListingArchived');
  return call({ spaceId, listingId, archived, idempotencyKey: crypto.randomUUID() });
}

export async function checkoutMarketplacePos(input: {
  spaceId: string;
  items: Array<{ listingId: string; quantity: number }>;
  quickItems?: MarketplaceQuickItemInput[];
  customerId?: string | null;
  payments: SmePosPaymentInput[];
  discountMinor: number;
  saleDate: string;
  note?: string;
}): Promise<{ data: { saleId: string; receiptNumber: string; transactionId: string; transactionIds?: string[] } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'checkoutMarketplacePos');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { saleId: string; receiptNumber: string; transactionId: string } }>;
}

export async function returnSmePosSale(input: {
  spaceId: string;
  saleId: string;
  items: Array<{ itemId: string; quantity: number }>;
  returnDate: string;
  reason?: string;
}): Promise<{ data: { returnId: string; saleId: string; refundMinor: number; transactionId: string } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'returnSmePosSale');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { returnId: string; saleId: string; refundMinor: number; transactionId: string } }>;
}

export async function voidSmePosSale(input: {
  spaceId: string;
  saleId: string;
  voidDate: string;
  reason: string;
}): Promise<{
  data: {
    saleId: string;
    voidedMinor: number;
    transactionIds: string[];
    sellerAdjustments: number;
  };
}> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'voidSmePosSale');

  return call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  }) as Promise<{
    data: {
      saleId: string;
      voidedMinor: number;
      transactionIds: string[];
      sellerAdjustments: number;
    };
  }>;
}


export async function deleteSmePosSalePermanently(input: {
  spaceId: string;
  saleId: string;
  reason: string;
  confirmation: 'DELETE';
}): Promise<{
  data: {
    saleId: string;
    deleted: boolean;
  };
}> {
  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'deleteSmePosSalePermanently',
  );

  return call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  }) as Promise<{
    data: {
      saleId: string;
      deleted: boolean;
    };
  }>;
}

export async function recordMarketplaceSellerPayout(input: {
  spaceId: string;
  sellerId: string;
  amountMinor: number;
  payments: Array<{
    accountId: string;
    amountMinor: number;
    paymentMethod?: PaymentMethodCode | null;
    paymentMethodLabel?: string | null;
  }>;
  payoutDate: string;
  reference?: string;
  note?: string;
}): Promise<{ data: { payoutId: string; sellerId: string; transactionId: string; transactionIds?: string[]; balanceAfterMinor: number } }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'recordMarketplaceSellerPayout');
  return call({ ...input, idempotencyKey: crypto.randomUUID() }) as Promise<{ data: { payoutId: string; sellerId: string; transactionId: string; transactionIds?: string[]; balanceAfterMinor: number } }>;
}
