import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const mirror =
  read('src/features/business/AdbnTechMirrorWorkspace.tsx');

const adbnRepo =
  read('src/repositories/adbnTechIntegrationRepository.ts');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

need(
  mirror.includes(
    'data-adbn-tech-invoice-filters',
  )
    && mirror.includes(
      'invoiceStatusFilter',
    )
    && mirror.includes(
      'invoicePaymentFilter',
    )
    && mirror.includes(
      'invoiceSaleTypeFilter',
    )
    && mirror.includes(
      'invoiceDateFilter',
    ),
  'ADBN invoice mirror exposes status, payment, sale-type and date filters.',
);

need(
  mirror.includes(
    'Outstanding',
  )
    && mirror.includes(
      'Unpaid',
    )
    && mirror.includes(
      'Partially paid',
    )
    && mirror.includes(
      'Paid',
    ),
  'Payment-state filters cover outstanding, unpaid, partial and paid invoices.',
);

need(
  mirror.includes(
    'Invoiced today',
  )
    && mirror.includes(
      'This month',
    )
    && mirror.includes(
      'Overdue',
    ),
  'Date filters cover today, current month and overdue receivables.',
);

need(
  mirror.includes(
    'data-adbn-tech-invoice-quick-filters',
  )
    && mirror.includes(
      "setInvoiceDateFilter(\n                  'overdue',",
    )
    && mirror.includes(
      '>\n              Overdue\n            </button>',
    ),
  'Overdue is available as a direct one-tap invoice quick filter.',
);

need(
  mirror.includes(
    '>\n              Outstanding\n            </button>',
  )
    && mirror.includes(
      '>\n              Unpaid\n            </button>',
    )
    && mirror.includes(
      '>\n              Partially paid\n            </button>',
    )
    && mirror.includes(
      '>\n              Paid\n            </button>',
    )
    && mirror.includes(
      '>\n              This Month\n            </button>',
    ),
  'Invoice quick filters expose common receivables views.',
);

need(
  mirror.includes(
    'visibleInvoiceOutstanding',
  )
    && mirror.includes(
      'Showing {invoices.length}',
    ),
  'Filtered receivables show visible count and outstanding balance.',
);

need(
  mirror.includes(
    'invoicePaymentState(item)',
  )
    && mirror.includes(
      'Clear filters',
    ),
  'Invoice rows expose payment state and filters can be reset.',
);

need(
  mirror.includes(
    'Record Payment uses the authenticated ADBN TECH callable',
  )
    && mirror.includes(
      'syncAdbnTechPaymentToBajetBn',
    )
    && mirror.includes(
      'ADBN TECH remains the source of truth',
    ),
  'Invoice write-back uses the verified secured ADBN payment contract while ADBN remains authoritative.',
);

for (const forbidden of [
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
]) {
  need(
    !adbnRepo.includes(forbidden),
    `ADBN mirror repository stays read-only: ${forbidden}`,
  );
}

console.log(
  `ADBN TECH invoice filtering verification PASS (${checks.length} checks).`,
);
