import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const client = fs.readFileSync(path.join(root, 'src/features/categories/defaultCategories.ts'), 'utf8');
const server = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/features/transactions/TransactionsPage.tsx'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

function ids(source) {
  return [...source.matchAll(/id:\s*'((?:income|expense)-[^']+)'/g)].map((match) => match[1]);
}

const clientIds = ids(client);
const serverIds = ids(server);
const uniqueClient = new Set(clientIds);
const uniqueServer = new Set(serverIds);

if (clientIds.length !== uniqueClient.size) throw new Error('Duplicate client category IDs found.');
if (serverIds.length !== uniqueServer.size) throw new Error('Duplicate server category IDs found.');
if (uniqueClient.size < 25) throw new Error('Expected at least 25 default categories.');

const missingOnServer = [...uniqueClient].filter((id) => !uniqueServer.has(id));
const missingOnClient = [...uniqueServer].filter((id) => !uniqueClient.has(id));
if (missingOnServer.length || missingOnClient.length) {
  throw new Error(`Category catalogs differ. Missing server: ${missingOnServer.join(', ') || 'none'}; missing client: ${missingOnClient.join(', ') || 'none'}`);
}

for (const required of ['createCategory', 'updateCategory', 'archiveCategory', 'categoryId: category.id']) {
  if (!server.includes(required)) throw new Error(`Functions missing ${required}.`);
}
for (const required of ['Edit categories', 'Money activity details', 'Top categories this month', 'categoryId: selectedCategory?.id']) {
  if (!page.includes(required)) throw new Error(`Transaction UX missing ${required}.`);
}
if (!rules.includes('match /categories/{categoryId}')) throw new Error('Firestore category rules are missing.');

console.log(`Categories and transaction UX checks passed (${uniqueClient.size} synchronized defaults).`);
