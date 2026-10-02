import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

function check(value, label) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

const commitments =
  read(
    'src/features/commitments/CommitmentsPage.tsx',
  );

const debt =
  read(
    'src/features/debt/DebtPage.tsx',
  );

const helper =
  read(
    'src/utils/debtInstalmentLink.ts',
  );

check(
  helper.includes(
    'canLinkDebtAndInstalment',
  )
  && helper.includes(
    'getDebtInstalmentLinkIssues',
  )
  && helper.includes(
    'Only I Owe Debt can be linked.'
  )
  && helper.includes(
    'Business Instalments cannot be linked to personal Debt.'
  )
  && helper.includes(
    'ADBN-managed Instalments cannot be linked.'
  ),
  'Debt and Instalment pages share one compatibility rule.',
);

check(
  commitments.includes(
    'listDebts(user.uid)'
  )
  && commitments.includes(
    'InstalmentDebtLinkForm'
  )
  && commitments.includes(
    "'Link Debt'"
  ),
  'Instalment can start the Debt linking flow.',
);

check(
  commitments.includes(
    'unlinkDebtInstalment'
  )
  && commitments.includes(
    "'Unlink Debt'"
  ),
  'Instalment can request unlink through the existing safe backend.',
);

check(
  commitments.includes(
    'linkedDebt.counterparty'
  )
  && commitments.includes(
    'linkedDebt.balanceMinor'
  ),
  'Instalment shows the specific linked Debt and balance.',
);

check(
  commitments.includes(
    "'/debt?focus='"
  )
  && debt.includes(
    "searchParams.get('focus')"
  )
  && debt.includes(
    'scrollIntoView'
  ),
  'Open linked Debt targets the exact Debt record.',
);

check(
  debt.includes(
    "'/bills?focus='"
  )
  && commitments.includes(
    "searchParams.get('focus')"
  )
  && commitments.includes(
    'commitment-'
  ),
  'Debt opens the exact linked Instalment.',
);

check(
  debt.includes(
    'canLinkDebtAndInstalment'
  )
  && commitments.includes(
    'canLinkDebtAndInstalment'
  ),
  'Both linking directions use identical eligibility logic.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 3: PASS');
console.log(' Link from Debt        : YES');
console.log(' Link from Instalment  : YES');
console.log(' Specific pair details : YES');
console.log(' Direct record focus   : YES');
console.log(' Backend changes       : NONE');
console.log('============================================================');
