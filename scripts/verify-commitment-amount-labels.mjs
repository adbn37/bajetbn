import fs from 'node:fs';

const file = 'src/features/commitments/CommitmentsPage.tsx';
const source = fs.readFileSync(file, 'utf8');

const required = [
  'Amount due each cycle (BND)',
  'The amount normally due for every billing period.',
  'Total commitment amount (BND)',
  'The full purchase, loan, or instalment-plan amount.',
  'Instalment amount per cycle (BND)',
  'The scheduled amount due for each weekly or monthly payment.',
  'Amount paid now (BND)',
  'Remaining balance before payment',
  'Remaining balance after payment',
  'Total commitment amount must be at least the instalment amount per cycle.',
];

for (const text of required) {
  if (!source.includes(text)) {
    throw new Error(`Missing commitment amount wording: ${text}`);
  }
}

const forbidden = [
  '<label>Payment amount (BND)',
  '<label>Total amount (BND)',
  '<label>Amount (BND)',
  'Instalment total must be at least one payment amount.',
];

for (const text of forbidden) {
  if (source.includes(text)) {
    throw new Error(`Old or unclear commitment wording remains: ${text}`);
  }
}

console.log('Commitment amount label checks passed.');
