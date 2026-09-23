import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const home =
  read('src/features/business/BusinessHomePage.tsx');

const mirror =
  read('src/features/business/AdbnTechMirrorWorkspace.tsx');

const payments =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

const purchases =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

need(
  home.includes(
    "| 'adbn_customers'",
  )
    && home.includes(
      "| 'adbn_invoices'",
    )
    && home.includes(
      "| 'adbn_payments'",
    )
    && home.includes(
      "| 'adbn_purchases'",
    )
    && !home.includes(
      "| 'adbn'",
    ),
  'Customers, Invoices, Payments and Purchases are normal Business workspace views.',
);

for (const [view, label] of [
  ['adbn_customers', 'Customers'],
  ['adbn_invoices', 'Invoices'],
  ['adbn_payments', 'Payments'],
  ['adbn_purchases', 'Purchases'],
]) {
  need(
    home.includes(
      `workspaceView === '${view}'`,
    )
      && home.includes(
        `setWorkspaceView('${view}')`,
      )
      && home.includes(
        `>\n              ${label}\n            </button>`,
      ),
    `${label} is a normal top-level Business navigation item.`,
  );
}

need(
  !home.includes(
    'data-adbn-tech-unified-workspace',
  )
    && !home.includes(
      'data-adbn-tech-workspace-tabs',
    )
    && !home.includes(
      'setAdbnTechWorkspaceTab',
    )
    && !home.includes(
      '>\n            ADBN TECH\n          </button>',
    ),
  'No parent ADBN TECH operational navigation remains.',
);

need(
  home.includes(
    'Refresh ADBN TECH',
  )
    && home.includes(
      'Disconnect ADBN TECH',
    )
    && home.includes(
      'refreshAdbnTechConnection',
    )
    && home.includes(
      'disconnectAdbnTechConnection',
    )
    && home.includes(
      'data-adbn-tech-connection',
    ),
  'Refresh and Disconnect live in Business Setup ADBN TECH Integration.',
);

for (const [label, source] of [
  ['Customers / Invoices', mirror],
  ['Payments', payments],
  ['Purchases', purchases],
]) {
  need(
    !source.includes(
      'disconnectAdbnTechReadOnly',
    )
      && !source.includes(
        'void disconnect()',
      )
      && !source.includes(
        "'Refreshing…' : 'Refresh'",
      )
      && !source.includes(
        "? 'Refreshing…'\n              : 'Refresh'",
      ),
    `${label} does not repeat Refresh / Disconnect controls.`,
  );
}

need(
  home.includes(
    '<AdbnTechPaymentsWorkspace',
  )
    && home.includes(
      'onFinancialSync={',
    )
    && home.includes(
      '<AdbnTechPurchasesWorkspace',
    )
    && home.includes(
      '<AdbnTechMirrorWorkspace',
    ),
  'Existing ADBN operational components remain wired normally.',
);

console.log(
  `ADBN TECH normal navigation and setup controls verification PASS (${checks.length} checks).`,
);
