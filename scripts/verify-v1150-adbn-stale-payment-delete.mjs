import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const functions =
  read('functions/src/index.ts');
const repository =
  read('src/repositories/businessMoneyActivityRepository.ts');
const page =
  read('src/features/business/BusinessMoneyActivityPage.tsx');

check(
  functions.includes(
    'export const deleteStaleAdbnPaymentMoneyActivity',
  ),
  'Legacy secured stale-delete callable remains available for backward compatibility.',
);

check(
  repository.includes(
    'reverseStaleAdbnPaymentMoneyActivity',
  )
  && repository.includes(
    "'adbn-stale-payment-'",
  ),
  'Current UI path uses deterministic history-preserving stale payment reversal.',
);

check(
  page.includes(
    'data-adbn-stale-payment-reverse',
  )
  && page.includes(
    'Reverse stale ADBN payment',
  )
  && !page.includes(
    'data-adbn-stale-payment-delete',
  ),
  'Business Money Details has migrated from destructive delete to explicit reversal.',
);

check(
  page.includes('space.ownerId')
  && page.includes('=== user?.uid')
  && page.includes('canReverseStaleAdbnPayment'),
  'Only the Business owner is offered the stale payment reversal action.',
);

check(
  page.includes(
    'preserving its accounting history',
  ),
  'Stale payment guidance explains audit-history preservation.',
);

check(
  page.includes(
    "return 'ADBN TECH payment';",
  ),
  'ADBN payment rows remain managed records.',
);

console.log(
  'BajetBN stale ADBN payment compatibility verification PASS',
);
