import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const candidate = String(process.argv[2] || '').trim();
const need = (condition, message) => { if (!condition) throw new Error(message); };

need(candidate, 'Usage: node scripts/verify-production-lineage.mjs <verified-staging-commit>');

const git = (...args) => {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return {
    status: result.status === null ? 1 : result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  };
};

const targets = JSON.parse(fs.readFileSync('config/release-targets.json', 'utf8'));
need(targets.staging?.gitBranch === 'staging', 'Invalid staging branch target.');
need(targets.production?.gitBranch === 'main', 'Invalid production branch target.');

const resolvedCandidate = git('rev-parse', candidate);
need(resolvedCandidate.status === 0, 'Candidate commit cannot be resolved: ' + resolvedCandidate.stderr);

const staging = git('rev-parse', 'origin/' + targets.staging.gitBranch);
need(staging.status === 0, 'origin/staging cannot be resolved.');
need(staging.stdout === resolvedCandidate.stdout, 'Candidate must exactly equal origin/staging before production promotion.');

const production = 'origin/' + targets.production.gitBranch;
const productionCommit = git('rev-parse', production);
need(productionCommit.status === 0, production + ' cannot be resolved.');

const ancestry = git('merge-base', '--is-ancestor', productionCommit.stdout, resolvedCandidate.stdout);
need(ancestry.status === 0, 'Production main is not an ancestor of the verified staging candidate.');

console.log('Production lineage guard passed for ' + resolvedCandidate.stdout);
