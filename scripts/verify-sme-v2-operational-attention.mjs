import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');

const panel = read('src/features/spaces/SmeOperationalAttentionPanel.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const command = read('src/features/spaces/SmeOperationsCommandCentre.tsx');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

for (const token of [
  'getSmePosStaffWorkspace',
  'getMarketplacePosWorkspace',
  'listSmePosReservations',
  "const operationalRole = role === 'owner' || role === 'manager';",
  'if (!operationalRole) return null;',
  "new Set<SmePosReservation['status']>",
  "'reserved'",
  "'partially_paid'",
  "'paid'",
  'item.quantityOnHand - (item.reservedQuantity || 0)',
  'available <= item.lowStockLevel',
  'item.balanceMinor > 0',
  'Seller payouts waiting',
  'Open bookings',
  'Low stock',
  'POS attention',
  'Open inventory',
  'Open seller payouts',
  'Open bookings',
  'to={`/spaces/${space.id}/pos`}',
]) {
  need(panel.includes(token), `Operational attention panel is missing: ${token}`);
}

need(
  panel.includes("marketplaceResult.status === 'fulfilled'"),
  'Marketplace-specific attention must only use the Marketplace workspace when available.',
);

need(
  !panel.includes("'completed',") && !panel.includes("'cancelled',"),
  'Completed or cancelled bookings must not be treated as open booking statuses.',
);

need(
  !panel.includes('button primary'),
  'SME operational attention must not introduce another primary action.',
);

need(
  !/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(panel),
  'SME operational attention must not use browser-native confirm/alert.',
);

need(
  details.includes("import { SmeOperationalAttentionPanel } from './SmeOperationalAttentionPanel';"),
  'Space Details must import the operational attention panel.',
);

need(
  details.includes('<SmeOperationalAttentionPanel')
    && details.includes('role={smePosRole}'),
  'SME Space overview must render role-aware operational attention.',
);

need(
  command.includes('<h3>Needs Attention</h3>')
    && command.includes('dueCommitments'),
  'Existing SME business-bill Needs Attention must remain intact.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-sme-v2-operational-attention.mjs'),
  'Slice 3 verifier must be registered in verify:all-structural.',
);

console.log(`SME v2 operational attention checks passed (${checks} checks).`);
