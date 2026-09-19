import fs from 'node:fs';

const files = {
  app: fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  ),
  home: fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  ),
  quotePage: fs.readFileSync(
    'src/features/business/BusinessQuotationsPage.tsx',
    'utf8',
  ),
  quoteRepo: fs.readFileSync(
    'src/repositories/businessQuotationRepository.ts',
    'utf8',
  ),
  orderPage: fs.readFileSync(
    'src/features/business/BusinessSalesOrdersPage.tsx',
    'utf8',
  ),
  orderRepo: fs.readFileSync(
    'src/repositories/businessSalesOrderRepository.ts',
    'utf8',
  ),
  models: fs.readFileSync(
    'src/types/models.ts',
    'utf8',
  ),
  functions: fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  ),
};

const checks = [
  [files.models, 'BusinessSalesOrderStatus', 'Sales Order model exists'],
  [files.app, 'BusinessSalesOrdersPage', 'Sales Order route exists'],
  [files.home, '/business/sales-orders', 'Sales Order hub card is active'],
  [files.quoteRepo, 'convertBusinessQuotationToSalesOrder', 'Quotation to Sales Order client exists'],
  [files.quotePage, 'Create Sales Order', 'Quotation conversion choice exists'],
  [files.quotePage, 'Skip Sales Order · Convert to Invoice', 'Direct quotation-to-invoice remains available'],
  [files.orderRepo, 'getBusinessSalesOrderWorkspace', 'Sales Order repository exists'],
  [files.orderPage, 'Confirm Sales Order', 'Sales Order confirmation UI exists'],
  [files.orderPage, 'Convert to Invoice', 'Sales Order invoice conversion UI exists'],
  [files.functions, 'export const getBusinessSalesOrderWorkspace', 'Sales Order workspace callable exists'],
  [files.functions, 'export const convertBusinessQuotationToSalesOrder', 'Quotation to Sales Order callable exists'],
  [files.functions, 'export const setBusinessSalesOrderStatus', 'Sales Order status callable exists'],
  [files.functions, 'export const convertBusinessSalesOrderToInvoice', 'Sales Order to Invoice callable exists'],
  [files.functions, 'sourceSalesOrderId', 'Invoice retains Sales Order traceability'],
  [files.functions, "status:\n              'invoiced'", 'Sales Order is marked invoiced after conversion'],
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
  'Business Sales Orders verifier: PASS',
);
