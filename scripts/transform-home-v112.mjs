/** Deterministic source transformation, shared by installer and verifier. */
export const BASELINE_V112 = 'd3db80c7e71ef3a8c0a7f0002ac358fda5fb8430';
export const FEATURE_V112 = 'feature/firestore-home-reads-v112-20261019';

export const normalizeV112 = source => source.replace(/\r\n?/g, '\n');

function once(source, find, replace) {
  const count = source.split(find).length - 1;
  if (count !== 1) {
    throw new Error(`Expected one matching source anchor; found ${count}: ${find.slice(0, 95)}`);
  }
  return source.replace(find, replace);
}

export function transformHomeV112(original) {
  let source = normalizeV112(original);
  source = once(
    source,
    "import { listAllCustomCategories } from '../repositories/categoryRepository';\n",
    '',
  );
  source = once(
    source,
    "import { listSpaces } from '../repositories/spaceRepository';\n",
    "import { readHomeSpacesV112, readHomeCategoriesV112 } from '../services/homeReadCoalescingV112';\n",
  );

  const spaces = (source.match(/\blistSpaces\s*\(/g) || []).length;
  const categories = (source.match(/\blistAllCustomCategories\s*\(/g) || []).length;
  if (spaces !== 4 || categories !== 2) {
    throw new Error(`Unexpected Home read sites: Spaces ${spaces} (expected 4), categories ${categories} (expected 2)`);
  }
  source = source.replace(/\blistSpaces\s*\(/g, 'readHomeSpacesV112(');
  source = source.replace(/\blistAllCustomCategories\s*\(/g, 'readHomeCategoriesV112(');

  const start = source.indexOf('  const openHomeActivityDetails =');
  const end = source.indexOf('  const selectedActivitySource =', start);
  if (start < 0 || end <= start) throw new Error('Home activity details section not found');
  let section = source.slice(start, end);
  const anchor = `        if (!user) {
          return;
        }

        setActivityDetailLoading(true);`;
  const replacement = `        if (!user) {
          return;
        }

        // Home has already loaded these Space labels. Use them for the
        // detail heading without another Firestore read. Unknown/archived
        // Spaces still use the original fresh-query fallback below.
        const homeSpaceV112 = spaces.find(
          (space) => space.id === transaction.spaceId,
        );
        if (homeSpaceV112) {
          setSelectedActivitySpaceName(
            homeSpaceV112.type === 'personal'
              ? 'Personal'
              : homeSpaceV112.name || 'Unknown Space',
          );
          setActivityDetailLoading(false);
          return;
        }

        setActivityDetailLoading(true);`;
  section = once(section, anchor, replacement);
  section = once(section, '      [user],\n    );', '      [user, spaces],\n    );');
  source = source.slice(0, start) + section + source.slice(end);

  if (/\blistSpaces\s*\(|\blistAllCustomCategories\s*\(/.test(source)) {
    throw new Error('Eager Home read call still present');
  }
  return source;
}


/** Preserve Phase 11.1.1 verification while allowing ONLY this exact Home optimization. */
export function transformV1111VerifierV112(original) {
  let source = normalizeV112(original);
  source = once(
    source,
    "import { execFileSync } from 'node:child_process';\n",
    "import { execFileSync } from 'node:child_process';\nimport { transformHomeV112 } from './transform-home-v112.mjs';\n",
  );
  source = once(
    source,
    "assert.equal(read(HOME), base(HOME), 'Dashboard Add Money loader changed from tested version');",
    "assert.equal(read(HOME), transformHomeV112(base(HOME)), 'Dashboard must match the reviewed Phase 11.2 Home-only read optimizations');",
  );
  return source;
}
