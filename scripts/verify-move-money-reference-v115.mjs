import fs from 'node:fs';

const tx =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    tx,
    'bajetbn-move-reference-form',
    'reference Move Money form',
  ],
  [
    tx,
    'account={sourceAccount}',
    'source AccountAvatar',
  ],
  [
    tx,
    'account={destinationAccount}',
    'destination AccountAvatar',
  ],
  [
    tx,
    'destinationAccountSubtitle',
    'destination account metadata',
  ],
  [
    tx,
    'Between my accounts',
    'transfer type explanation',
  ],
  [
    tx,
    'bajetbn-move-date',
    'reference Date row',
  ],
  [
    tx,
    "'Moving money…'",
    'moving state label preserved',
  ],
  [
    tx,
    "'Move money'",
    'transfer action label preserved',
  ],
  [
    css,
    'BAJETBN V115 MOVE MONEY REFERENCE',
    'Move Money CSS marker',
  ],
];

let failed = 0;

for (
  const [text, marker, label]
  of checks
) {
  const ok =
    text.includes(marker);

  console.log(
    (ok ? 'PASS ' : 'FAIL ')
    + label,
  );

  if (!ok) {
    failed += 1;
  }
}

if (
  tx.includes(
    '<label>\n          From account\n          <select',
  )
) {
  console.error(
    'FAIL legacy plain From account select remains.',
  );
  failed += 1;
}

if (failed) {
  process.exit(1);
}

console.log(
  'Move Money reference verifier: PASS',
);
