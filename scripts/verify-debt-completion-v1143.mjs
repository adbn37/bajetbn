import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const page =
  read('src/features/debt/DebtPage.tsx');

const repo =
  read('src/repositories/debtRepository.ts');

const functions =
  read('functions/src/index.ts');

const packageJson =
  read('package.json');

const release =
  read('release.json');

const failures = [];

function check(value, message) {
  if (value) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

check(
  page.includes('listPersonalAccounts')
    && page.includes('listPersonalAccounts(user.uid)')
    && !page.includes('listAccounts(user.uid)'),
  'Debt payments load Personal accounts only.',
);

check(
  page.includes("setStatusFilter('active')")
    && page.includes("setStatusFilter('settled')")
    && page.includes("setStatusFilter('archived')"),
  'Debt has Active, Settled and Archived views.',
);

check(
  page.includes("'Restore'")
    && page.includes('runRestore(item)'),
  'Archived Debt can be restored from the UI.',
);

check(
  repo.includes('export async function restoreDebt')
    && repo.includes("'restoreDebt'"),
  'Debt repository exposes restoreDebt.',
);

check(
  functions.includes('export const restoreDebt = onCall')
    && functions.includes("Only archived debt can be restored.")
    && functions.includes("balanceMinor === 0"),
  'Debt restore backend preserves active or settled lifecycle state.',
);

check(
  functions.includes("Debt payments must use a Personal account.")
    && functions.includes("accountSnapshot.data()?.classification"),
  'Debt payment backend rejects Business accounts.',
);

check(
  packageJson.includes('"version": "1.14.3"')
    && release.includes('"version":  "1.14.3"')
    && release.includes('"label":  "BajetBN v1.14.3"'),
  'v1.14.3 release metadata is consistent.',
);

check(
  packageJson.includes('verify:debt-completion-v1143')
    && packageJson.includes(
      'npm run verify:debt-completion-v1143',
    ),
  'Debt completion verifier is part of the structural suite.',
);

if (failures.length) {
  console.error('');

  failures.forEach(
    (failure) =>
      console.error('- ' + failure),
  );

  throw new Error(
    'Debt completion v1.14.3 verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'BAJETBN v1.14.3 DEBT COMPLETION SLICE A: PASS',
);