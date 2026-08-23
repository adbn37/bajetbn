import type {
  BajetBnPlan,
  SpaceType,
  UserProfile,
} from '../types/models';

export interface BasicPlanLimits {
  householdSpaces: number;
  tripSpaces: number;
  smeSpaces: number;
  personalAccounts: number;
  smeInventoryItems: number;
  smeCustomers: number;
  smeSellers: number;
  smeAdditionalMembers: number;
}

export const BASIC_PLAN_LIMITS: BasicPlanLimits = {
  householdSpaces: 1,
  tripSpaces: 1,
  smeSpaces: 1,
  personalAccounts: 2,
  smeInventoryItems: 20,
  smeCustomers: 10,
  smeSellers: 3,
  smeAdditionalMembers: 1,
};

export interface EntitlementSnapshot {
  plan: BajetBnPlan;
  plusActive: boolean;
  expired: boolean;
  platformAdmin: boolean;
  limits: BasicPlanLimits | null;
}

function expiryMillis(
  profile: UserProfile | null,
): number | null {
  const expiry = profile?.subscriptionExpiresAt;
  return expiry ? expiry.toMillis() : null;
}

export function isPlatformAdmin(
  profile: UserProfile | null,
): boolean {
  return profile?.platformRole === 'platform_admin';
}

export function isPlusActive(
  profile: UserProfile | null,
  now = Date.now(),
): boolean {
  if (
    profile?.subscriptionPlan !== 'plus'
    || profile.subscriptionStatus !== 'active'
  ) {
    return false;
  }

  const expiry = expiryMillis(profile);

  return expiry == null || expiry > now;
}

export function getEffectivePlan(
  profile: UserProfile | null,
): BajetBnPlan {
  return isPlusActive(profile) ? 'plus' : 'basic';
}

export function getEntitlements(
  profile: UserProfile | null,
): EntitlementSnapshot {
  const plusActive = isPlusActive(profile);
  const expiry = expiryMillis(profile);

  return {
    plan: plusActive ? 'plus' : 'basic',
    plusActive,
    expired: Boolean(
      profile?.subscriptionPlan === 'plus'
      && expiry != null
      && expiry <= Date.now()
    ),
    platformAdmin: isPlatformAdmin(profile),
    limits: plusActive ? null : BASIC_PLAN_LIMITS,
  };
}

export function basicSpaceLimit(
  type: SpaceType,
): number | null {
  switch (type) {
    case 'personal':
      return null;
    case 'household':
      return BASIC_PLAN_LIMITS.householdSpaces;
    case 'trip':
      return BASIC_PLAN_LIMITS.tripSpaces;
    case 'sme':
      return BASIC_PLAN_LIMITS.smeSpaces;
    default:
      return 0;
  }
}

export function requiresPlusForSpaceType(
  type: SpaceType,
): boolean {
  return basicSpaceLimit(type) === 0;
}

export interface UpgradeToPlusCopy {
  title: string;
  message: string;
  actionLabel: string;
  path: string;
}

export function upgradeToPlusCopy(
  featureLabel: string,
  detail?: string,
): UpgradeToPlusCopy {
  const feature =
    featureLabel.trim() || 'This feature';

  return {
    title: 'Upgrade to BajetBN Plus',
    message:
      detail?.trim()
      || `${feature} has reached the BajetBN Basic limit. Your existing information stays safe. Upgrade to Plus to keep adding and unlock the full experience.`,
    actionLabel: 'View Plus',
    path: '/settings/subscription',
  };
}

export function planLabel(
  profile: UserProfile | null,
): 'Basic' | 'Plus' {
  return isPlusActive(profile)
    ? 'Plus'
    : 'Basic';
}
