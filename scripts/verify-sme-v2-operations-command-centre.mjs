import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const command = read('src/features/spaces/SmeOperationsCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const standard = read('src/features/sme-pos/StandardPosWorkspace.tsx');
const marketplace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');
const styles = read('src/styles/global.css');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'Business Overview',
  'Needs Attention',
  'Your daily focus',
  "role === 'owner'",
  "role === 'manager'",
  "role === 'cashier'",
  "role === 'stock_staff'",
  "role === 'seller'",
  "role === 'viewer'",
  'Open Register',
  'Open Inventory',
  'Open Seller area',
  'Finance access',
  'Restricted',
]) {
  expect(
    command.includes(token),
    `SME Business Overview is missing: ${token}`,
  );
}

expect(
  command.includes("to={`/spaces/${space.id}/pos`}"),
  'Role landing must reuse the existing SME POS workspace.',
);

expect(
  command.includes("to={`/spaces/${space.id}?section=bills`}"),
  'SME Needs Attention must open the existing Business Bills & Instalments module.',
);

expect(
  !command.includes("to={`/spaces/${space.id}?tab=bills`}"),
  'SME Needs Attention must not send commitment alerts to Shared Bills.',
);

expect(
  !command.includes('button primary'),
  'SME Command Centre must not compete with the existing primary Open POS action.',
);

expect(
  details.includes(
    "import { SmeOperationsCommandCentre } from './SmeOperationsCommandCentre';",
  ),
  'SpaceDetailsPage must import the SME Operations Command Centre.',
);

expect(
  details.includes("space.type === 'sme' && (")
    && details.includes('<SmeOperationsCommandCentre'),
  'SME overview must render the Operations Command Centre.',
);

for (const token of [
  'role={smePosRole}',
  'canViewFinancials={canViewSmeFinancials}',
  'accounts={accounts}',
  'transactions={transactions}',
  'commitments={commitments}',
  'memberCount={activeMembers.length}',
]) {
  expect(
    details.includes(token),
    `SME overview wiring is missing: ${token}`,
  );
}

expect(
  standard.includes(
    "if (role === 'stock_staff' || role === 'viewer') return 'products'",
  ),
  'Standard POS must remain responsible for stock/viewer landing.',
);

expect(
  marketplace.includes("if (role === 'seller') return 'balance'"),
  'Marketplace POS must remain responsible for Seller landing.',
);

expect(
  marketplace.includes(
    "if (role === 'stock_staff' || role === 'viewer') return 'listings'",
  ),
  'Marketplace POS must remain responsible for stock/viewer landing.',
);

expect(
  styles.includes('/* SME v2 Slice 1 - operations command centre */'),
  'SME v2 Slice 1 styles are missing.',
);

expect(
  !command.includes('window.confirm(')
    && !command.includes('window.alert('),
  'SME Business Overview must not use browser-native confirmation.',
);

console.log('SME v2 Slice 1 Business Overview checks passed.');