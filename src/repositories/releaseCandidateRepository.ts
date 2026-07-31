import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { Account, LedgerEntry } from '../types/models';

interface ExportRow extends DocumentData {
  id: string;
}

export interface AccountCheckRow {
  accountId: string;
  accountName: string;
  shownMinor: number;
  recordedMinor: number;
  differenceMinor: number;
  matches: boolean;
}

export interface DataHealthResult {
  checkedAt: string;
  accountsChecked: number;
  recordsChecked: number;
  allGood: boolean;
  accounts: AccountCheckRow[];
}

function jsonSafe(value: unknown): unknown {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === 'object') {
    const dateValue = value as { toDate?: () => Date };
    if (typeof dateValue.toDate === 'function') return dateValue.toDate().toISOString();
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return String(value);
}

async function rowsWhere(collectionName: string, field: string, value: string): Promise<ExportRow[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function rowsForValues(collectionName: string, field: string, values: string[]): Promise<ExportRow[]> {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  const rows: ExportRow[] = [];

  // Use one equality query per account or Space. This matches the current
  // Firestore security rules and avoids collection queries that the rules
  // cannot safely approve.
  for (const value of uniqueValues) {
    const result = await rowsWhere(collectionName, field, value);
    rows.push(...result);
  }

  return Array.from(new Map(rows.map((item) => [item.id, item])).values());
}

async function memberSpaces(memberships: ExportRow[]): Promise<ExportRow[]> {
  const { db } = requireFirebase();
  const ids = Array.from(new Set(memberships
    .filter((item) => !item.status || item.status === 'active')
    .map((item) => item.spaceId)
    .filter((value): value is string => typeof value === 'string')));
  const spaces: ExportRow[] = [];
  for (let index = 0; index < ids.length; index += 10) {
    const chunk = ids.slice(index, index + 10);
    if (!chunk.length) continue;
    const snapshot = await getDocs(query(collection(db, 'spaces'), where(documentId(), 'in', chunk)));
    snapshot.forEach((item) => spaces.push({ id: item.id, ...item.data() }));
  }
  return spaces;
}

async function ownedAccountsAndRecords(uid: string) {
  const accounts = await rowsWhere('accounts', 'ownerId', uid);
  const accountIds = accounts.map((item) => item.id);
  const accountRecords = await rowsForValues('ledgerEntries', 'accountId', accountIds);
  return { accounts, accountRecords };
}

export async function buildUserDataExport(uid: string) {
  const { db } = requireFirebase();
  const profileSnapshot = await getDoc(doc(db, 'users', uid));

  const memberships = await rowsWhere('spaceMembers', 'uid', uid);
  const spaces = await memberSpaces(memberships);
  const activeSpaceIds = memberships
    .filter((item) => !item.status || item.status === 'active')
    .map((item) => item.spaceId)
    .filter((value): value is string => typeof value === 'string');

  const { accounts, accountRecords } = await ownedAccountsAndRecords(uid);

  const [
    accountAccess,
    categories,
    transactions,
    budgets,
    goals,
    goalContributions,
    commitments,
    commitmentPayments,
    allSharedBillAssignments,
    allSharedBillPayments,
    reminderHistory,
    notifications,
  ] = await Promise.all([
    rowsWhere('accountAccess', 'uid', uid),
    rowsWhere('categories', 'ownerId', uid),
    rowsWhere('transactions', 'ownerId', uid),
    rowsWhere('budgets', 'ownerId', uid),
    rowsWhere('goals', 'ownerId', uid),
    rowsWhere('goalContributions', 'ownerId', uid),
    rowsWhere('commitments', 'ownerId', uid),
    rowsWhere('commitmentPayments', 'ownerId', uid),
    rowsForValues('sharedBillAssignments', 'spaceId', activeSpaceIds),
    rowsForValues('sharedBillPayments', 'spaceId', activeSpaceIds),
    rowsWhere('reminderHistory', 'uid', uid),
    rowsWhere('userNotifications', 'uid', uid),
  ]);

  const sharedBillAssignments = allSharedBillAssignments.filter((item) => item.memberUid === uid);
  const sharedBillPayments = allSharedBillPayments.filter((item) => item.memberUid === uid);

  const data = {
    exportInformation: {
      exportedAt: new Date().toISOString(),
      environment: import.meta.env.VITE_APP_ENV || 'local',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      formatVersion: 2,
    },
    profile: profileSnapshot.exists() ? { id: profileSnapshot.id, ...profileSnapshot.data() } : null,
    spaces,
    memberships,
    accounts,
    accountAccess,
    accountRecords,
    categories,
    moneyActivity: transactions,
    budgets,
    goals,
    goalProgress: goalContributions,
    billsAndInstalments: commitments,
    billPayments: commitmentPayments,
    sharedBillShares: sharedBillAssignments,
    sharedPayments: sharedBillPayments,
    reminders: reminderHistory,
    notifications,
  };

  return jsonSafe(data);
}

export function downloadJsonFile(data: unknown, filename: string): string {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);

  // Keep the object URL alive after the click. Some browsers ignore a download
  // when the link is removed or the URL is revoked immediately.
  window.setTimeout(() => link.click(), 0);
  window.setTimeout(() => link.remove(), 1000);
  return url;
}

export function releaseDownloadUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export async function checkAccountRecords(uid: string): Promise<DataHealthResult> {
  const { accounts: accountRows, accountRecords: recordRows } = await ownedAccountsAndRecords(uid);

  const accounts = accountRows as unknown as Account[];
  const records = recordRows as unknown as LedgerEntry[];
  const totalByAccount = new Map<string, number>();

  for (const record of records) {
    if (record.status !== 'posted' || !Number.isSafeInteger(record.amountMinor)) continue;
    totalByAccount.set(record.accountId, (totalByAccount.get(record.accountId) || 0) + record.amountMinor);
  }

  const results = accounts.map<AccountCheckRow>((account) => {
    const recordedMinor = totalByAccount.get(account.id) || 0;
    const shownMinor = Number.isSafeInteger(account.ledgerBalanceMinor) ? account.ledgerBalanceMinor : 0;
    const differenceMinor = shownMinor - recordedMinor;
    return {
      accountId: account.id,
      accountName: account.name,
      shownMinor,
      recordedMinor,
      differenceMinor,
      matches: differenceMinor === 0,
    };
  }).sort((a, b) => a.accountName.localeCompare(b.accountName));

  return {
    checkedAt: new Date().toISOString(),
    accountsChecked: results.length,
    recordsChecked: records.length,
    allGood: results.every((item) => item.matches),
    accounts: results,
  };
}
