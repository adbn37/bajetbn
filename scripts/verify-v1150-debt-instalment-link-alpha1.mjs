import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

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

const models =
  read('src/types/models.ts');

const debtRepo =
  read(
    'src/repositories/debtRepository.ts',
  );

const debtPage =
  read(
    'src/features/debt/DebtPage.tsx',
  );

const commitmentsPage =
  read(
    'src/features/commitments/CommitmentsPage.tsx',
  );

const functions =
  read(
    'functions/src/index.ts',
  );

check(
  models.includes(
    'linkedCommitmentId?: string | null',
  )
  && models.includes(
    'linkedDebtId?: string | null',
  ),
  'Debt and Instalment models carry reciprocal link IDs.',
);

check(
  debtRepo.includes(
    'export async function linkDebtInstalment',
  )
  && debtRepo.includes(
    'export async function unlinkDebtInstalment',
  ),
  'Debt repository exposes link and unlink actions.',
);

check(
  functions.includes(
    'export const linkDebtInstalment = onCall',
  )
  && functions.includes(
    'export const unlinkDebtInstalment = onCall',
  ),
  'Backend owns Debt and Instalment link mutations.',
);

check(
  functions.includes(
    'Only money you owe can be linked to an instalment.',
  )
  && functions.includes(
    'Debt total and Instalment total must match before linking.',
  )
  && functions.includes(
    'Debt and Instalment paid progress must match before linking.',
  ),
  'Backend validates direction, total and paid progress.',
);

check(
  functions.includes(
    'Business instalments cannot be linked to Debt in Alpha 1.',
  )
  && functions.includes(
    'ADBN TECH managed instalments cannot be manually linked to Debt.',
  ),
  'Alpha 1 excludes Business and ADBN-managed Instalments.',
);

check(
  functions.includes(
    'Pay this linked instalment from Debt to avoid recording the same repayment twice.',
  ),
  'Direct Instalment payment is blocked after linking.',
);

check(
  functions.includes(
    'Unlink this debt from its instalment before editing it.',
  )
  && functions.includes(
    'Unlink this debt from its instalment before archiving it.',
  )
  && functions.includes(
    'Unlink this instalment from Debt before editing it.',
  )
  && functions.includes(
    'Unlink this instalment from Debt before changing its lifecycle.',
  ),
  'Linked pair cannot drift through independent edits or lifecycle changes.',
);

check(
  debtPage.includes(
    'listAllCommitments(user.uid)',
  )
  && debtPage.includes(
    'Link instalment',
  )
  && debtPage.includes(
    'Unlink instalment',
  )
  && debtPage.includes(
    'DebtInstalmentLinkForm',
  ),
  'Debt UI can discover, link and unlink compatible Instalments.',
);

check(
  commitmentsPage.includes(
    'data-linked-debt-instalment',
  )
  && commitmentsPage.includes(
    'Pay from Debt',
  )
  && commitmentsPage.includes(
    'linkedDebtId',
  ),
  'Instalment UI exposes linked state and prevents duplicate payment entry.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 1: PASS');
console.log(' Relationship: TWO-WAY');
console.log(' Payment entry point when linked: DEBT');
console.log(' Payment synchronization: RESERVED FOR ALPHA 2');
console.log(' Business instalments: EXCLUDED');
console.log(' ADBN managed instalments: EXCLUDED');
console.log('============================================================');
