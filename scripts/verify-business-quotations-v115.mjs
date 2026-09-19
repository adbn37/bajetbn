import fs from 'node:fs';

const files = {
  home: fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  ),
  app: fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  ),
  models: fs.readFileSync(
    'src/types/models.ts',
    'utf8',
  ),
  repo: fs.readFileSync(
    'src/repositories/businessQuotationRepository.ts',
    'utf8',
  ),
  page: fs.readFileSync(
    'src/features/business/BusinessQuotationsPage.tsx',
    'utf8',
  ),
  functions: fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  ),
  css: fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  ),
};

const checks = [
  [
    files.home,
    'Sales & Documents',
    'Sales & Documents Business workspace exists',
  ],
  [
    files.home,
    'business/quotations',
    'Quotation link exists',
  ],
  [
    files.app,
    'BusinessQuotationsPage',
    'Quotation route exists',
  ],
  [
    files.models,
    'BusinessQuotationStatus',
    'Quotation model exists',
  ],
  [
    files.repo,
    'convertBusinessQuotationToInvoice',
    'Quotation conversion client exists',
  ],
  [
    files.page,
    'New Quotation',
    'Quotation UI exists',
  ],
  [
    files.page,
    'Convert to Invoice',
    'Quotation conversion UI exists',
  ],
  [
    files.functions,
    'export const getBusinessQuotationWorkspace',
    'Quotation workspace callable exists',
  ],
  [
    files.functions,
    'export const createBusinessQuotation',
    'Quotation create callable exists',
  ],
  [
    files.functions,
    'export const updateBusinessQuotation',
    'Quotation update callable exists',
  ],
  [
    files.functions,
    'export const setBusinessQuotationStatus',
    'Quotation status callable exists',
  ],
  [
    files.functions,
    'export const convertBusinessQuotationToInvoice',
    'Quotation conversion callable exists',
  ],
  [
    files.functions,
    "status:\n              'converted'",
    'Conversion marks quotation converted',
  ],
  [
    files.functions,
    'sourceQuotationId',
    'Invoice keeps quotation traceability',
  ],
  [
    files.css,
    'BAJETBN V115 BUSINESS QUOTATIONS',
    'Quotation styles exist',
  ],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log(
    (ok ? 'PASS ' : 'FAIL ')
      + label,
  );
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Business quotations verifier: PASS',
);
