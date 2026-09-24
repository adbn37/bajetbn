import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const business =
  read('src/features/business/BusinessHomePage.tsx');
const space =
  read('src/features/spaces/SpaceDetailsPage.tsx');
const transactions =
  read('src/features/transactions/TransactionsPage.tsx');
const pkg =
  read('package.json');

check(
  business.includes('data-space-home-add-shortcut')
  && business.includes("'/business/money?quick=1'"),
  'Business Home has a + Add Money Activity shortcut.',
);

check(
  space.includes('data-space-home-add-shortcut')
  && space.includes("'/transactions?quick=1&spaceId='"),
  'All non-Business Space headers have a + Add shortcut.',
);

check(
  space.includes('!space.archivedAt'),
  'Archived Spaces do not expose the new Add shortcut.',
);

check(
  transactions.includes("searchParams.get(\n      'quick',")
  && transactions.includes("searchParams.get(\n      'spaceId',"),
  'Personal Money Activity accepts quick Space launch parameters.',
);

check(
  transactions.includes('quickLockedSpaceId')
  && transactions.includes('lockedSpaceId={'),
  'Quick launch locks Money Activity to the originating Space.',
);

check(
  transactions.includes("targetSpace.type === 'sme'"),
  'Business Spaces remain routed through Business Money Activity.',
);

check(
  transactions.includes("next.delete('quick')")
  && transactions.includes("next.delete('spaceId')"),
  'Quick launch URL parameters are consumed after opening.',
);

check(
  pkg.includes('verify-v1150-space-home-add-money-shortcut.mjs'),
  'Space Home shortcut verifier is included in the structural chain.',
);

console.log(
  'BajetBN Space Home + Add Money Activity shortcut verification PASS',
);
