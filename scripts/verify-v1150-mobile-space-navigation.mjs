import assert from 'node:assert/strict';
import fs from 'node:fs';

const hub =
  fs.readFileSync(
    'src/features/spaces/SpaceActionHub.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  ).replace(/\r\n?/g, '\n');

for (const marker of [
  'data-simplified-space-navigation',
  'data-space-launcher={space.type}',
  'ref={mobileNavigationRef}',
  'mobileNavigationRef.current',
  'querySelector<HTMLElement>(',
  "'.primary-action',",
  'window.matchMedia(',
  "'(max-width: 620px)',",
  'scrollIntoView({',
  "inline: 'center'",
]) {
  assert.equal(
    hub.includes(marker),
    true,
    `Mobile Space navigation behavior missing: ${marker}`,
  );
}

const finalMarker =
  'BAJETBN V1.15 MOBILE SPACE SWIPE NAV';

const finalIndex =
  css.lastIndexOf(
    finalMarker,
  );

assert.notEqual(
  finalIndex,
  -1,
  'Final mobile Space swipe-nav CSS marker is missing.',
);

const finalCss =
  css.slice(finalIndex);

for (const marker of [
  '@media (max-width: 620px)',
  '.space-action-buttons.simplified-space-actions',
  "data-business-industry='marketplace'",
  'display: flex !important;',
  'grid-template-columns: none !important;',
  'flex-wrap: nowrap !important;',
  'overflow-x: auto !important;',
  'scroll-snap-type: x proximity;',
  'scrollbar-width: none;',
  'width: auto !important;',
  'min-width: 88px !important;',
  'min-height: 44px !important;',
  'scroll-snap-align: start;',
]) {
  assert.equal(
    finalCss.includes(marker),
    true,
    `Final mobile Space swipe-nav CSS missing: ${marker}`,
  );
}

assert.equal(
  finalCss.includes(
    'grid-template-columns:\n      repeat(2',
  ),
  false,
  'The final mobile Space launcher must not regress to a 2-column grid.',
);

console.log(
  'BajetBN v1.15.0 mobile Space swipe navigation verification PASS.',
);
