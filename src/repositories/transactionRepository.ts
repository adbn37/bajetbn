import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import {
  addOfflineTransactionCommand,
  listOfflineCommands,
  notifyOfflineSyncCompleted,
  removeOfflineCommand,
  updateOfflineCommand,
  type OfflineFinancialCommand,
  type OfflineTransactionPayload,
} from '../services/offlineQueue';
import type { CategoryScope, FinancialTransaction, PaymentMethodCode } from '../types/models';
import { getErrorMessage } from '../utils/errors';

export type TransactionInput = OfflineTransactionPayload;

export interface PostTransactionOutcome {
  mode: 'posted' | 'queued';
  transactionId?: string;
  queueId?: string;
}

export interface OfflineSyncSummary {
  posted: number;
  needsAttention: number;
  waiting: number;
}

interface FunctionErrorLike {
  code?: string;
  message?: string;
}

function idempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
}

function errorCode(error: unknown): string {
  return String((error as FunctionErrorLike | null)?.code || '').toLowerCase();
}

function isRetryableConnectionError(error: unknown): boolean {
  if (!navigator.onLine) return true;
  const code = errorCode(error);
  const message = String((error as FunctionErrorLike | null)?.message || '').toLowerCase();
  return code.includes('unavailable')
    || code.includes('network')
    || code.includes('deadline-exceeded')
    || message.includes('failed to fetch')
    || message.includes('network error');
}

async function invokePostTransaction(input: TransactionInput, key: string): Promise<{ transactionId?: string }> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'postTransaction');
  const result = await call({ ...input, idempotencyKey: key });
  return (result.data || {}) as { transactionId?: string };
}

export async function listTransactions(uid: string): Promise<FinancialTransaction[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'transactions'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as FinancialTransaction)
    .sort((a, b) => {
      const dateCompare = b.transactionDate.localeCompare(a.transactionDate);
      if (dateCompare !== 0) return dateCompare;
      return (b.postedAt?.toMillis() || 0) - (a.postedAt?.toMillis() || 0);
    });
}

export async function postTransaction(input: {
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
}): Promise<PostTransactionOutcome> {
  const { auth } = requireFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Your session has ended. Sign in again.');
  const key = idempotencyKey();

  if (!navigator.onLine) {
    const queued = await addOfflineTransactionCommand({ uid, idempotencyKey: key, payload: input });
    return { mode: 'queued', queueId: queued.id };
  }

  try {
    const result = await invokePostTransaction(input, key);
    return { mode: 'posted', transactionId: result.transactionId };
  } catch (error) {
    if (!isRetryableConnectionError(error)) throw error;
    const queued = await addOfflineTransactionCommand({ uid, idempotencyKey: key, payload: input });
    return { mode: 'queued', queueId: queued.id };
  }
}

async function syncOne(command: OfflineFinancialCommand): Promise<'posted' | 'waiting' | 'needs_attention'> {
  const attempts = command.attempts + 1;
  const attemptedAt = new Date().toISOString();
  await updateOfflineCommand(command.id, {
    status: 'syncing',
    attempts,
    lastAttemptAt: attemptedAt,
    lastError: null,
  });

  try {
    await invokePostTransaction(command.payload, command.idempotencyKey);
    await removeOfflineCommand(command.id);
    return 'posted';
  } catch (error) {
    if (isRetryableConnectionError(error)) {
      await updateOfflineCommand(command.id, {
        status: 'pending',
        attempts,
        lastAttemptAt: attemptedAt,
        lastError: getErrorMessage(error),
      });
      return 'waiting';
    }

    await updateOfflineCommand(command.id, {
      status: 'needs_attention',
      attempts,
      lastAttemptAt: attemptedAt,
      lastError: getErrorMessage(error),
    });
    return 'needs_attention';
  }
}

export async function syncQueuedTransactions(uid: string): Promise<OfflineSyncSummary> {
  const summary: OfflineSyncSummary = { posted: 0, needsAttention: 0, waiting: 0 };
  if (!navigator.onLine) {
    summary.waiting = (await listOfflineCommands(uid)).filter((item) => item.status !== 'needs_attention').length;
    return summary;
  }

  const commands = (await listOfflineCommands(uid)).filter((item) => item.status !== 'needs_attention');
  for (const command of commands) {
    if (!navigator.onLine) {
      summary.waiting += 1;
      continue;
    }
    const result = await syncOne(command);
    if (result === 'posted') summary.posted += 1;
    if (result === 'needs_attention') summary.needsAttention += 1;
    if (result === 'waiting') {
      summary.waiting += 1;
      break;
    }
  }

  if (summary.posted > 0) notifyOfflineSyncCompleted();
  return summary;
}

export async function reverseTransaction(transactionId: string, transactionDate: string, reason?: string) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'reverseTransaction');
  return call({ transactionId, transactionDate, reason, idempotencyKey: idempotencyKey() });
}
