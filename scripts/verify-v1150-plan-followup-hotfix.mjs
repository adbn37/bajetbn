import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

const goals =
  read(
    'src/features/goals/GoalsPage.tsx',
  );

const spaces =
  read(
    'src/features/spaces/SpacesPage.tsx',
  );

const details =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const lifecycle =
  read(
    'src/features/spaces/planSpaceLifecycle.ts',
  );

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

check(
  goals.includes(
    'listGoalContributionsForGoal'
  )
  && !goals.includes(
    'listGoalContributionsForGoal('
  )
  && goals.includes(
    'listGoalContributions(\n            user.uid'
  )
  && goals.includes(
    'targetGoalIds.has'
  ),
  'Legacy Personal marker is preserved while embedded Plan contributions use an owner-scoped query.',
);

check(
  goals.includes(
    "'Plan target'"
  )
  && goals.includes(
    "'Target & contributions'"
  )
  && goals.includes(
    'data-focused-plan-target-summary'
  ),
  'Embedded Plan workspace uses Plan-specific language.',
);

check(
  goals.includes(
    'focusedPlan={focusedPlan}'
  )
  && goals.includes(
    'Add contribution'
  )
  && goals.includes(
    'Edit target'
  )
  && goals.includes(
    'Set Plan target'
  ),
  'Focused Plan exposes one target workflow instead of another savings-goal list.',
);

check(
  lifecycle.includes(
    'listAllGoals(uid)'
  )
  && lifecycle.includes(
    'listGoalContributions(uid)'
  )
  && lifecycle.includes(
    'This Plan has saved contribution history. Archive it instead.'
  )
  && lifecycle.indexOf(
    "manageGoal("
  ) < lifecycle.indexOf(
    "manageSpace("
  ),
  'Unused Plan delete removes empty targets first and protects contribution history.',
);

check(
  spaces.includes(
    'deleteUnusedPlanSpace'
  )
  && spaces.includes(
    "space.type === 'goal'\n        && action === 'delete'"
  ),
  'Spaces card delete uses safe Plan deletion.',
);

check(
  details.includes(
    'deleteUnusedPlanSpace'
  )
  && details.includes(
    'Focused Plan'
  )
  && details.includes(
    "space.type === 'goal'\n        && dialog.action === 'delete'"
  ),
  'Plan details use focused identity and safe Settings deletion.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 PLAN FOLLOW-UP HOTFIX: PASS',
);
