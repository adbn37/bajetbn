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
