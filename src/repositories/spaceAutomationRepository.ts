import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  BackgroundReminderCheckResult,
  SpaceAutomationPreference,
  SpaceAutomationPreferenceMap,
} from '../types/models';

const MAX_MINOR = 99_999_999_999;

function clampInteger(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function validDate(value: unknown): string | null {
  const next = typeof value === 'string' ? value.trim() : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null;
}

export function defaultSpaceAutomationPreference(): SpaceAutomationPreference {
  return {
    enabled: false,
    contributionReminder: false,
    contributionDueDate: null,
    budgetThresholdAlert: true,
    budgetThresholdPercent: 80,
    lowFundAlert: false,
    lowFundThresholdMinor: 0,
    overdueBillAlert: true,
    overdueTaskAlert: true,
    lowStockAlert: true,
    lowStockThreshold: 0,
    sellerPayoutAlert: false,
    sellerPayoutThresholdMinor: 0,
  };
}

export function normalizeSpaceAutomationPreference(
  value: unknown,
): SpaceAutomationPreference {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Partial<SpaceAutomationPreference>
      : {};

  const defaults = defaultSpaceAutomationPreference();

  return {
    enabled: source.enabled === true,
    contributionReminder: source.contributionReminder === true,
    contributionDueDate: validDate(source.contributionDueDate),
    budgetThresholdAlert:
      source.budgetThresholdAlert == null
        ? defaults.budgetThresholdAlert
        : source.budgetThresholdAlert === true,
    budgetThresholdPercent: clampInteger(
      source.budgetThresholdPercent ?? defaults.budgetThresholdPercent,
      50,
      100,
    ),
    lowFundAlert: source.lowFundAlert === true,
    lowFundThresholdMinor: clampInteger(
      source.lowFundThresholdMinor,
      0,
      MAX_MINOR,
    ),
    overdueBillAlert:
      source.overdueBillAlert == null
        ? defaults.overdueBillAlert
        : source.overdueBillAlert === true,
    overdueTaskAlert:
      source.overdueTaskAlert == null
        ? defaults.overdueTaskAlert
        : source.overdueTaskAlert === true,
    lowStockAlert:
      source.lowStockAlert == null
        ? defaults.lowStockAlert
        : source.lowStockAlert === true,
    lowStockThreshold: clampInteger(
      source.lowStockThreshold,
      0,
      1_000_000,
    ),
    sellerPayoutAlert: source.sellerPayoutAlert === true,
    sellerPayoutThresholdMinor: clampInteger(
      source.sellerPayoutThresholdMinor,
      0,
      MAX_MINOR,
    ),
  };
}

export async function getSpaceAutomationPreference(
  uid: string,
  spaceId: string,
): Promise<SpaceAutomationPreference> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'users', uid));
  const map = snapshot.data()?.spaceAutomationV1 as
    | SpaceAutomationPreferenceMap
    | undefined;

  return normalizeSpaceAutomationPreference(map?.[spaceId]);
}

export async function saveSpaceAutomationPreference(
  uid: string,
  spaceId: string,
  preference: SpaceAutomationPreference,
) {
  if (!uid.trim() || !spaceId.trim()) {
    throw new Error('User and Space are required.');
  }

  const { db } = requireFirebase();
  const userRef = doc(db, 'users', uid);
  const clean = normalizeSpaceAutomationPreference(preference);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);

    if (!snapshot.exists()) {
      throw new Error('Your BajetBN profile was not found.');
    }

    const current = snapshot.data().spaceAutomationV1;
    const map: SpaceAutomationPreferenceMap =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as SpaceAutomationPreferenceMap) }
        : {};

    map[spaceId] = clean;

    transaction.update(userRef, {
      spaceAutomationV1: map,
      updatedAt: serverTimestamp(),
    });
  });

  return clean;
}

export async function runMySpaceAutomationCheck(): Promise<BackgroundReminderCheckResult> {
  const { functions } = requireFirebase();
  const call = httpsCallable<
    Record<string, never>,
    BackgroundReminderCheckResult
  >(functions, 'runMyBackgroundReminderCheck');

  const result = await call({});
  return result.data;
}
