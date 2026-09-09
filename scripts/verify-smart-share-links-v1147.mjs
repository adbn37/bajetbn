import fs from 'node:fs';

const app =
  fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  );

const page =
  fs.readFileSync(
    'src/features/commitments/PublicBillSharePage.tsx',
    'utf8',
  );

const service =
  fs.readFileSync(
    'src/services/billShare.ts',
    'utf8',
  );

const commitments =
  fs.readFileSync(
    'src/features/commitments/CommitmentsPage.tsx',
    'utf8',
  );

const rules =
  fs.readFileSync(
    'firestore.rules',
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
  app.includes(
    'path="/share/bill"',
  ),
  'Public bill route exists.',
);

check(
  app.indexOf('path="/share/bill"')
    < app.indexOf(
      '<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>',
    ),
  'Shared bill route is outside authentication guard.',
);

check(
  commitments.includes(
    'Share to WhatsApp',
  ),
  'Bill page exposes WhatsApp sharing.',
);

check(
  service.includes(
    'https://wa.me/?text=',
  ),
  'WhatsApp uses recipient/group chooser.',
);

check(
  service.includes(
    '/share/bill#',
  ),
  'Public summary is stored in URL fragment.',
);

for (
  const forbidden of [
    'accountId',
    'ownerId',
    'spaceId',
    'note:',
    'receipt',
    'transactionId',
  ]
) {
  check(
    !service
      .split(
        'export interface PublicBillSharePayload',
      )[1]
      .split('}')[0]
      .includes(forbidden),
    `Public payload excludes ${forbidden}.`,
  );
}

check(
  page.includes(
    'Create free account',
  ),
  'Indirect signup invitation exists.',
);

check(
  page.includes(
    'No bank-account details',
  ),
  'Privacy explanation is shown.',
);

check(
  !rules.includes(
    'publicBillShares',
  ),
  'No public Firestore collection was added.',
);

console.log('');
console.log(
  'BAJETBN v1.14.7 SMART SHARE LINKS - VERIFIED',
);
