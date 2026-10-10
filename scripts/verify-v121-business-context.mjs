import fs from 'node:fs';

const fail = (message) => {
  throw new Error(message);
};

const page = fs.readFileSync(
  'src/features/business/BusinessHomePage.tsx',
  'utf8',
);

const styles = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

for (const expected of [
  'useNavigate',
  'listSpaces',
  'businessSpaces',
  'setBusinessSpaces',
  'const switchBusiness',
  'Switch Business',
  'aria-label="Switch Business"',
  "'/business/' + nextSpaceId",
]) {
  if (!page.includes(expected)) {
    fail(
      'v1.21 Business context is missing: '
      + expected,
    );
  }
}

if (
  !page.includes(
    "item.type === 'sme'",
  )
  || !page.includes(
    '&& !item.archivedAt',
  )
  || !page.includes(
    'canAccessInternalAdbnTechSpace(',
  )
) {
  fail(
    'Business switcher scope protection is missing.',
  );
}

for (const expected of [
  'BAJETBN V1.21 MULTI BUSINESS CONTEXT',
  '.business-home-switcher-v121 {',
  '.business-home-switcher-v121 select {',
]) {
  if (!styles.includes(expected)) {
    fail(
      'v1.21 Business switcher styling is missing: '
      + expected,
    );
  }
}

console.log(
  'BAJETBN v121 BUSINESS CONTEXT VERIFICATION PASS',
);
