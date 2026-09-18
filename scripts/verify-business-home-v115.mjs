import fs from 'node:fs';

const app =
  fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  );

const shell =
  fs.readFileSync(
    'src/layouts/AppShell.tsx',
    'utf8',
  );

const page =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [app, 'business/:spaceId', 'dedicated Business Home route'],
  [page, 'data-business-home-v115', 'Business Home page marker'],
  [page, 'listAccountsForSpace', 'Business accounts only'],
  [page, 'listBusinessTransactionsForSpace', 'Business transaction scope'],
  [page, 'Business funds', 'Business funds hero'],
  [page, '<AccountAvatar', 'shared Business account icons'],
  [page, '<SpaceAvatar', 'Business Space avatar'],
  [
    shell,
    'smeSpaces[0].id',
    'single business destination uses selected Business ID',
  ],
  [
    shell,
    '/business/',
    'Business shortcut routes to dedicated Business Home',
  ],
  [
    shell,
    'space.id',
    'Business picker uses selected Business ID',
  ],
  [shell, "location.pathname.startsWith('/business/')", 'Business nav active state'],
  [shell, '<SpaceAvatar', 'picker uses Business Space avatar'],
  [css, 'BAJETBN V115 DEDICATED BUSINESS HOME', 'Business Home CSS'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log('Dedicated Business Home verifier: PASS');
