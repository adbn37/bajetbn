import fs from 'node:fs';

const models =
  fs.readFileSync(
    'src/types/models.ts',
    'utf8',
  );

const repository =
  fs.readFileSync(
    'src/repositories/smePosRepository.ts',
    'utf8',
  );

const settings =
  fs.readFileSync(
    'src/features/sme-pos/SmePosSettingsPage.tsx',
    'utf8',
  );

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const functions =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [models, 'customRoleName?: string | null;', 'Access model stores custom role name'],
  [repository, 'customRoleName?: string | null;', 'Repository accepts custom role name'],
  [settings, 'Custom role…', 'Owner can choose Custom role'],
  [settings, 'Custom business role', 'Custom role editor exists'],
  [settings, 'Access template', 'Custom role chooses secure template'],
  [settings, 'The template controls the real permissions.', 'UI explains enforcement'],
  [settings, 'customRoleName: name', 'Custom role name is saved'],
  [home, 'nextAccess.customRoleName', 'Business Home loads custom role name'],
  [home, "customRoleName + ' workspace'", 'Business Home displays custom workspace'],
  [functions, 'request.data?.customRoleName', 'Backend validates custom role name'],
  [functions, 'customRoleName:', 'Backend persists custom role name'],
  [functions, "oneOf(request.data?.role, smePosRoles, 'POS role')", 'Server still enforces standard role template'],
  [css, 'BAJETBN V115 CUSTOM BUSINESS ROLES', 'Custom role styles exist'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Custom Business role verifier: PASS',
);
