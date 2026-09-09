import fs from 'node:fs';

const app =
  fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  );

const page =
  fs.readFileSync(
    'src/features/transactions/PublicTransactionSharePage.tsx',
    'utf8',
  );

const service =
  fs.readFileSync(
    'src/services/transactionShare.ts',
    'utf8',
  );

const rules =
  fs.readFileSync(
    'firestore.rules',
    'utf8',
  );

const failures = [];

function check(
  condition,
  label,
) {
  if (condition) {
    console.log(
      'PASS: ' + label,
    );
    return;
  }

  console.error(
    'FAIL: ' + label,
  );

  failures.push(label);
}

const protectedRoute =
  app.indexOf(
    '<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>',
  );

check(
  app.includes(
    'path="/share/transaction"',
  ),
  'Public transaction route exists.',
);

check(
  app.indexOf(
    'path="/share/transaction"',
  ) < protectedRoute,
  'Public transaction route is outside authentication.',
);

check(
  service.includes(
    '/share/transaction#',
  ),
  'Public transaction summary uses URL fragment.',
);

check(
  service.includes(
    'View details:',
  )
    && service.includes(
      'buildTransactionShareUrl(',
    ),
  'WhatsApp message includes BajetBN transaction link.',
);

check(
  service.includes(
    'https://wa.me/?text=',
  ),
  'WhatsApp keeps recipient or group chooser.',
);

const payload =
  service
    .split(
      'export interface PublicTransactionSharePayload',
    )[1]
    ?.split('}')[0]
  || '';

for (
  const forbidden of [
    'ownerId',
    'spaceId',
    'accountId',
    'transactionId',
    'note',
    'sourceAccountName',
    'destinationAccountName',
    'receipt',
    'balance',
  ]
) {
  check(
    !payload.includes(
      forbidden,
    ),
    'Public payload excludes '
      + forbidden
      + '.',
  );
}

check(
  payload.includes(
    'spaceName',
  )
    && payload.includes(
      'category',
    )
    && payload.includes(
      'transactionDate',
    )
    && payload.includes(
      'amountMinor',
    ),
  'Public payload keeps useful safe context.',
);

check(
  page.includes(
    'Create free account',
  )
    && page.includes(
      'Sign in',
    ),
  'Public page invites recipient to BajetBN.',
);

check(
  page.includes(
    'source=shared-transaction',
  ),
  'Signup source is preserved.',
);

check(
  page.includes(
    'No bank-account details',
  )
    && page.includes(
      'private notes',
    )
    && page.includes(
      'internal IDs',
    ),
  'Public page explains privacy.',
);

check(
  !rules.includes(
    'publicTransactionShares',
  ),
  'No public transaction Firestore collection exists.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'Transaction public share verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'TRANSACTION PUBLIC SHARE LINK VERIFICATION PASS',
);
