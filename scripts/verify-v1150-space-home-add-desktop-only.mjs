import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const css =
  read('src/styles/global.css');
const business =
  read('src/features/business/BusinessHomePage.tsx');
const space =
  read('src/features/spaces/SpaceDetailsPage.tsx');
const pkg =
  read('package.json');

check(
  business.includes('data-space-home-add-shortcut')
  && space.includes('data-space-home-add-shortcut'),
  'Business and non-Business Space Home shortcuts use the shared marker.',
);

check(
  css.includes('/* BAJETBN SPACE HOME ADD DESKTOP ONLY */'),
  'Desktop-only shortcut CSS marker exists.',
);

check(
  /@media\s*\(max-width:\s*780px\)[\s\S]*?\[data-space-home-add-shortcut\][\s\S]*?display:\s*none\s*!important;/.test(css),
  'Space Home + Add is hidden at the existing mobile breakpoint.',
);

check(
  pkg.includes('verify-v1150-space-home-add-desktop-only.mjs'),
  'Desktop-only verifier is included in the structural chain.',
);

console.log(
  'BajetBN Space Home + Add desktop-only verification PASS',
);
