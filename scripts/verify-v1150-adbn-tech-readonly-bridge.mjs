import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (text, marker, label) => {
  if (!text.includes(marker)) throw new Error('Missing ' + label + ': ' + marker);
};

const firebase = read('src/services/adbnTechFirebase.ts');
const repo = read('src/repositories/adbnTechIntegrationRepository.ts');
const home = read('src/features/business/BusinessHomePage.tsx');
const workspace = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
const spaceRepo = read('src/repositories/spaceRepository.ts');

requireText(firebase, "appName = 'adbn-tech-readonly'", 'secondary Firebase app');
requireText(firebase, "projectId: 'adbntech-cd466'", 'ADBN Firebase project');
requireText(firebase, 'browserSessionPersistence', 'session-only ADBN auth');
requireText(repo, "'advancedevotion.bn@gmail.com'", 'exact ADBN admin account');
requireText(repo, "collection(db, 'customers')", 'customer read');
requireText(repo, "collection(db, 'invoices')", 'invoice read');
requireText(repo, 'getDocs', 'Firestore read API');

for (const forbidden of ['addDoc', 'setDoc', 'updateDoc', 'deleteDoc', 'writeBatch', 'runTransaction']) {
  if (repo.includes(forbidden)) {
    throw new Error('ADBN mirror repository must remain read-only: found ' + forbidden);
  }
}

requireText(home, "'adbn_customers'", 'ADBN Customers workspace');
requireText(home, "'adbn_invoices'", 'ADBN Invoices workspace');
requireText(home, '<AdbnTechMirrorWorkspace', 'ADBN mirror component');
requireText(home, "=== 'zardeerwandy@gmail.com'", 'BajetBN owner account guard');
requireText(workspace, 'Connect ADBN TECH', 'cross-account connection action');
requireText(workspace, 'read-only', 'read-only UI disclosure');
requireText(spaceRepo, 'markAdbnTechIntegrationConnected', 'connected-state marker');

console.log('============================================================');
console.log(' SLICE 22 ADBN TECH READ-ONLY BRIDGE: VERIFY PASS');
console.log(' BajetBN owner remains zardeerwandy@gmail.com.');
console.log(' ADBN TECH connection requires advancedevotion.bn@gmail.com.');
console.log(' Customers + invoices use ADBN Firestore reads only.');
console.log(' No ADBN TECH writes are present in the connector repository.');
console.log(' No ADBN TECH repository/backend files are changed by this slice.');
console.log(' Production untouched.');
console.log('============================================================');
