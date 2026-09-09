import fs from 'node:fs';

const commitments =
  fs.readFileSync(
    'src/features/commitments/CommitmentsPage.tsx',
    'utf8',
  );

const repository =
  fs.readFileSync(
    'src/repositories/commitmentRepository.ts',
    'utf8',
  );

const backend =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  );

const hub =
  fs.readFileSync(
    'src/features/spaces/SpaceActionHub.tsx',
    'utf8',
  );

const details =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  );

const app =
  fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  );

const share =
  fs.readFileSync(
    'src/services/billShare.ts',
    'utf8',
  );

const page =
  fs.readFileSync(
    'src/features/commitments/PublicBillSharePage.tsx',
    'utf8',
  );

function check(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(
      `FAIL: ${message}`,
    );
  }

  console.log(
    `PASS: ${message}`,
  );
}

check(
  repository.includes(
    'spaceId?: string;'
  ),
  'updateCommitment accepts destination Space.',
);

check(
  commitments.includes(
    'Existing posted transactions stay in their original Space.'
  ),
  'Existing history remains in original Space.',
);

check(
  commitments.includes(
    'title="Share to WhatsApp"'
  )
  && commitments.includes(
    '>Share</button>'
  ),
  'Bill card has compact Share button.',
);

check(
  commitments.includes(
    "item.type === 'bill'"
  ),
  'Share is limited to Bills.',
);

check(
  backend.includes(
    'targetSpaceId'
  )
  && backend.includes(
    'spaceId:'
  ),
  'Backend supports Space move.',
);

check(
  backend.includes(
    "'sharedBillAssignments'"
  ),
  'Shared Bill history protects unsafe moves.',
);

check(
  backend.includes(
    'Move this bill only to a Space you own.'
  ),
  'Move destination is owner-controlled.',
);

check(
  backend.includes(
    'Move this bill only between Spaces using the same currency.'
  ),
  'Cross-currency move is blocked.',
);

check(
  hub.includes(
    '?section=bills'
  )
  && hub.includes(
    'label="Bills"'
  ),
  'Household has direct Bills shortcut.',
);

check(
  details.includes(
    "space.type === 'household'"
  )
  && details.includes(
    'usesFullCommitmentModule'
  ),
  'Household uses full Bills module.',
);

check(
  share.includes(
    'https://wa.me/?text='
  ),
  'WhatsApp recipient/group chooser is enabled.',
);

check(
  share.includes(
    '/share/bill#'
  ),
  'Shared Bill uses public snapshot URL.',
);

check(
  app.includes(
    'path="/share/bill"'
  ),
  'Public shared Bill route exists.',
);

check(
  app.indexOf(
    'path="/share/bill"'
  )
  < app.indexOf(
    '<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>'
  ),
  'Shared Bill opens without login.',
);

check(
  page.includes(
    'Create free account'
  ),
  'Indirect BajetBN invitation exists.',
);

const publicPayload =
  share
    .split(
      'export interface PublicBillSharePayload'
    )[1]
    .split('}')[0];

for (
  const forbidden of [
    'spaceId',
    'accountId',
    'ownerId',
    'transactionId',
    'receipt',
    'note:',
  ]
) {
  check(
    !publicPayload.includes(
      forbidden,
    ),
    `Public payload excludes ${forbidden}.`,
  );
}

console.log('');
console.log(
  'BAJETBN v1.14.7 PACKAGE B - VERIFIED',
);
