import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const work =
  read('src/features/spaces/SpaceWorkPanel.tsx');

const collaboration =
  read('src/features/collaboration/CollaborationPage.tsx');

const trip =
  read('src/features/spaces/TripCommandCentre.tsx');

const shared =
  read('src/features/spaces/SharedExpensesPanel.tsx');

const checks = [
  [
    hub,
    "shopping: space.type === 'sme' ? 'Purchase List' : 'To-Buy'",
    'Hub Purchase List title',
  ],
  [
    hub,
    'label="Purchase List"',
    'Hub Purchase List shortcut',
  ],
  [
    hub,
    "balances: space.type === 'trip' ? 'Settle Up' : 'Settlements'",
    'Trip-only Hub title',
  ],
  [
    hub,
    'label="Settle Up"',
    'Trip Settle Up shortcut',
  ],

  [
    work,
    "'Purchase List item added.'",
    'Purchase List save message',
  ],
  [
    work,
    "? 'Purchase List'",
    'Purchase List labels',
  ],
  [
    work,
    "? '+ Add item'",
    'Purchase List Add item',
  ],
  [
    work,
    'No items on the Purchase List yet.',
    'Purchase List empty guidance',
  ],

  [
    collaboration,
    'const pendingInvitations',
    'Pending invitations',
  ],
  [
    collaboration,
    'const invitationHistory',
    'Invitation history',
  ],
  [
    collaboration,
    '<details className="invitation-history">',
    'Collapsed invite history',
  ],
  [
    collaboration,
    'Copy invite link',
    'Copy invite preserved',
  ],
  [
    collaboration,
    'WhatsApp',
    'WhatsApp preserved',
  ],
  [
    collaboration,
    'Cancel invite',
    'Cancel invite preserved',
  ],

  [
    collaboration,
    'const hasBill = commitments.length > 0;',
    'Share Bill bill prerequisite',
  ],
  [
    collaboration,
    'const hasAnotherMember = members.length > 1;',
    'Share Bill member prerequisite',
  ],
  [
    collaboration,
    'to="/bills"',
    'Add Bill action',
  ],
  [
    collaboration,
    'onClick={onInviteMember}',
    'Invite Member action',
  ],
  [
    collaboration,
    '>Share a bill</button>',
    'Share Bill action',
  ],

  [
    trip,
    'members and Settle Up',
    'Trip command terminology',
  ],
  [
    trip,
    'Settle Up',
    'Trip Settle Up action',
  ],
  [
    shared,
    "space.type === 'trip' ? 'Settle Up' : 'Settlements'",
    'Trip-only balance title',
  ],
];

let failures = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) failures += 1;
}

if (
  hub.includes(
    "shopping: space.type === 'sme' ? 'Procurement",
  )
) {
  console.error(
    'FAIL old SME Procurement Hub label remains.',
  );

  failures += 1;
}

if (
  work.includes(
    "'Procurement / To-Buy'",
  )
) {
  console.error(
    'FAIL old SME Procurement / To-Buy label remains.',
  );

  failures += 1;
}

if (!hub.includes('label="Settlements"')) {
  console.error(
    'FAIL non-Trip Settlements shortcut was removed.',
  );

  failures += 1;
}

if (failures > 0) {
  console.error(
    `Slice 5 verifier failed: ${failures}`,
  );

  process.exit(1);
}

console.log(
  'Slice 5 Space UX verifier: PASS',
);
