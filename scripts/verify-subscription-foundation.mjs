import fs from 'node:fs';

const checks = [
  ['src/types/models.ts', "export type BajetBnPlan = 'basic' | 'plus';"],
  ['src/types/models.ts', 'platformRole?: PlatformRole;'],
  ['src/types/models.ts', 'subscriptionPlan?: BajetBnPlan;'],
  ['src/types/models.ts', 'subscriptionExpiresAt?: Timestamp | null;'],
  ['src/services/entitlements.ts', 'householdSpaces: 1'],
  ['src/services/entitlements.ts', 'tripSpaces: 1'],
  ['src/services/entitlements.ts', 'smeSpaces: 1'],
  ['src/services/entitlements.ts', 'smeInventoryItems: 20'],
  ['src/pages/SubscriptionPage.tsx', 'Subscribe via WhatsApp'],
  ['src/pages/AdminPortalPage.tsx', 'BajetBN Platform Admin'],
  ['src/app/RouteGuards.tsx', 'PlatformAdminRoute'],
  ['src/app/App.tsx', 'path="subscription"'],
  ['src/app/App.tsx', 'path="admin"'],
];

let failed = false;

for (const [path, marker] of checks) {
  const ok =
    fs.existsSync(path)
    && fs.readFileSync(path, 'utf8').includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${path}: ${marker}`,
  );

  if (!ok) failed = true;
}

if (failed) process.exit(1);

console.log('Subscription foundation verifier: PASS');
