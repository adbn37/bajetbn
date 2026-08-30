import fs from 'node:fs';

const checks = [
  [
    'functions/src/index.ts',
    "'zardeerwandy@gmail.com'",
  ],
  [
    'functions/src/index.ts',
    "subscriptionPlan: 'basic'",
  ],
  [
    'functions/src/index.ts',
    "platformRole: 'user'",
  ],
  [
    'functions/src/index.ts',
    'export const ensureMyPlatformAdmin',
  ],
  [
    'functions/src/index.ts',
    'export const adminListSubscriptions',
  ],
  [
    'functions/src/index.ts',
    'export const adminUpdateSubscription',
  ],
  [
    'functions/src/index.ts',
    'export const adminListSubscriptionAudit',
  ],
  [
    'functions/src/index.ts',
    'export const processSubscriptionExpiries',
  ],
  [
    'functions/src/index.ts',
    'platformAdmin: true',
  ],
  [
    'firestore.rules',
    'match /subscriptionAudit/{auditId}',
  ],
  [
    'src/contexts/AuthContext.tsx',
    'ensureMyPlatformAdmin',
  ],
  [
    'src/contexts/AuthContext.tsx',
    'platformRole',
  ],
  [
    'src/contexts/AuthContext.tsx',
    'subscriptionPlan',
  ],
  [
    'src/repositories/adminSubscriptionRepository.ts',
    'adminUpdateSubscription',
  ],
  [
    'src/pages/AdminPortalPage.tsx',
    'Activate {months === 12',
  ],
  [
    'src/pages/AdminPortalPage.tsx',
    'Complimentary 1 month',
  ],
  [
    'src/pages/AdminPortalPage.tsx',
    'Confirm cancellation',
  ],
  [
    'src/pages/AdminPortalPage.tsx',
    'Recent subscription changes',
  ],
];

let failures = 0;

for (const [path, marker] of checks) {
  if (!fs.existsSync(path)) {
    console.error(`FAIL missing ${path}`);
    failures += 1;
    continue;
  }

  const text =
    fs.readFileSync(path, 'utf8');

  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${path}: ${marker}`,
  );

  if (!ok) failures += 1;
}

for (const path of [
  'src/pages/AdminPortalPage.tsx',
  'src/contexts/AuthContext.tsx',
]) {
  const text =
    fs.readFileSync(path, 'utf8');

  for (const marker of [
    'window.alert(',
    'window.confirm(',
  ]) {
    if (text.includes(marker)) {
      console.error(
        `FAIL native dialog in ${path}`,
      );
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(
    `Subscription backend verifier failed: ${failures}`,
  );
  process.exit(1);
}

console.log(
  'Subscription backend verifier: PASS',
);
