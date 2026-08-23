import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';

export type AdminEffectivePlan =
  | 'basic'
  | 'plus';

export interface AdminSubscriptionUser {
  uid: string;
  fullName: string;
  email: string;
  platformRole:
    | 'user'
    | 'platform_admin';
  effectivePlan:
    AdminEffectivePlan;
  subscriptionPlan:
    AdminEffectivePlan;
  subscriptionStatus: string;
  subscriptionSource:
    | string
    | null;
  subscriptionStartedAt:
    | string
    | null;
  subscriptionExpiresAt:
    | string
    | null;
  createdAt:
    | string
    | null;
}

export interface AdminSubscriptionAudit {
  id: string;
  targetUid: string;
  targetEmail: string;
  action: string;
  previousPlan: string;
  previousStatus: string;
  nextPlan: string;
  nextStatus: string;
  source: string;
  createdAt: string | null;
}

export interface AdminSubscriptionUpdateInput {
  uid: string;
  action:
    | 'activate'
    | 'extend'
    | 'cancel';
  months?: 1 | 3 | 6 | 12;
  customExpiresAt?: string;
  source?:
    | 'whatsapp_manual'
    | 'complimentary'
    | 'internal';
}

export async function listAdminSubscriptions():
Promise<AdminSubscriptionUser[]> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    void,
    { users: AdminSubscriptionUser[] }
  >(
    functions,
    'adminListSubscriptions',
  );

  const result = await callable();

  return result.data.users;
}

export async function updateAdminSubscription(
  input: AdminSubscriptionUpdateInput,
): Promise<void> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    AdminSubscriptionUpdateInput,
    unknown
  >(
    functions,
    'adminUpdateSubscription',
  );

  await callable(input);
}

export async function listAdminSubscriptionAudit():
Promise<AdminSubscriptionAudit[]> {
  const { functions } = requireFirebase();

  const callable = httpsCallable<
    void,
    { entries: AdminSubscriptionAudit[] }
  >(
    functions,
    'adminListSubscriptionAudit',
  );

  const result = await callable();

  return result.data.entries;
}
