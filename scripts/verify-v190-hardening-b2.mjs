import fs from 'node:fs';

const source =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  );

let failed = 0;

function check(
  condition,
  label,
) {
  console.log(
    `${condition ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!condition) {
    failed += 1;
  }
}

check(
  source.includes(
    'async function assertBasicSmeCapacityInTransaction',
  ),
  'transactional SME capacity helper',
);

check(
  source.includes(
    "doc(`sme_${spaceId}_${kind}`)",
  ),
  'shared SME capacity lock',
);

check(
  source.includes(
    "kind === 'inventory'",
  ),
  'inventory limit branch',
);

check(
  source.includes(
    "kind === 'customers'",
  ),
  'customer limit branch',
);

check(
  source.includes(
    "kind === 'sellers'",
  ),
  'seller limit branch',
);

check(
  source.includes(
    'additionalMembers',
  )
  && source.includes(
    'pendingInvitations',
  ),
  'SME member plus pending invite count',
);

const atomicMarker =
  'assertBasicSmeCapacityInTransaction(';

const atomicCount =
  source.split(atomicMarker).length - 1;

check(
  atomicCount === 9,
  `atomic capacity markers (${atomicCount}/9)`,
);

const inventoryCalls =
  (
    source.match(
      /'inventory',\n\s*\);/g,
    )
    || []
  ).length;

check(
  inventoryCalls === 4,
  `inventory guards (${inventoryCalls}/4)`,
);

const customerCalls =
  (
    source.match(
      /'customers',\n\s*\);/g,
    )
    || []
  ).length;

check(
  customerCalls === 1,
  `customer guard (${customerCalls}/1)`,
);

const sellerCalls =
  (
    source.match(
      /'sellers',\n\s*\);/g,
    )
    || []
  ).length;

check(
  sellerCalls === 1,
  `seller guard (${sellerCalls}/1)`,
);

const memberCallPattern =
  /'members',[\s\S]{0,120}?\);/g;

const memberCalls =
  (
    source.match(memberCallPattern)
    || []
  ).length;

check(
  memberCalls === 2,
  `invite guards (${memberCalls}/2)`,
);

check(
  source.includes(
    'document.id !== ignoredInvitationId',
  ),
  'current accepted invitation excluded',
);

check(
  source.includes(
    'version: version + 1',
  ),
  'capacity lock increments',
);

check(
  source.includes(
    'await assertBasicSmeInventoryCapacity(',
  ),
  'fast inventory precheck preserved',
);

check(
  source.includes(
    'await assertBasicSmeCustomerCapacity(',
  ),
  'fast customer precheck preserved',
);

check(
  source.includes(
    'await assertBasicSmeSellerCapacity(',
  ),
  'fast seller precheck preserved',
);

check(
  source.includes(
    'await assertBasicSmeAdditionalMemberCapacity(',
  ),
  'fast member precheck preserved',
);

if (failed > 0) {
  console.error(
    `v1.9.0 Hardening B2 failed: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'v1.9.0 Hardening B2 verifier: PASS',
);
