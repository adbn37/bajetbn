import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const home =
  read('src/features/business/BusinessHomePage.tsx');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

need(
  home.includes(
    "| 'adbn'",
  )
    && !home.includes(
      "| 'adbn_customers'",
    )
    && !home.includes(
      "| 'adbn_invoices'",
    )
    && !home.includes(
      "| 'adbn_payments'",
    )
    && !home.includes(
      "| 'adbn_purchases'",
    ),
  'Business workspace uses one top-level ADBN TECH view.',
);

need(
  home.includes(
    "value === 'adbn_customers'",
  )
    && home.includes(
      "value === 'adbn_invoices'",
    )
    && home.includes(
      "value === 'adbn_payments'",
    )
    && home.includes(
      "value === 'adbn_purchases'",
    )
    && home.includes(
      "return 'adbn';",
    ),
  'Legacy ADBN workspace URLs remain backward-compatible.',
);

need(
  home.includes(
    'data-adbn-tech-unified-workspace',
  )
    && home.includes(
      'data-adbn-tech-workspace-tabs',
    )
    && home.includes(
      'setAdbnTechWorkspaceTab',
    ),
  'ADBN TECH renders one parent workspace with internal tab navigation.',
);

for (const label of [
  'Customers',
  'Invoices',
  'Payments',
  'Purchases',
]) {
  need(
    home.includes(
      `>${label}</button>`,
    )
      || home.includes(
        `>\n                ${label}\n              </button>`,
      ),
    `Unified ADBN TECH workspace includes ${label}.`,
  );
}

need(
  home.includes(
    'Open ADBN TECH workspace',
  )
    && home.includes(
      'Connection and integration setup lives here.',
    )
    && home.includes(
      'data-adbn-tech-connection',
    ),
  'Business Setup acts as the ADBN TECH integration control hub.',
);

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
  'Existing ADBN operational components remain wired into the unified workspace.',
);

console.log(
  `ADBN TECH unified workspace verification PASS (${checks.length} checks).`,
);
