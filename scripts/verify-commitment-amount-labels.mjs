import fs from 'node:fs';

const file = 'src/features/commitments/CommitmentsPage.tsx';
const source = fs.readFileSync(file, 'utf8');

const required = [
  'Amount due each cycle (BND)',
  'The amount you normally pay each time this bill is due.',
  'Full instalment total (BND)',
  'The full amount you need to pay from start to finish.',
  'Instalment amount per cycle (BND)',
  'The amount you normally pay each time.',
  'Amount paid now (BND)',
  'Amount left before payment',
  'Amount left after payment',
  'The full instalment total must be the same as or more than one payment.',
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
  'Total commitment amount (BND)',
  'Remaining balance before payment',
  'Remaining balance after payment',
];

for (const text of forbidden) {
  if (source.includes(text)) {
    throw new Error(`Old or unclear commitment wording remains: ${text}`);
  }
}

console.log('Commitment amount label checks passed.');
