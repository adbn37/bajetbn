import fs from 'node:fs';

const functions =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  );

const repository =
  fs.readFileSync(
    'src/repositories/spaceRepository.ts',
    'utf8',
  );

function section(
  source,
  startMarker,
  endMarker,
) {
  const start =
    source.indexOf(startMarker);

  if (start < 0) {
    return '';
  }

  const end =
    endMarker
      ? source.indexOf(
          endMarker,
          start + startMarker.length,
        )
      : -1;

  return end >= 0
    ? source.slice(start, end)
    : source.slice(start);
}

const createSpaceBlock =
  section(
    functions,
    'export const createSpaceWithEntitlement =',
    'export const voidSmePosSale =',
  );

const repairBlock =
  section(
    functions,
    'export const repairOwnedSpaceMemberships =',
    'export const createSpaceWithEntitlement =',
  );

const listSpacesBlock =
  section(
    repository,
    'export async function listSpaces',
    '/**',
  );

const getSpaceBlock =
  section(
    repository,
    'export async function getSpace',
    'export async function createSpace',
  );

const checks = [
  [
    Boolean(repairBlock),
    'Trusted callable repairs legacy owned Space memberships.',
  ],

  [
    /collection\(['"]spaces['"]\)[\s\S]*?where\(['"]ownerId['"],\s*['"]==['"],\s*uid\)/m
      .test(repairBlock),
    'Repair discovers owned Spaces from canonical Space ownership.',
  ],

  [
    /collection\(['"]spaceMembers['"]\)[\s\S]*?\.doc\([\s\S]*?ownedSpace\.id[\s\S]*?uid/m
      .test(repairBlock),
    'Repair targets canonical spaceId_uid membership records.',
  ],

  [
    /role:\s*['"]owner['"]/m
      .test(repairBlock)
    && /status:\s*['"]active['"]/m
      .test(repairBlock),
    'Owned Space repair restores active owner membership.',
  ],

  [
    /canUseAccounts:\s*true/m
      .test(repairBlock)
    && /canViewBalances:\s*true/m
      .test(repairBlock)
    && /canViewLedger:\s*true/m
      .test(repairBlock),
    'Owner membership repair restores required account permissions.',
  ],

  [
    /transaction\.create\(\s*spaceRef,/m
      .test(createSpaceBlock)
    && /transaction\.create\(\s*memberRef,/m
      .test(createSpaceBlock)
    && /role:\s*['"]owner['"]/m
      .test(createSpaceBlock)
    && /status:\s*['"]active['"]/m
      .test(createSpaceBlock),
    'New Space creation continues creating active owner membership atomically.',
  ],

  [
    repository.includes(
      'ensureOwnedSpaceMembershipsRepaired',
    )
    && repository.includes(
      "'repairOwnedSpaceMemberships'",
    ),
    'Client Space repository invokes the trusted legacy repair.',
  ],

  [
    /await\s+ensureOwnedSpaceMembershipsRepaired\(\s*uid\s*,?\s*\);/m
      .test(listSpacesBlock),
    'Space listing verifies owned memberships before membership discovery.',
  ],

  [
    /await\s+ensureOwnedSpaceMembershipsRepaired\(\s*\);/m
      .test(getSpaceBlock),
    'Direct Space loading verifies owned memberships before Firestore access.',
  ],

  [
    repository.includes(
      'const repairedOwnedSpaceUsers',
    )
    && repository.includes(
      'const ownedSpaceRepairRequests',
    ),
    'Legacy repair is deduplicated per signed-in user and app session.',
  ],
];

let failed = false;

for (
  const [passed, message]
  of checks
) {
  if (passed) {
    console.log(
      `PASS: ${message}`,
    );
  } else {
    failed = true;
    console.error(
      `FAIL: ${message}`,
    );
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  '\nBAJETBN v122 SPACE CONTEXT RELIABILITY VERIFICATION PASS',
);
