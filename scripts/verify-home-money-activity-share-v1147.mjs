import fs from 'node:fs';

const dashboard =
  fs.readFileSync(
    'src/pages/DashboardPage.tsx',
    'utf8',
  );

const transactions =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const share =
  fs.readFileSync(
    'src/services/transactionShare.ts',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
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

check(
  dashboard.includes(
    'listTransactionsForOwnerAccount',
  )
    && dashboard.includes(
      'Activity below follows this account',
    ),
  'Home Money Activity remains tied to the selected Account.',
);

check(
  dashboard.includes(
    'homeActivityTitle(',
  )
    && dashboard.includes(
      'homeActivityMeta(',
    ),
  'Home rows use meaningful compact transaction text.',
);

check(
  dashboard.includes(
    'home-v1147-activity-button',
  )
    && dashboard.includes(
      'openHomeActivityDetails(',
    ),
  'Entire Home activity row opens transaction details.',
);

check(
  dashboard.includes(
    'title="Money activity details"',
  )
    && dashboard.includes(
      'home-v1147-activity-detail-list',
    ),
  'Home uses a simple compact detail modal.',
);

check(
  dashboard.includes(
    'Share to WhatsApp',
  )
    && dashboard.includes(
      'shareTransactionToWhatsApp({',
    ),
  'Home transaction Details can share to WhatsApp.',
);

check(
  transactions.includes(
    'const [sharePrompt, setSharePrompt]',
  )
    && transactions.includes(
      'title="Money activity saved"',
    )
    && transactions.includes(
      'Share it to a WhatsApp contact or group if needed.',
    ),
  'Successful transaction save offers WhatsApp sharing.',
);

check(
  transactions.includes(
    'Share to WhatsApp',
  )
    && transactions.includes(
      'shareTransactionToWhatsApp({',
    ),
  'Full Money Activity Details also supports WhatsApp sharing.',
);

check(
  share.includes(
    'https://wa.me/?text=',
  )
    && share.includes(
      'Recorded in BajetBN',
    ),
  'WhatsApp chooser uses a prepared BajetBN summary.',
);

const publicTransactionPayload =
  share
    .split(
      'export interface PublicTransactionSharePayload',
    )[1]
    ?.split('}')[0]
  || '';

check(
  !publicTransactionPayload.includes('ownerId')
    && !publicTransactionPayload.includes('spaceId')
    && !publicTransactionPayload.includes('accountId')
    && !publicTransactionPayload.includes('transactionId'),
  'Public WhatsApp link payload exposes no internal record IDs.',
);

check(
  share.includes(
    'transactionId?: string',
  ),
  'Private runtime can request an authenticated Smart Share token.',
);

check(
  css.includes(
    '/* v1.14.7 Home Money Activity compact details */',
  )
    && css.includes(
      '.home-v1147-activity-detail-list',
    ),
  'Compact Home detail styling exists.',
);

/*
 * Explicit scope guard:
 * the separate main /transactions Personal-first behaviour
 * is NOT changed by this Home-focused slice.
 */
check(
  transactions.includes(
    'personalAccountIds',
  )
    && transactions.includes(
      "space.type !== 'sme'",
    ),
  'Main /transactions scope remains unchanged in this slice.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'Home Money Activity verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'HOME MONEY ACTIVITY + WHATSAPP VERIFICATION PASS',
);
