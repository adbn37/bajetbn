import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const pos =
  read(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  );

const home =
  read(
    'src/features/spaces/SmeOperationalAttentionPanel.tsx',
  );

const failures = [];

function check(ok, label) {
  if (ok) {
    console.log('PASS:', label);
  } else {
    console.error('FAIL:', label);
    failures.push(label);
  }
}

const marketplaceStart =
  hub.indexOf(
    "{space.type === 'sme' && businessIndustry === 'marketplace'",
  );

const retailStart =
  hub.indexOf(
    "{space.type === 'sme' && businessIndustry === 'retail'",
  );

const nav =
  marketplaceStart >= 0
  && retailStart > marketplaceStart
    ? hub.slice(
        marketplaceStart,
        retailStart,
      )
    : '';

check(
  nav.includes('label="POS"')
  && nav.includes('label="Listings"')
  && nav.includes('label="Sellers"')
  && nav.includes('label="Payouts"')
  && nav.includes('label="Purchase List"')
  && nav.includes('label="More"'),
  'Marketplace Space navigation is correct.',
);

check(
  !nav.includes('label="Money"'),
  'Marketplace primary navigation does not duplicate Money.',
);

check(
  pos.includes("listings: 'Listings'")
  && pos.includes("payouts: 'Payouts'"),
  'Marketplace uses Listings and Payouts terminology.',
);

check(
  pos.includes("['register', 'sales']"),
  'Marketplace POS is focused on Register and Sales.',
);

check(
  !pos.includes("bookings: 'Bookings'")
  && !pos.includes("tab === 'bookings'")
  && !pos.includes('SmePosReservationsPanel')
  && !pos.includes('SmePosCreateReservationModal')
  && !pos.includes('setBookingForm')
  && !pos.includes('Reserve / take deposit'),
  'Marketplace Bookings UI is removed.',
);

check(
  pos.includes('Pending seller payouts')
  && pos.includes('Payout history')
  && pos.includes('partial payout'),
  'Dedicated seller Payouts workspace exists.',
);

check(
  pos.includes('Total payable')
  && pos.includes('Awaiting payout')
  && pos.includes('Shop commission'),
  'Seller payout summary exists.',
);

check(
  pos.includes('sellerHasProtectedHistory')
  && pos.includes("'Settle first'")
  && pos.includes("'Remove seller'")
  && pos.includes("'Delete permanently'"),
  'Seller removal protection exists.',
);

check(
  !pos.includes('Seller wallet ·'),
  'Seller payable is no longer called a wallet.',
);

check(
  home.includes('Marketplace overview')
  && home.includes('Sales today')
  && home.includes('Seller payable')
  && home.includes('Shop commission')
  && home.includes('Active listings')
  && home.includes('Active seller profiles'),
  'Marketplace Space Home metrics exist.',
);

check(
  home.includes('/pos?tab=listings')
  && home.includes('/pos?tab=payouts'),
  'Marketplace attention links open Listings and Payouts.',
);

check(
  home.includes('todaySalesMinor')
  && home.includes('todayCommissionMinor')
  && home.includes('sellerCount')
  && home.includes('activeListings'),
  'Marketplace operational metrics are calculated.',
);

if (failures.length) {
  throw new Error(
    `Marketplace POS v1.14.8 verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'MARKETPLACE POS v1.14.8 VERIFIER: PASS',
);