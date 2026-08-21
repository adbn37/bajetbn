import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const need = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = json('package.json');
const releaseJson = json('release.json');
const targets = json('config/release-targets.json');

need(packageJson.version === releaseJson.version, 'package.json and release.json versions must match.');

need(targets.staging?.gitBranch === 'staging', 'Staging Git branch target must remain staging.');
need(targets.staging?.firebaseProject === 'bajetbn-staging', 'Staging Firebase target must remain bajetbn-staging.');
need(targets.staging?.cloudflareProject === 'bajetbn-staging', 'Staging Cloudflare target must remain bajetbn-staging.');
need(targets.staging?.url === 'https://bajetbn-staging.pages.dev', 'Staging URL changed unexpectedly.');
need(targets.production?.gitBranch === 'main', 'Production Git branch must remain main.');
need(targets.production?.url === 'https://bajetbn.pages.dev', 'Production URL changed unexpectedly.');

const firebaseRc = json('.firebaserc');
need(firebaseRc.projects?.staging === targets.staging.firebaseProject, '.firebaserc staging alias must match release targets.');

const structural = String(packageJson.scripts?.['verify:all-structural'] || '');
const structuralCommands = structural.split(/\s*&&\s*/).map((item) => item.trim()).filter(Boolean);
need(structuralCommands.length > 0, 'verify:all-structural must contain checks.');

const duplicates = structuralCommands.filter((command, index) => structuralCommands.indexOf(command) !== index);
need(duplicates.length === 0, 'verify:all-structural contains duplicate commands: ' + [...new Set(duplicates)].join(', '));

for (const command of structuralCommands) {
  const match = command.match(/^node\s+(scripts\/[^\s]+\.mjs)(?:\s|$)/);
  if (match) need(fs.existsSync(path.join(root, match[1])), 'Structural verifier is missing: ' + match[1]);
}

const models = read('src/types/models.ts');
const spaceTypeMatch = models.match(/export type SpaceType\s*=\s*([^;]+);/s);
need(spaceTypeMatch, 'SpaceType declaration is missing.');
const actualSpaceTypes = Array.from(spaceTypeMatch[1].matchAll(/'([^']+)'/g), (match) => match[1]).sort();
const expectedSpaceTypes = ['asset', 'collection', 'custom', 'event', 'goal', 'household', 'personal', 'project', 'property', 'sme', 'trip', 'vehicle'].sort();
need(JSON.stringify(actualSpaceTypes) === JSON.stringify(expectedSpaceTypes), 'SpaceType source of truth differs from supported types.');

const moduleSource = read('src/features/spaces/customSpaceModules.ts');
const actualModules = Array.from(moduleSource.matchAll(/value:\s*'([^']+)'/g), (match) => match[1]).sort();
const expectedModules = ['bills', 'budgets', 'calendar', 'goals', 'group_fund', 'reports'].sort();
need(JSON.stringify(actualModules) === JSON.stringify(expectedModules), 'Custom Space module source of truth differs from supported modules.');

const details = read('src/features/spaces/SpaceDetailsPage.tsx');
need(details.includes('normalizeCustomSpaceModules(space.customModules)'), 'SpaceDetails must consume the canonical Custom Space module normalizer.');

const sourceFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
};

walk(path.join(root, 'src'));

const declarations = sourceFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('export const CUSTOM_SPACE_MODULE_OPTIONS'));
need(declarations.length === 1, 'CUSTOM_SPACE_MODULE_OPTIONS must have exactly one declaration.');
need(declarations[0].endsWith(path.join('spaces', 'customSpaceModules.ts')), 'Custom module declaration must remain in customSpaceModules.ts.');

const historicalTypes = ['personal', 'household', 'sme', 'trip', 'goal', 'collection', 'custom'];
const staleUnion = 'export type SpaceType = ' + historicalTypes.map((item) => String.fromCharCode(39) + item + String.fromCharCode(39)).join(' | ');
const scriptFiles = fs.readdirSync(path.join(root, 'scripts')).filter((name) => name.endsWith('.mjs') && name !== 'verify-reliability-automation.mjs');
const staleScripts = scriptFiles.filter((name) => read(path.join('scripts', name)).includes(staleUnion));
need(staleScripts.length === 0, 'Structural scripts contain a stale historical SpaceType union: ' + staleScripts.join(', '));

console.log('Reliability and source-of-truth checks passed.');
