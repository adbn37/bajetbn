import fs from 'node:fs';

const fail = (message) => {
  throw new Error(message);
};

const page = fs.readFileSync(
  'src/features/business/BusinessHomePage.tsx',
  'utf8',
);

const styles = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const transactions = fs.readFileSync(
  'src/features/transactions/TransactionsPage.tsx',
  'utf8',
);

const businessMoney = fs.readFileSync(
  'src/features/business/BusinessMoneyActivityPage.tsx',
  'utf8',
);

const dashboard = fs.readFileSync(
  'src/pages/DashboardPage.tsx',
  'utf8',
);

for (const expected of [
  'useNavigate',
  'listSpaces',
  'businessSpaces',
  'setBusinessSpaces',
  'const switchBusiness',
  'Switch Business',
  'aria-label="Switch Business"',
  "'/business/' + nextSpaceId",
]) {
  if (!page.includes(expected)) {
    fail(
      'v1.21 Business context is missing: '
      + expected,
    );
  }
}

if (
  !page.includes(
    "item.type === 'sme'",
  )
  || !page.includes(
    '&& !item.archivedAt',
  )
  || !page.includes(
    'canAccessInternalAdbnTechSpace(',
  )
) {
  fail(
    'Business switcher scope protection is missing.',
  );
}

for (const expected of [
  'BAJETBN V1.21 MULTI BUSINESS CONTEXT',
  '.business-home-switcher-v121 {',
  '.business-home-switcher-v121 select {',
]) {
  if (!styles.includes(expected)) {
    fail(
      'v1.21 Business switcher styling is missing: '
      + expected,
    );
  }
}

for (const expected of [
  'listedSpaces',
  'item.id === nextSpace.id',
  'nextSpace,',
  'entryAccounts',
  'entrySpaces',
  'entryCategories',
  'listPersonalAccounts',
  'listAccountsForSpace',
  'initialSpaceId={',
  'requestMoveOnly',
]) {
  if (!businessMoney.includes(expected)) {
    fail(
      'v1.21 flexible Business Add is missing: '
      + expected,
    );
  }
}

const addStart =
  businessMoney.indexOf(
    '{showAdd && (',
  );

const correctionStart =
  businessMoney.indexOf(
    '{correctionDraft && (',
    addStart,
  );

const addBlock =
  addStart >= 0
  && correctionStart > addStart
    ? businessMoney.slice(
        addStart,
        correctionStart,
      )
    : '';

if (
  !addBlock.includes(
    'requestMoveOnly'
  )
  || !addBlock.includes(
    ': entryAccounts'
  )
  || !addBlock.includes(
    ': entrySpaces'
  )
  || !addBlock.includes(
    '? space.id'
  )
  || !addBlock.includes(
    ': undefined'
  )
) {
  fail(
    'Normal Business Add must be flexible while Request Move remains scoped.',
  );
}

if (
  !businessMoney.includes(
    'Business visibility follows accessible'
  )
  || businessMoney.includes(
    'businessSpaceIdsForAccount('
  )
) {
  fail(
    'Accessible Business Spaces must remain selectable before account compatibility is resolved.',
  );
}

for (const expected of [
  'const quickEntryAccounts =',
  'const quickEntrySpaces =',
  'accounts={quickEntryAccounts}',
  'spaces={quickEntrySpaces}',
]) {
  if (!dashboard.includes(expected)) {
    fail(
      'v1.21 global Add Money context is missing: '
      + expected,
    );
  }
}

if (
  dashboard.includes(
    'accounts={quickAccounts}\n            spaces={quickPersonalSpaces}'
  )
) {
  fail(
    'Home global + must not remain Personal-only.',
  );
}

for (const expected of [
  'initialSpaceId?: string',
  'money-entry-owner-switch-v121',
  'aria-label="Money owner"',
  "selectEntryOwnerMode(",
  "'personal'",
  "'business'",
  'aria-label="Choose Business"',
  'businessEntrySpaces.map',
  'personalEntrySpaces.map',
]) {
  if (!transactions.includes(expected)) {
    fail(
      'v1.21 shared Add Money context is missing: '
      + expected,
    );
  }
}

for (const expected of [
  'BAJETBN V1.21 FLEXIBLE MONEY ENTRY CONTEXT',
  '.money-entry-owner-v121 {',
  '.money-entry-owner-switch-v121 {',
  '.money-entry-business-v121 {',
]) {
  if (!styles.includes(expected)) {
    fail(
      'v1.21 flexible Add styling is missing: '
      + expected,
    );
  }
}

console.log(
  'BAJETBN v121 BUSINESS CONTEXT VERIFICATION PASS',
);
