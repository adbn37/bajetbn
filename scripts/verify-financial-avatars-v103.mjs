/** Phase 10.3 static validation. Full app build/browser acceptance are required. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const read=(p)=>fs.readFileSync(p,'utf8');
const visual=read('src/services/financialVisualAssets.ts');
for(const provider of ['bibd','baiduri','taib','standard_chartered_brunei','tng']){
  assert.match(visual, new RegExp(`\\b${provider}\\b`),`Missing ${provider}`);
}
for(const key of ['personal','household','sme','trip','goal','collection','vehicle','property','project','event','asset','custom']){
  assert.match(visual,new RegExp(`\\b${key}:\\s*'[^']+'`),`Missing Space mapping ${key}`);
}
assert.match(visual,/account\.institutionCode/, 'Stored institution code not resolved');
assert.match(visual,/account\.institution/, 'Provider name not resolved');
assert.match(visual,/account\.name/, 'Account name not resolved');
assert.match(visual,/account\.type === 'e_wallet'/, 'Wallet/TNG type gate missing');
assert.match(visual,/category-icons-v102/, 'Existing SVG pack not reused');
assert.match(visual,/bank-logos-v103/, 'User-supplied self-hosted logo routes are missing');
assert.doesNotMatch(visual,/https?:\/\//, 'Browser code must not hotlink bank logos');
const account=read('src/features/accounts/AccountAvatar.tsx');
assert.match(account,/accountBrandVisual\(account\)/,'Branded account detection missing');
assert.match(account,/getAccountAvatarUrl/,'Custom uploaded account icon path lost');
assert.match(account,/onError=\{\(\) => setFailedBrandUrl/,'Logo failure fallback missing');
const space=read('src/features/spaces/SpaceAvatar.tsx');
assert.match(space,/spaceFallbackArt\(space\.type\)/,'Space visual mapping missing');
assert.match(space,/getSpaceAvatarUrl/,'Custom Space icon path lost');
assert.match(read('src/features/accounts/AccountsPage.tsx'),/Touch 'n Go eWallet/,'TNG shortcut missing');
assert.match(read('src/features/spaces/SpaceAvatarSettings.tsx'),/<SpaceAvatar space=\{space\} size="large" \/>/,'Space settings preview missing');
assert.match(read('src/main.tsx'),/import '\.\/styles\/design-financial-avatars-v103\.css';/,'Styles not imported');
const expectedHashes = {
  "bibd-personal.png": "e97d46838ef1c0e47856acf11204b16d2d66c51f174d0cda7e780b9f2a4df17d",
  "baiduri-personal.png": "28623ceb07c2e5ade5b8fe08102c38ac1c4103883b5a2d0ce9fc2a5d94243865",
  "baiduri-business.png": "8cca27e9c257bb92be3c5fb37cdceaa6992b7d2bc1861b60b5d07b12dd2d9334",
  "bibd-business.png": "f657b6896f4e5d14d1b8e594b682aa6fe55fa39efaeccd5fa2546fb67def1738",
  "taib.png": "44ada70ded02f2533a5343535eb0d032093bf6d0058a6ad359d8edb9e404d28a",
  "standard-chartered.png": "049675972833719d0c5d58f761d7838ed00412583ae394d88311ebe7cc56559a",
  "tng.png": "2f546b3adc418c688186c102847c7203999981ff42ed4c3e31b1ac5be6b8f364"
};
for (const [file, expectedHash] of Object.entries(expectedHashes)) {
  const name = 'public/bank-logos-v103/' + file;
  assert.ok(fs.existsSync(name), `Missing user-supplied logo: ${file}`);
  const data = fs.readFileSync(name);
  assert.equal(createHash('sha256').update(data).digest('hex'), expectedHash, `User logo differs from uploaded image: ${file}`);
  assert.ok(visual.includes(file), `Provider variant filename missing: ${file}`);
}
assert.match(visual, /account\.classification === 'business'/, 'Personal / Business differentiation missing');
assert.match(account, /account\.classification/, 'Avatar classification memo dependency missing');
assert.ok(fs.existsSync('public/category-icons-v102/bank.svg'), 'Existing category SVGs unavailable');
assert.ok(fs.existsSync('public/category-icons-v102/briefcase.svg'), 'Existing Space SVGs unavailable');
console.log('BajetBN Phase 10.3 Account/Space icon wiring: PASS (static verification).');
console.log('Logo artwork is pixel-identical to the seven supplied images; verify rendering in staging.');
