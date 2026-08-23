import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const nav =
  read('src/services/personalisation.ts');

const shell =
  read('src/layouts/AppShell.tsx');

const customizer =
  read('src/components/SidebarCustomizer.tsx');

const entitlements =
  read('src/services/entitlements.ts');

const upgrade =
  read('src/components/UpgradeToPlusNotice.tsx');

const subscription =
  read('src/pages/SubscriptionPage.tsx');

const pkg =
  JSON.parse(read('package.json'));

const release =
  JSON.parse(read('release.json'));

const checks = [
  [nav, "'overview'", 'Overview navigation'],
  [nav, "'spaces'", 'Spaces navigation'],
  [nav, "'inbox'", 'Needs Attention navigation'],
  [nav, "'transactions'", 'Money activity navigation'],
  [nav, "'accounts'", 'Accounts navigation'],
  [nav, "'debt'", 'Debt navigation'],

  [nav, "RECOMMENDED_HIDDEN_NAVIGATION", 'simple hidden defaults'],
  [nav, "'budgets'", 'Budgets remain available'],
  [nav, "'bills'", 'Bills remain available'],
  [nav, "'goals'", 'Goals remain available'],
  [nav, "'calendar'", 'Calendar remains available'],
  [nav, "'reports'", 'Reports remain available'],

  [nav, 'secondaryNavigation(', 'secondary navigation helper'],

  [shell, 'More tools', 'More tools menu'],
  [shell, 'secondaryTools.map', 'secondary menu rendering'],
  [shell, 'setMoreToolsOpen(true)', 'mobile More opens secondary tools'],
  [shell, 'BajetBN {currentPlanLabel}', 'sidebar plan status'],
  [shell, 'to="/settings/subscription"', 'subscription sidebar route'],

  [customizer, 'Available under More tools', 'customizer explains hidden tools'],
  [customizer, 'Overview and Spaces always stay available', 'protected essentials'],

  [entitlements, 'upgradeToPlusCopy(', 'central upgrade copy'],
  [entitlements, 'planLabel(', 'central plan label'],

  [upgrade, 'UpgradeToPlusNotice', 'reusable Plus upgrade notice'],
  [upgrade, 'navigate(copy.path)', 'upgrade action routing'],

  [subscription, 'Basic stays free forever', 'Basic plan copy'],
  [subscription, 'Existing Plus information stays safe', 'data preservation copy'],
  [subscription, 'Your existing data is never', 'Plus expiry preservation copy'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) failed += 1;
}

if (pkg.version !== '1.8.0') {
  console.log('FAIL package version intentionally remains 1.8.0');
  failed += 1;
} else {
  console.log('PASS package version intentionally remains 1.8.0');
}

if (release.version !== '1.8.0') {
  console.log('FAIL release metadata intentionally remains 1.8.0');
  failed += 1;
} else {
  console.log('PASS release metadata intentionally remains 1.8.0');
}

if (failed) {
  console.error(
    `Slice 8 verifier failed: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'Slice 8 navigation + entitlement verifier: PASS',
);
