import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  httpsCallable,
} from 'firebase/functions';
import {
  prepareAdbnTechSessionAuth,
  requireAdbnTechFirebase,
} from '../services/adbnTechFirebase';

export const ADBN_TECH_ADMIN_EMAIL =
  'advancedevotion.bn@gmail.com';

export interface AdbnTechCustomerMirror {
  id: string;
  customerNo: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  district: string;
  status: string;
  customerSince: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdbnTechInvoiceMirror {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerNo: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  saleType: string;
  title: string;
  total: number;
  paid: number;
  balance: number;
  invoiceDate: string;
  dueDate: string;
  nextDueDate: string;
  status: string;
  monthlyAmount: number;
  termMonths: number;
  fulfilmentStatus: string;
  source: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdbnTechReadOnlySnapshot {
  customers: AdbnTechCustomerMirror[];
  invoices: AdbnTechInvoiceMirror[];
  connectedEmail: string;
  loadedAt: string;
}

export interface AdbnTechBankAccountMirror {
  id: string;
  accountName: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  currency: string;
  status: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdbnTechPaymentMirror {
  id: string;
  paymentNo: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerNo: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  status: string;
  note: string;
  bankAccountId: string;
  bankAccountName: string;
  bankAccountType: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdbnTechPaymentsReadOnlySnapshot {
  bankAccounts: AdbnTechBankAccountMirror[];
  payments: AdbnTechPaymentMirror[];
  connectedEmail: string;
  loadedAt: string;
}

export interface AdbnTechRecordPaymentInput {
  requestId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  bankAccountId: string;
  note: string;
}

export interface AdbnTechRecordPaymentResult {
  duplicatePrevented: boolean;
  paymentId: string;
  receiptNo: string;
  invoiceId: string;
  invoiceNo: string;
  planId: string;
  planNo: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  bankAccountId: string;
  bankAccountName: string;
  previousPaidTotal?: number;
  totalPaidAfter?: number;
  remainingBalanceAfter: number;
  nextDueDateAfter: string;
}

export interface AdbnTechPurchaseMirror {
  id: string;
  purchaseNo: string;
  purchaseDate: string;
  sellerName: string;
  sellerType: string;
  brand: string;
  model: string;
  category: string;
  condition: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  quantityReceived: number;
  quantityOutstanding: number;
  orderStatus: string;
  receivedDate: string;
  deliveryReference: string;
  paymentStatus: string;
  amountPaid: number;
  outstandingBalance: number;
  linkedProductId: string;
  linkedBuildId: string;
  linkedBuildNo: string;
  inventoryAdded: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdbnTechPurchasesReadOnlySnapshot {
  purchases: AdbnTechPurchaseMirror[];
  connectedEmail: string;
  loadedAt: string;
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function money(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeEmail(value: unknown) {
  return text(value).trim().toLowerCase();
}

function timestampMillis(value: unknown) {
  if (
    value
    && typeof value === 'object'
    && 'toMillis' in value
    && typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function getAdbnTechConnectedEmail() {
  const { auth } = requireAdbnTechFirebase();
  return normalizeEmail(auth.currentUser?.email);
}

export async function connectAdbnTechReadOnly() {
  const auth = await prepareAdbnTechSessionAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const email = normalizeEmail(result.user.email);

  if (email !== ADBN_TECH_ADMIN_EMAIL) {
    await signOut(auth);
    throw new Error(
      'Choose ' + ADBN_TECH_ADMIN_EMAIL + ' to connect ADBN TECH.',
    );
  }

  return email;
}

export async function disconnectAdbnTechReadOnly() {
  const { auth } = requireAdbnTechFirebase();
  await signOut(auth);
}

function adbnTechConnectedSession() {
  const {
    auth,
    db,
    functions,
  } = requireAdbnTechFirebase();

  const connectedEmail =
    normalizeEmail(
      auth.currentUser?.email,
    );

  if (
    connectedEmail
    !== ADBN_TECH_ADMIN_EMAIL
  ) {
    throw new Error(
      'Connect ADBN TECH with '
      + ADBN_TECH_ADMIN_EMAIL
      + ' first.',
    );
  }

  return {
    auth,
    db,
    functions,
    connectedEmail,
  };
}

export async function loadAdbnTechBankAccountsReadOnly(): Promise<
  AdbnTechBankAccountMirror[]
> {
  const { db } =
    adbnTechConnectedSession();

  const snapshot =
    await getDocs(
      collection(
        db,
        'bankAccounts',
      ),
    );

  return snapshot.docs
    .map((record) => {
      const data =
        record.data();

      const status =
        text(data.status);

      const normalizedStatus =
        status
          .trim()
          .toLowerCase();

      return {
        id: record.id,
        accountName:
          text(data.accountName),
        bankName:
          text(data.bankName),
        accountType:
          text(data.accountType),
        accountNumber:
          text(data.accountNumber),
        currency:
          text(data.currency)
          || 'BND',
        status,
        isActive:
          data.active !== false
          && !data.archivedAt
          && normalizedStatus !== 'archived'
          && normalizedStatus !== 'closed'
          && normalizedStatus !== 'inactive',
        createdAt:
          data.createdAt,
        updatedAt:
          data.updatedAt,
      } satisfies AdbnTechBankAccountMirror;
    })
    .sort((a, b) => {
      if (
        a.isActive
        !== b.isActive
      ) {
        return a.isActive
          ? -1
          : 1;
      }

      return (
        a.accountName
        || a.bankName
        || a.id
      ).localeCompare(
        b.accountName
        || b.bankName
        || b.id,
      );
    });
}

export async function recordAdbnTechPayment(
  input: AdbnTechRecordPaymentInput,
): Promise<AdbnTechRecordPaymentResult> {
  const { functions } =
    adbnTechConnectedSession();

  const requestId =
    input.requestId.trim();
  const invoiceId =
    input.invoiceId.trim();
  const amount =
    money(input.amount);
  const paymentDate =
    input.paymentDate.trim();
  const method =
    input.method.trim();
  const bankAccountId =
    input.bankAccountId.trim();

  if (requestId.length < 8) {
    throw new Error(
      'A valid ADBN TECH payment request ID is required.',
    );
  }

  if (!invoiceId) {
    throw new Error(
      'Choose an ADBN TECH invoice first.',
    );
  }

  if (amount <= 0) {
    throw new Error(
      'Payment amount must be greater than zero.',
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(paymentDate)
  ) {
    throw new Error(
      'Choose a valid payment date.',
    );
  }

  if (!method) {
    throw new Error(
      'Choose a payment method.',
    );
  }

  if (!bankAccountId) {
    throw new Error(
      'Choose the ADBN TECH receiving account.',
    );
  }

  const call = httpsCallable<
    AdbnTechRecordPaymentInput,
    AdbnTechRecordPaymentResult
  >(
    functions,
    'recordBajetBnPayment',
  );

  const result =
    await call({
      requestId,
      invoiceId,
      amount,
      paymentDate,
      method,
      reference:
        input.reference.trim(),
      bankAccountId,
      note:
        input.note.trim(),
    });

  return result.data;
}

export async function loadAdbnTechReadOnlySnapshot(): Promise<
  AdbnTechReadOnlySnapshot
> {
  const { auth, db } = requireAdbnTechFirebase();
  const connectedEmail = normalizeEmail(auth.currentUser?.email);

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    throw new Error(
      'Connect ADBN TECH with ' + ADBN_TECH_ADMIN_EMAIL + ' first.',
    );
  }

  /*
   * Slice 22 is intentionally read-only. Do not add Firestore write methods
   * here. ADBN TECH remains the source of truth for these records.
   */
  const [customerSnapshot, invoiceSnapshot] = await Promise.all([
    getDocs(collection(db, 'customers')),
    getDocs(collection(db, 'invoices')),
  ]);

  const customers = customerSnapshot.docs
    .map((record) => {
      const data = record.data();
      return {
        id: record.id,
        customerNo: text(data.customerNo),
        name: text(data.name || data.customerName),
        email: text(data.email || data.customerEmail),
        phone: text(data.phone || data.customerPhone),
        whatsapp: text(data.whatsapp),
        address: text(data.address),
        district: text(data.district),
        status: text(data.status),
        customerSince: text(data.customerSince),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies AdbnTechCustomerMirror;
    })
    .sort(
      (a, b) =>
        timestampMillis(b.createdAt)
        - timestampMillis(a.createdAt),
    );

  const invoices = invoiceSnapshot.docs
    .map((record) => {
      const data = record.data();
      return {
        id: record.id,
        invoiceNo: text(data.invoiceNo),
        customerId: text(data.customerId),
        customerNo: text(data.customerNo),
        customerName: text(data.customerName),
        customerEmail: text(data.customerEmail),
        customerPhone: text(data.customerPhone),
        saleType: text(data.saleType),
        title: text(data.title),
        total: money(data.total),
        paid: money(data.paid ?? data.paidAmount ?? data.amountPaid),
        balance: money(
          data.balance
          ?? data.outstandingBalance
          ?? (money(data.total) - money(data.paid ?? data.paidAmount)),
        ),
        invoiceDate: text(data.invoiceDate),
        dueDate: text(data.dueDate),
        nextDueDate: text(data.nextDueDate),
        status: text(data.status),
        monthlyAmount: money(data.monthlyAmount),
        termMonths: money(data.termMonths),
        fulfilmentStatus: text(data.fulfilmentStatus),
        source: text(data.source),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies AdbnTechInvoiceMirror;
    })
    .sort(
      (a, b) =>
        timestampMillis(b.createdAt)
        - timestampMillis(a.createdAt),
    );

  return {
    customers,
    invoices,
    connectedEmail,
    loadedAt: new Date().toISOString(),
  };
}


export async function loadAdbnTechPaymentsReadOnly(): Promise<
  AdbnTechPaymentsReadOnlySnapshot
> {
  const { auth, db } = requireAdbnTechFirebase();
  const connectedEmail = normalizeEmail(auth.currentUser?.email);

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    throw new Error(
      'Connect ADBN TECH with ' + ADBN_TECH_ADMIN_EMAIL + ' first.',
    );
  }

  /*
   * Slice 23A is read-only against ADBN TECH.
   * Accounts, payments and invoice labels are fetched only with getDocs.
   */
  const [
    bankAccountSnapshot,
    paymentSnapshot,
    invoiceSnapshot,
  ] = await Promise.all([
    getDocs(collection(db, 'bankAccounts')),
    getDocs(collection(db, 'payments')),
    getDocs(collection(db, 'invoices')),
  ]);

  const bankAccounts = bankAccountSnapshot.docs
    .map((record) => {
      const data = record.data();
      const status = text(data.status);
      const normalizedStatus = status.trim().toLowerCase();

      return {
        id: record.id,
        accountName: text(data.accountName),
        bankName: text(data.bankName),
        accountType: text(data.accountType),
        accountNumber: text(data.accountNumber),
        currency: text(data.currency) || 'BND',
        status,
        isActive:
          data.active !== false
          && !data.archivedAt
          && normalizedStatus !== 'archived'
          && normalizedStatus !== 'closed'
          && normalizedStatus !== 'inactive',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies AdbnTechBankAccountMirror;
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }

      return (
        a.accountName
        || a.bankName
        || a.id
      ).localeCompare(
        b.accountName
        || b.bankName
        || b.id,
      );
    });

  const bankAccountById = new Map(
    bankAccounts.map((account) => [
      account.id,
      account,
    ]),
  );

  const invoiceById = new Map(
    invoiceSnapshot.docs.map((record) => {
      const data = record.data();

      return [
        record.id,
        {
          invoiceNo: text(data.invoiceNo),
          customerId: text(data.customerId),
          customerNo: text(data.customerNo),
          customerName: text(data.customerName),
        },
      ] as const;
    }),
  );

  const payments = paymentSnapshot.docs
    .map((record) => {
      const data = record.data();

      const invoiceId = text(
        data.invoiceId
        ?? data.linkedInvoiceId
        ?? data.invoiceID,
      );

      const invoice = invoiceById.get(invoiceId);

      const bankAccountId = text(data.bankAccountId);
      const bankAccount =
        bankAccountById.get(bankAccountId);

      return {
        id: record.id,
        paymentNo: text(
          data.paymentNo
          ?? data.receiptNo
          ?? data.referenceNo,
        ),
        invoiceId,
        invoiceNo:
          text(data.invoiceNo)
          || invoice?.invoiceNo
          || '',
        customerId:
          text(data.customerId)
          || invoice?.customerId
          || '',
        customerNo:
          text(data.customerNo)
          || invoice?.customerNo
          || '',
        customerName:
          text(data.customerName)
          || invoice?.customerName
          || '',
        amount: money(
          data.amount
          ?? data.paymentAmount
          ?? data.amountPaid,
        ),
        paymentDate: text(
          data.paymentDate
          ?? data.date
          ?? data.paidDate,
        ),
        paymentMethod: text(
          data.method
          ?? data.paymentMethod
          ?? data.paymentType,
        ),
        reference: text(
          data.customerBankReference
          ?? data.reference
          ?? data.transactionReference
          ?? data.bankReference,
        ),
        status: text(
          data.status
          ?? data.paymentStatus,
        ),
        note: text(
          data.note
          ?? data.notes
          ?? data.remarks,
        ),
        bankAccountId,
        bankAccountName:
          text(data.bankAccountName)
          || bankAccount?.accountName
          || bankAccount?.bankName
          || '',
        bankAccountType:
          text(data.bankAccountType)
          || bankAccount?.accountType
          || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies AdbnTechPaymentMirror;
    })
    .sort(
      (a, b) =>
        timestampMillis(b.createdAt)
        - timestampMillis(a.createdAt),
    );

  return {
    bankAccounts,
    payments,
    connectedEmail,
    loadedAt: new Date().toISOString(),
  };
}

export async function loadAdbnTechPurchasesReadOnly(): Promise<
  AdbnTechPurchasesReadOnlySnapshot
> {
  const { auth, db } = requireAdbnTechFirebase();
  const connectedEmail = normalizeEmail(auth.currentUser?.email);

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    throw new Error(
      'Connect ADBN TECH with ' + ADBN_TECH_ADMIN_EMAIL + ' first.',
    );
  }

  /*
   * Slice 24A is read-only. ADBN TECH supplierPartPurchases
   * remains the source of truth. Do not add write APIs here.
   */
  const purchaseSnapshot = await getDocs(
    collection(db, 'supplierPartPurchases'),
  );

  const purchases = purchaseSnapshot.docs
    .map((record) => {
      const data = record.data();
      const quantity = money(data.quantity);
      const unitPrice = money(data.unitPrice);
      const quantityReceived = money(data.quantityReceived);
      const totalCost = money(
        data.totalCost
        ?? data.total
        ?? data.amount
        ?? (quantity * unitPrice),
      );
      const amountPaid = money(data.amountPaid);

      return {
        id: record.id,
        purchaseNo: text(data.purchaseNo ?? data.poNo ?? data.referenceNo),
        purchaseDate: text(data.purchaseDate ?? data.orderDate ?? data.date),
        sellerName: text(data.sellerName ?? data.supplierName ?? data.vendorName),
        sellerType: text(data.sellerType ?? data.supplierType),
        brand: text(data.brand),
        model: text(data.model ?? data.partName ?? data.productName),
        category: text(data.category),
        condition: text(data.condition),
        quantity,
        unitPrice,
        totalCost,
        quantityReceived,
        quantityOutstanding: money(
          data.quantityOutstanding ?? Math.max(0, quantity - quantityReceived),
        ),
        orderStatus: text(data.orderStatus ?? data.status),
        receivedDate: text(data.receivedDate),
        deliveryReference: text(data.deliveryReference ?? data.deliveryRef),
        paymentStatus: text(data.paymentStatus),
        amountPaid,
        outstandingBalance: money(
          data.outstandingBalance ?? Math.max(0, totalCost - amountPaid),
        ),
        linkedProductId: text(data.linkedProductId),
        linkedBuildId: text(data.linkedBuildId),
        linkedBuildNo: text(data.linkedBuildNo),
        inventoryAdded: data.inventoryAdded === true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies AdbnTechPurchaseMirror;
    })
    .sort(
      (a, b) =>
        Math.max(timestampMillis(b.updatedAt), timestampMillis(b.createdAt))
        - Math.max(timestampMillis(a.updatedAt), timestampMillis(a.createdAt)),
    );

  return {
    purchases,
    connectedEmail,
    loadedAt: new Date().toISOString(),
  };
}
