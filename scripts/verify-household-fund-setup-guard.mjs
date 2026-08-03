import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const panel = read('src/features/spaces/SpaceFundPanel.tsx');
const functions = read('functions/src/index.ts');
const styles = read('src/styles/global.css');
const i18n = read('src/services/i18n.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [
  [panel, 'const contributionReady = Boolean(fund && fund.holderUid && activeHolder);', 'UI setup-complete guard'],
  [panel, 'disabled={!contributionReady}', 'disabled contribution button'],
  [panel, 'space-fund-contribution-help', 'visible setup guidance'],
  [panel, 'Choose an active money holder before adding a contribution.', 'inactive-holder guidance'],
  [panel, 'contributionOpen && contributionReady && fund', 'modal setup guard'],
  [panel, 'if (!hasSelectedHolder)', 'settings-form holder guard'],
  [panel, 'disabled={busy || !hasSelectedHolder}', 'settings save disabled without holder'],
  [functions, 'const fundData = fund.data() || {};', 'backend fund snapshot validation'],
  [functions, "if (!holderUid) throw new HttpsError('failed-precondition'", 'backend missing-holder guard'],
  [functions, "const holder = await transaction.get(db.collection('spaceMembers').doc(`${spaceId}_${holderUid}`));", 'backend holder read'],
  [functions, 'Choose an active member to hold ${fundMeta.title} before adding a contribution.', 'backend inactive-holder guard'],
  [styles, '.space-fund-setup-guard', 'setup guidance styling'],
  [styles, '.space-fund-panel .button.primary:disabled', 'clear disabled-button styling'],
  [i18n, "'Set up the Household fund first before adding a contribution.'", 'Malay-ready Household guidance'],
];
for (const [content, token, label] of checks) assert.equal(content.includes(token), true, `${label} is missing`);

const guardIndex = functions.indexOf('const fundData = fund.data() || {};');
const contributionCreateIndex = functions.indexOf('transaction.create(contributionRef', guardIndex);
const activityIndex = functions.indexOf("action: 'space_fund_contribution'", guardIndex);
assert.ok(guardIndex >= 0 && contributionCreateIndex > guardIndex, 'Contribution is written before setup validation.');
assert.ok(activityIndex > contributionCreateIndex, 'Activity is written before the contribution record.');
assert.equal(pkg.scripts['verify:all-structural'].includes('verify-household-fund-setup-guard.mjs'), true);

console.log(`Household fund setup guard checks passed (${checks.length} structural checks plus write-order validation).`);
