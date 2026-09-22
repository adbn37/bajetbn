import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

function check(value, label) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

check(
  home.includes(
    "=== 'zardeerwandy@gmail.com'"
  ),
  'ADBN TECH connection is tied to the requested BajetBN account email.',
);

check(
  home.includes(
    'const canManageAdbnTechConnection ='
  )
  && home.includes(
    'isOwner'
  ),
  'ADBN TECH access still requires Business ownership.',
);

check(
  home.includes(
    '{canManageAdbnTechConnection && ('
  )
  && home.includes(
    'data-adbn-tech-connection'
  ),
  'ADBN TECH connection card is hidden from other accounts.',
);

check(
  home.includes(
    '!canManageAdbnTechConnection'
  )
  && home.includes(
    'prepareAdbnTechIntegration'
  ),
  'Prepare action is also guarded by the same account check.',
);

check(
  !home.includes(
    "=== 'bajetbn@gmail.com'"
  ),
  'Old BajetBN email is not used for this integration.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 ADBN TECH EMAIL VISIBILITY: PASS',
);
