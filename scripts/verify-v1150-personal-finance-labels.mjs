import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(
    path,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const nav =
  read(
    'src/services/personalisation.ts',
  );

const money =
  read(
    'src/features/transactions/TransactionsPage.tsx',
  );

const budgets =
  read(
    'src/features/budgets/BudgetsPage.tsx',
  );

const goals =
  read(
    'src/features/goals/GoalsPage.tsx',
  );

const calendar =
  read(
    'src/features/calendar/CalendarPage.tsx',
  );

const reports =
  read(
    'src/features/reports/ReportsPage.tsx',
  );

function check(
  value,
  label,
) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

for (const marker of [
  "{ id: 'transactions', path: '/transactions', label: 'Money'",
  "{ id: 'accounts', path: '/accounts', label: 'Accounts'",
  "{ id: 'budgets', path: '/budgets', label: 'Budgets'",
  "{ id: 'bills', path: '/bills', label: 'Bills & instalments'",
  "{ id: 'recurring', path: '/recurring', label: 'Recurring money'",
  "{ id: 'debt', path: '/debt', label: 'Debt'",
  "{ id: 'goals', path: '/goals', label: 'Goals'",
  "{ id: 'calendar', path: '/calendar', label: 'Calendar'",
  "{ id: 'reports', path: '/reports', label: 'Money reports'",
]) {
  check(
    nav.includes(marker),
    `Sidebar definition preserved: ${marker}`,
  );
}

check(
  money.includes(
    'title="Money"'
  )
  && money.includes(
    'eyebrow="Personal finance"'
  )
  && money.includes(
    'Business money stays inside Business Spaces.'
  ),
  'Money page matches the global Personal finance navigation.',
);

check(
  budgets.includes(
    "title={embedded ? 'Budget' : 'Budgets'}"
  ),
  'Global Budgets title matches the sidebar while embedded Budget wording is preserved.',
);

check(
  goals.includes(
`        focusedPlan
          ? 'Target & contributions'
          : embedded
            ? 'Savings goals'
            : 'Goals'`
  ),
  'Global Goals title matches the sidebar while Plan/embedded wording is preserved.',
);

check(
  calendar.includes(
    'title="Calendar"'
  )
  && !calendar.includes(
    'title="Calendar & reminders"'
  ),
  'Calendar title matches the sidebar.',
);

check(
  reports.includes(
    '<span className="reports-v110-kicker">Personal finance</span>'
  )
  && reports.includes(
    '<h1>Money reports</h1>'
  ),
  'Money reports title matches the sidebar.',
);

check(
  reports.includes(
    'Business money stays inside its Business Space.'
  ),
  'Money reports still states the Personal/Business scope boundary.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 PERSONAL FINANCE LABEL CONSISTENCY: PASS',
);
