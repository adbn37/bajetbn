import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const settings =
  fs.readFileSync(
    'src/features/sme-pos/SmePosSettingsPage.tsx',
    'utf8',
  );

const app =
  fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [home, "| 'setup';", 'Business Setup workspace type exists'],
  [home, "value === 'setup'", 'Business Setup query parser exists'],
  [home, "workspaceView === 'setup'", 'Business Setup workspace renders'],
  [home, 'Business Setup', 'Business Setup top-level navigation exists'],
  [home, 'Staff & Roles', 'Staff & Roles setup entry exists'],
  [home, 'Business Profile', 'Business Profile setup entry exists'],
  [home, 'POS Settings', 'POS Settings setup entry exists'],
  [home, 'Workflow', 'Workflow setup entry exists'],
  [home, 'Staff Guide', 'Staff Guide setup entry exists'],
  [home, "&& isOwner", 'Business Setup remains owner-only'],
  [home, '/pos/settings', 'Setup reuses secure POS settings route'],
  [home, '/business/setup', 'Setup reuses Business Profile route'],
  [home, '/business/guide', 'Setup reuses Staff Guide route'],
  [settings, 'Only the Business Space owner can change shop settings and staff POS roles.', 'Existing owner-only POS security wording remains'],
  [settings, 'Custom business role', 'Existing custom role manager remains'],
  [app, 'spaces/:spaceId/business/setup', 'Existing Business Profile route remains'],
  [app, 'spaces/:spaceId/business/guide', 'Existing Staff Guide route remains'],
  [app, 'spaces/:spaceId/pos/settings', 'Existing POS Settings route remains'],
  [css, 'BAJETBN V115 BUSINESS SETUP WORKSPACE', 'Business Setup styles exist'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log(
    (ok ? 'PASS ' : 'FAIL ')
      + label,
  );
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Business Setup workspace verifier: PASS',
);
