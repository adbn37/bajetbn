import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboard =
  fs.readFileSync(
    'src/pages/DashboardPage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const globalBusiness =
  fs.readFileSync(
    'src/features/business/GlobalBusinessOverview.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const businessHome =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  ).replace(/\r\n?/g, '\n');

for (const marker of [
  'data-home-mode-switch-v115',
  "searchParams.get('home') === 'business'",
  'GlobalBusinessOverview',
  'Personal only · Business excluded',
]) {
  assert.equal(
    dashboard.includes(marker),
    true,
    `Home mode marker missing: ${marker}`,
  );
}

assert.equal(
  dashboard.includes(
    'homeMode === \'personal\'',
  ),
  true,
  'Personal Home must remain an explicit Home mode.',
);

for (const marker of [
  'data-global-business-home',
  "space.type === 'sme'",
  'space.ownerId === userId',
  'listTransactionsForOwnerSpace(',
  'All Business total',
  'All-time money in minus money out across Businesses you own',
  'Each card uses transactions from that Business Space only.',
  'allBusinessTotal',
  'allTimeNet',
]) {
  assert.equal(
    globalBusiness.includes(marker),
    true,
    `Global Business Home marker missing: ${marker}`,
  );
}

for (const forbidden of [
  'ledgerBalanceMinor',
  'listAccounts(',
  'listAccountsForSpace(',
  'Total Business Balance',
  'Linked account balances',
]) {
  assert.equal(
    globalBusiness.includes(forbidden),
    false,
    `Global Business Home must be transaction-based, not account-balance-based: ${forbidden}`,
  );
}

for (const marker of [
  'All-time Business total',
  'Posted money in minus money out in this Business only',
  'businessTransactionTotal',
  'monthNet',
  'Money activity',
  '<AccountsPage',
]) {
  assert.equal(
    businessHome.includes(marker),
    true,
    `Business Space Home marker missing: ${marker}`,
  );
}

for (const forbidden of [
  'Linked account balances',
  'totalBusinessFunds',
  '<h2>Business accounts</h2>',
  'business-home-v115-account-strip',
  'AccountAvatar',
]) {
  assert.equal(
    businessHome.includes(forbidden),
    false,
    `Business Space Home still exposes account-balance Home UI: ${forbidden}`,
  );
}

for (const marker of [
  '.bajetbn-home-mode-switch-v115',
  '.global-business-total-v115',
  '.global-business-card-v115',
  '.business-home-v115-hero-stats',
  '.page.bajetbn-reference-home\n  > .bajetbn-home-mode-switch-v115',
  '.page.bajetbn-reference-home\n  > .global-business-home-v115',
  'grid-column: 1 / -1;',
  'order: 2;',
  'order: 3;',
]) {
  assert.equal(
    css.includes(marker),
    true,
    `Home mode CSS missing: ${marker}`,
  );
}

console.log(
  'BajetBN v1.15.0 Personal / Business Home transaction rollup verification PASS.',
);
