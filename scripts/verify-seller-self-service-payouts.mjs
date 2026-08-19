import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const need = (text, token, label) => { if (!text.includes(token)) throw new Error(`Missing ${label}: ${token}`); };
const reject = (text, token, label) => { if (text.includes(token)) throw new Error(`Unsafe ${label} found: ${token}`); };

const functions = read('functions/src/index.ts');
const workspace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');
const repo = read('src/repositories/smePosRepository.ts');
const splitEditor = read('src/components/SmePosPaymentSplitEditor.tsx');
const models = read('src/types/models.ts');

let checks = 0;
const must = (text, token, label) => { need(text, token, label); checks += 1; };
const mustNot = (text, token, label) => { reject(text, token, label); checks += 1; };

// Seller wallet is a seller liability, not a fake bank/cash Account.
for (const token of ['grossSalesMinor: number;', 'commissionEarnedMinor: number;', 'balanceMinor: number;', 'paidOutMinor: number;']) must(models, token, `seller wallet field ${token}`);
must(workspace, 'Your Seller Wallet is the amount this shop currently owes you.', 'seller wallet explanation');
must(workspace, 'It is separate from normal BajetBN bank or cash accounts.', 'wallet/account separation copy');
mustNot(functions, "db.collection('accounts').doc(sellerId)", 'seller wallet account creation');

// Cashier/staff + Seller is an additive relationship with self-service.
must(functions, 'const mySeller = allSellers.find((item) => item.linkedUid === uid) || null;', 'linked seller relationship');
must(functions, 'const mySellerListings = mySeller', 'own seller listings');
must(functions, 'const mySellerSales = mySeller', 'own seller sales');
must(repo, 'mySellerListings: SmePosListing[];', 'own listings response type');
must(repo, 'mySellerSales: SmePosSale[];', 'own sales response type');
must(workspace, 'Your seller profile', 'self seller banner');
must(workspace, '`${roleLabel(role)} + Seller`', 'combined role label');
must(workspace, 'My inventory', 'My inventory action');
must(workspace, '+ Add stock', 'self Add stock action');
must(workspace, "setInventoryScope('mine')", 'My stock filter behavior');
must(workspace, '<option value="all">All stock</option>', 'All stock filter');
must(workspace, '<option value="mine">My stock · {mySeller.name}</option>', 'My stock filter');

// Seller self-service operations are server-enforced to the linked seller/listing.
for (const token of [
  'You can edit only stock linked to your own seller profile.',
  'You can add stock only to your own linked seller profile.',
  'You can update stock only for your own linked seller stock.',
  'You can receive stock only for your own linked seller stock.',
  'You can archive or restore only your own linked seller stock.',
]) must(functions, token, `seller ownership guard: ${token}`);
must(functions, 'seller.data()?.linkedUid !== uid', 'linked UID ownership check');
must(functions, 'commissionType: canManageAnySellerListing ? commission.commissionType : existing.commissionType', 'non-manager commission preservation');
must(functions, 'commissionRateBps: canManageAnySellerListing ? commission.commissionRateBps : Number(existing.commissionRateBps || 0)', 'non-manager rate preservation');
must(functions, 'commissionMinor: canManageAnySellerListing ? commission.commissionMinor : Number(existing.commissionMinor || 0)', 'non-manager fixed commission preservation');

// Seller-facing financial privacy.
must(functions, "paymentAccountId: \'\'", 'seller payout account ID redaction');
must(functions, "transactionId: \'\'", 'seller transaction ID redaction');
must(functions, "ledgerEntryId: \'\'", 'seller ledger ID redaction');
must(functions, "accountId: '', transactionId: '', ledgerEntryId: ''", 'split payout internal ID redaction');
must(workspace, 'but not the business account balance.', 'seller account-balance privacy copy');

// Payout source is mandatory, split-capable, isolated to this SME and fully auditable.
must(repo, 'payments: Array<{', 'split payout repository input');
must(functions, 'const paymentRows = parseSmePosPaymentRows(request.data || {}, amountMinor);', 'split payout parsing');
must(functions, 'if (raw.length > 4)', 'four-source maximum');
must(functions, 'Split payments must add up exactly to', 'exact split total guard');
must(functions, 'const postedPayments = await postSmePosPayments({', 'central payout posting');
must(functions, "direction: 'out'", 'payout Money Out direction');
must(functions, "categoryId: 'expense-supplier'", 'seller payout category');
must(functions, "posSettlementType: 'seller_payout'", 'seller payout settlement classification');
must(functions, 'requireSmePosPaymentAccountForSpace(input.settings, snapshot.data() || {}, row.accountId, input.spaceId);', 'SME account isolation');
must(functions, 'const sourceLabels = postedPayments.map((payment) => `${spaceName} — ${payment.accountName}`);', 'Space + account source labels');
must(functions, 'paymentSourceLabels: sourceLabels', 'source labels persistence');
must(functions, 'reference, note', 'payout reference persistence');
must(functions, 'createdByName: context.member.displayName', 'payout processor persistence');
must(workspace, 'Paid From', 'Paid From UI');
must(workspace, "payoutForm.paymentRows.some((row) => !row.accountId)", 'mandatory payout source guard');
must(workspace, 'accountLabel="Paid from"', 'payout source field label');
must(splitEditor, "accountLabel = 'Received in'", 'split editor account-label default');
must(splitEditor, '<label>{accountLabel}<select', 'split editor custom account label');
must(workspace, '`${space.name} — ${account.name}`', 'Space-account display label');
must(workspace, 'Confirm seller payout', 'payout confirmation');
must(workspace, 'Processed by {payout.createdByName}', 'payout processor history');
must(workspace, 'Split payouts can use up to four sources.', 'split payout history guidance');

// Seller balance changes remain tied to sale, return and payout accounting.
must(functions, 'balanceMinor: nextBalance', 'payout wallet reduction');
must(functions, 'paidOutMinor: Number(sellerSnapshot.data()?.paidOutMinor || 0) + amountMinor', 'lifetime paid-out total');
must(functions, "kind: 'payout', amountMinor: -amountMinor", 'negative seller ledger payout');
must(functions, "kind: 'sale_earning'", 'sale earning ledger');
must(functions, "kind: 'return_adjustment'", 'return wallet adjustment');

// Changed lightweight functions keep the quota-safe CPU setting.
for (const name of [
  'getMarketplacePosWorkspace', 'saveMarketplaceListing', 'registerExistingMarketplaceListing',
  'updateMarketplaceListingStock', 'receiveMarketplaceListingStock', 'setMarketplaceListingArchived',
  'recordMarketplaceSellerPayout',
]) {
  must(functions, `export const ${name} = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 },`, `${name} quota-safe runtime`);
}

console.log(`Seller self-service + wallet + split payout verifier: PASS (${checks} checks)`);
