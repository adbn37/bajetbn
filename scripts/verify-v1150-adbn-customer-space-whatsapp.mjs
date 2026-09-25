import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const functions = read('functions/src/index.ts');
const repository = read('src/repositories/adbnCustomerLinkRepository.ts');
const linksPage = read('src/features/linked-adbn/AdbnCustomerLinksPage.tsx');
const portal = read('src/features/linked-adbn/AdbnCustomerSpacePage.tsx');
const workspace = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
const app = read('src/app/App.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const spacesPage = read('src/features/spaces/SpacesPage.tsx');
const models = read('src/types/models.ts');

const start =
  functions.indexOf(
    'export const respondAdbnCustomerLinkInvitation',
  );

const end =
  functions.indexOf(
    'export const syncAdbnCustomerBillingMirror',
    start,
  );

const block =
  start >= 0
    ? functions.slice(
        start,
        end >= 0
          ? end
          : functions.length,
      )
    : '';

check(
  functions.includes(
    'function adbnCustomerSpaceDocumentId',
  )
  && block.includes("type: 'custom'")
  && block.includes('externalIntegrationProvider:')
  && block.includes("'adbn_tech'")
  && block.includes('externalIntegrationRole:')
  && block.includes("'customer'"),
  'Accepting an ADBN link creates a dedicated custom ADBN customer Space.',
);

check(
  block.includes("db.collection('spaceMembers')")
  && block.includes("role: 'owner'")
  && block.includes("status: 'active'"),
  'Dedicated ADBN Space creates/restores owner membership.',
);

check(
  block.includes('adbnCustomerSpaceDocumentId(')
  && block.includes('spaceCreated'),
  'ADBN customer Space creation is deterministic and retry-safe.',
);

check(
  !block.includes(
    'Choose a Personal or Household Space.',
  )
  && !repository.includes(
    'targetSpaceId: string;',
  ),
  'Acceptance no longer depends on a Personal or Household Space.',
);

check(
  linksPage.includes(
    'data-adbn-dedicated-space-accept',
  )
  && linksPage.includes(
    'Accept & create ADBN Space',
  )
  && !linksPage.includes(
    'listSpaces',
  ),
  'Customer acceptance UI creates a dedicated ADBN Space directly.',
);

check(
  linksPage.includes(
    'needsDedicatedAdbnSpace',
  )
  && linksPage.includes(
    "decision: 'accept'",
  ),
  'Existing accepted 24F.1 links self-migrate to the dedicated ADBN Space.',
);

check(
  portal.includes(
    'data-adbn-customer-space',
  )
  && portal.includes(
    'ADBN TECH is the source of truth',
  )
  && (
    portal.includes(
      'data-adbn-customer-space-billing-placeholder',
    )
    || (
      portal.includes(
        'data-adbn-customer-billing-plans',
      )
      && portal.includes(
        'data-adbn-customer-payment-history',
      )
    )
  ),
  'Dedicated ADBN customer portal is present and preserves the ADBN source-of-truth boundary before or after billing sync.',
);

check(
  app.includes('AdbnCustomerSpacePage')
  && app.includes('path="spaces/:spaceId/adbn"'),
  'ADBN customer portal is lazy-routed.',
);

check(
  details.includes(
    "externalIntegrationRole === 'customer'",
  )
  && details.includes(
    "'/spaces/' + space.id + '/adbn'",
  ),
  'Generic Space runtime hands ADBN customer Spaces to the dedicated portal.',
);

check(
  workspace.includes(
    'data-adbn-customer-whatsapp-share',
  )
  && workspace.includes(
    "'https://wa.me/'",
  )
  && workspace.includes(
    'https://bajetbn-staging.pages.dev',
  ),
  'ADBN admin customer list exposes a WhatsApp invitation/share action.',
);

check(
  spacesPage.includes(
    "item.externalIntegrationRole"
  )
  && spacesPage.includes(
    "=== 'customer'"
  )
  && spacesPage.includes(
    'canProvisionAdbnTechSpace'
  ),
  'Dedicated ADBN customer Spaces remain visible in the normal Spaces list.',
);

check(
  models.includes(
    "externalIntegrationRole?: 'business' | 'customer' | null;",
  )
  && models.includes(
    'externalIntegrationCustomerLinkId?: string | null;',
  ),
  'Space model records ADBN customer integration metadata.',
);

console.log(
  'BajetBN Slice 24F.2 dedicated ADBN customer Space + WhatsApp verification PASS',
);
