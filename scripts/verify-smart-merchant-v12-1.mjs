import assert from 'node:assert/strict';
import {
  normalizeMerchant,
  readMerchantCategoryUsage,
  recordMerchantCategoryUsage,
  forgetMerchantCategoryUsage,
  findMerchantCategorySuggestion,
} from '../src/services/merchantCategoryUsage.ts';

const map = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
  },
};
const categories = [{ id: 'fuel' }, { id: 'food' }];
assert.equal(normalizeMerchant('  SHELL    Seria  '), 'shell seria');
assert.equal(normalizeMerchant('test@example.com'), '');
assert.equal(normalizeMerchant('+673 7123456'), '');
assert.equal(findMerchantCategorySuggestion(categories, [], 'Shell Seria'), null);
recordMerchantCategoryUsage('user-a', 'personal', ' Shell Seria ', 'fuel', 100);
assert.equal(findMerchantCategorySuggestion(categories, readMerchantCategoryUsage('user-a', 'personal'), 'shell seria')?.id, 'fuel');
assert.equal(findMerchantCategorySuggestion(categories, readMerchantCategoryUsage('user-a', 'business'), 'shell seria'), null);
assert.equal(findMerchantCategorySuggestion(categories, readMerchantCategoryUsage('user-b', 'personal'), 'shell seria'), null);
assert.equal(findMerchantCategorySuggestion([{ id: 'food' }], readMerchantCategoryUsage('user-a', 'personal'), 'shell seria'), null);
recordMerchantCategoryUsage('user-a', 'personal', 'shell seria', 'food', 200);
assert.equal(findMerchantCategorySuggestion(categories, readMerchantCategoryUsage('user-a', 'personal'), 'shell seria')?.id, 'food');
forgetMerchantCategoryUsage('user-a', 'personal', 'shell seria');
assert.equal(readMerchantCategoryUsage('user-a', 'personal').length, 0);
recordMerchantCategoryUsage('user-a', 'personal', 'test@example.com', 'food', 300);
assert.equal(readMerchantCategoryUsage('user-a', 'personal').length, 0);
for (let i = 0; i < 95; i += 1) recordMerchantCategoryUsage('user-a', 'personal', `shop ${i}`, 'food', i + 1);
assert.equal(readMerchantCategoryUsage('user-a', 'personal').length, 80);
console.log('Smart merchant category tests passed.');
