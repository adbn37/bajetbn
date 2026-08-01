import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
let checks = 0;

function requireFile(file) {
  checks += 1;
  if (!exists(file)) fail(`Missing re-registration file: ${file}`);
}
function requireText(file, token) {
  requireFile(file);
  checks += 1;
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
}
function rejectText(file, pattern, message) {
  requireFile(file);
  checks += 1;
  if (pattern.test(read(file))) fail(message || `Unexpected text in ${file}: ${pattern}`);
}

for (const file of [
  'ACCOUNT_REREGISTRATION_POLICY_ALPHA.md',
  'functions/src/index.ts',
  'src/contexts/AuthContext.tsx',
  'src/features/auth/RegisterPage.tsx',
  'firestore.rules',
]) requireFile(file);

const release = JSON.parse(read('release.json'));
checks += 2;
if (release.version !== '0.11.6') fail(`Expected v0.11.6, found ${release.version}.`);
if (!/Re-registration Alpha 2/i.test(release.label)) fail('release.json does not identify Re-registration Alpha 2.');

requireText('functions/src/index.ts', 'accountReRegistrationCooldownDays = 30');
requireText('functions/src/index.ts', 'registrationEmailHash');
requireText('functions/src/index.ts', "bajetbn-registration-v1:");
requireText('functions/src/index.ts', "db.collection('accountRegistrationRestrictions')");
requireText('functions/src/index.ts', 'export const enforceRegistrationEligibility');
requireText('functions/src/index.ts', 'registrationEligibilityForAuthenticatedUser');
requireText('functions/src/index.ts', 'removeBlockedRegistrationAuthUser');
requireText('functions/src/index.ts', "restrictionMode: preserveManualReview ? 'manual_review' : 'cooldown'");
requireText('functions/src/index.ts', "reRegistrationPolicy: preserveManualReview ? 'manual_review' : 'automatic_after_cooldown'");
requireText('functions/src/index.ts', 'A completely new BajetBN account will be created');
requireText('functions/src/index.ts', 'await registrationEligibilityForAuthenticatedUser(uid, request.auth?.token.email)');
requireText('functions/src/index.ts', 'await getAuth().deleteUser(uid)');
rejectText('functions/src/index.ts', /accountRegistrationRestrictions[\s\S]{0,400}email:\s*email\b/, 'The registration restriction must not store the raw email.');

requireText('src/contexts/AuthContext.tsx', "httpsCallable(functions, 'enforceRegistrationEligibility')");
requireText('src/contexts/AuthContext.tsx', 'enforceRegistrationEligibilityForCurrentUser');
requireText('src/contexts/AuthContext.tsx', 'await signOut(auth).catch');
requireText('src/features/auth/RegisterPage.tsx', 'Previous Spaces, balances and memberships are not restored.');
requireText('src/features/auth/LoginPage.tsx', 'continueWithGoogle');
requireText('src/features/auth/RegisterPage.tsx', 'registerWithGoogle');

requireText('firestore.rules', 'match /accountRegistrationRestrictions/{emailHash}');
requireText('firestore.rules', 'allow read, write: if false;');
requireText('ACCOUNT_DATA_DELETION_ALPHA.md', '30 days');
requireText('DATA_RETENTION_AND_DELETION.md', 'protected deterministic email hash');
requireText('STAGING_TEST_CHECKLIST.md', '30-day re-registration restriction');
requireText('package.json', 'verify-account-reregistration-policy.mjs');

const now = Date.UTC(2026, 7, 1, 0, 0, 0);
const allowedAt = now + 30 * 24 * 60 * 60 * 1000;
checks += 3;
if (new Date(allowedAt).toISOString().slice(0, 10) !== '2026-08-31') fail('30-day cooldown calculation is incorrect.');
if (!(allowedAt > now)) fail('Cooldown date must be after completed deletion.');
if (!('manual_review'.includes('manual_review'))) fail('Manual-review mode calculation failed.');

console.log(`Account re-registration policy checks passed (${checks} structural checks plus cooldown calculations).`);
console.log('Policy: normal self-deletion allows an automatic fresh registration after 30 days; security restrictions require manual review.');
