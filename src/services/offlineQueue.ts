import type { CategoryScope, PaymentMethodCode } from '../types/models';

export type OfflineCommandStatus = 'pending' | 'syncing' | 'needs_attention';

export interface OfflineTransactionPayload {
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  destinationAccountId?: string;
  spaceId: string;
  amountMinor: number;
  currency?: string;
  transactionDate: string;
  categoryId?: string;
  category?: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryScope?: CategoryScope;
  counterparty?: string;
  note?: string;
  paymentMethod?: PaymentMethodCode;
  paymentMethodLabel?: string;
}

export interface OfflineFinancialCommand {
  id: string;
  uid: string;
  kind: 'post_transaction';
  idempotencyKey: string;
  payload: OfflineTransactionPayload;
  status: OfflineCommandStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string | null;
  lastError?: string | null;
}

const projectNamespace = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_APP_ENV || 'local';
const DB_NAME = `bajetbn-${projectNamespace}-offline-sync`;
const DB_VERSION = 1;
const STORE_NAME = 'commands';
const QUEUE_CHANGED_EVENT = 'bajetbn:offline-queue-changed';
const SYNC_COMPLETED_EVENT = 'bajetbn:offline-sync-completed';
const MAX_QUEUE_ITEMS = 100;

function notifyQueueChanged() {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function notifyOfflineSyncCompleted() {
  window.dispatchEvent(new CustomEvent(SYNC_COMPLETED_EVENT));
}

export function onOfflineQueueChanged(listener: () => void) {
  window.addEventListener(QUEUE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, listener);
}

export function onOfflineSyncCompleted(listener: () => void) {
  window.addEventListener(SYNC_COMPLETED_EVENT, listener);
  return () => window.removeEventListener(SYNC_COMPLETED_EVENT, listener);
}

export function offlineQueueSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('The offline queue could not be opened.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('The offline queue could not be updated.'));
    transaction.onabort = () => reject(transaction.error || new Error('The offline queue update was cancelled.'));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!offlineQueueSupported()) return Promise.reject(new Error('Offline saving is not supported on this browser.'));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('uid', 'uid', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error('The offline queue could not be opened.'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Close other BajetBN tabs and try again.'));
    };
  });

  return databasePromise;
}

async function allCommands(): Promise<OfflineFinancialCommand[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).getAll();
  const result = await requestResult(request) as OfflineFinancialCommand[];
  await transactionDone(transaction);
  return result;
}

export async function listOfflineCommands(uid: string): Promise<OfflineFinancialCommand[]> {
  return (await allCommands())
    .filter((item) => item.uid === uid)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addOfflineTransactionCommand(input: {
  uid: string;
  idempotencyKey: string;
  payload: OfflineTransactionPayload;
}): Promise<OfflineFinancialCommand> {
  const existing = await listOfflineCommands(input.uid);
  if (existing.length >= MAX_QUEUE_ITEMS) {
    throw new Error('This device already has 100 money entries waiting. Connect to the internet and sync them first.');
  }

  const now = new Date().toISOString();
  const command: OfflineFinancialCommand = {
    id: input.idempotencyKey,
    uid: input.uid,
    kind: 'post_transaction',
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    lastAttemptAt: null,
    lastError: null,
  };

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(command);
  await transactionDone(transaction);
  notifyQueueChanged();
  return command;
}

export async function updateOfflineCommand(
  id: string,
  updates: Partial<Pick<OfflineFinancialCommand, 'status' | 'attempts' | 'lastAttemptAt' | 'lastError'>>,
): Promise<OfflineFinancialCommand | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const existing = await requestResult(store.get(id)) as OfflineFinancialCommand | undefined;
  if (!existing) {
    await transactionDone(transaction);
    return null;
  }
  const next: OfflineFinancialCommand = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  store.put(next);
  await transactionDone(transaction);
  notifyQueueChanged();
  return next;
}

export async function removeOfflineCommand(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
  notifyQueueChanged();
}

export async function resetOfflineCommand(id: string): Promise<void> {
  await updateOfflineCommand(id, { status: 'pending', lastError: null });
}

export async function clearOfflineCommandsForUser(uid: string): Promise<void> {
  const commands = await listOfflineCommands(uid);
  if (!commands.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  commands.forEach((item) => store.delete(item.id));
  await transactionDone(transaction);
  notifyQueueChanged();
}
