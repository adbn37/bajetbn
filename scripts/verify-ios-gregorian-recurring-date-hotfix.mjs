import fs from 'node:fs';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    ).replace(
      /\r\n/g,
      '\n',
    );

const recurring =
  read(
    'src/features/recurring/RecurringTransactionsPage.tsx',
  );

const css =
  read(
    'src/styles/global.css',
  );

const pkg =
  JSON.parse(
    read(
      'package.json',
    ),
  );

const failures = [];

function check(
  condition,
  label,
) {
  if (condition) {
    console.log(
      'PASS:',
      label,
    );

    return;
  }

  console.error(
    'FAIL:',
    label,
  );

  failures.push(
    label,
  );
}

check(
  recurring.includes(
    "calendar: 'gregory'",
  )
    && recurring.includes(
      "numberingSystem: 'latn'",
    )
    && recurring.includes(
      "'en-BN-u-ca-gregory-nu-latn'",
    ),
  'Recurring dates explicitly use the Gregorian calendar.',
);

check(
  !recurring.includes(
    'type="date"',
  ),
  'Recurring Money no longer depends on native date inputs.',
);

check(
  (
    recurring.match(
      /<GregorianDateField/g,
    )
    || []
  ).length >= 3,
  'Add, edit and resume recurring flows use Gregorian date controls.',
);

check(
  recurring.includes(
    'The next date cannot be before today.',
  )
    && recurring.includes(
      'The end date must be on or after the next date.',
    ),
  'Date boundary validation remains enforced.',
);

check(
  recurring.includes(
    'Gregorian calendar',
  )
    && recurring.includes(
      'No end date',
    ),
  'Date controls clearly identify Gregorian dates and optional end date.',
);

check(
  css.includes(
    '/* HOTFIX: iOS Gregorian recurring date controls */',
  )
    && css.includes(
      '.gregorian-date-selects',
    ),
  'Gregorian date controls have responsive styling.',
);

check(
  Boolean(
    pkg.scripts[
      'verify:ios-gregorian-recurring-date-hotfix'
    ],
  ),
  'iOS Gregorian date hotfix verifier is registered.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'iOS Gregorian recurring-date hotfix verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  '============================================================',
);

console.log(
  ' IOS GREGORIAN RECURRING DATE HOTFIX: PASS',
);

console.log(
  '============================================================',
);
