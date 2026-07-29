import assert from 'node:assert/strict';

function accountEffect(accountType, flow, amountMinor) {
  const assetEffect = flow === 'in' ? amountMinor : -amountMinor;
  return accountType === 'credit_card' ? -assetEffect : assetEffect;
}

assert.equal(accountEffect('bank', 'in', 10_000), 10_000, 'Bank income increases balance');
assert.equal(accountEffect('bank', 'out', 2_550), -2_550, 'Bank expense decreases balance');
assert.equal(accountEffect('credit_card', 'out', 2_550), 2_550, 'Card expense increases outstanding balance');
assert.equal(accountEffect('credit_card', 'in', 1_000), -1_000, 'Card payment/refund reduces outstanding balance');

const bankTransferSource = accountEffect('bank', 'out', 1_000);
const bankTransferDestination = accountEffect('bank', 'in', 1_000);
assert.equal(bankTransferSource + bankTransferDestination, 0, 'Asset-to-asset transfer is value neutral');
assert.equal(-bankTransferSource, 1_000, 'Reversal restores source account');
assert.equal(-bankTransferDestination, -1_000, 'Reversal restores destination account');

console.log('Transaction ledger effect tests passed.');
