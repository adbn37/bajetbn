import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(
    file,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const details =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const goals =
  read(
    'src/features/goals/GoalsPage.tsx',
  );

const css =
  read(
    'src/styles/global.css',
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

check(
  details.includes(
    'data-plan-workspace-navigation'
  )
  && details.includes(
    'aria-label="Plan workspace sections"'
  ),
  'Focused Plan has one persistent workspace navigation row.',
);

for (const destination of [
  'Overview',
  'Target',
  'Calendar',
  'Activity',
  'Settings',
]) {
  check(
    details.includes(
      `          ${destination}`
    )
    || details.includes(
      `            ${destination}`
    ),
    `Plan navigation exposes ${destination}.`,
  );
}

check(
  details.includes(
    "to={`/spaces/${space.id}?section=goals`}"
  )
  && details.includes(
    "to={`/spaces/${space.id}?section=calendar`}"
  )
  && details.includes(
    "to={`/spaces/${space.id}?tab=activity`}"
  )
  && details.includes(
    "to={`/spaces/${space.id}?tab=settings`}"
  ),
  'Plan navigation routes to the existing target, calendar, activity and settings workspaces.',
);

check(
  details.includes(
    "space.ownerId === user?.uid"
  ),
  'Plan Settings navigation remains owner-only.',
);

check(
  details.includes(
    "&& space.type !== 'goal'"
  ),
  'Legacy generic Space tabs no longer duplicate Plan navigation.',
);

check(
  !details.includes(
    'className="panel plan-space-actions-v115"'
  )
  && !details.includes(
    'aria-label="Plan actions"'
  ),
  'Redundant Plan tools card grid is removed.',
);

check(
  !details.includes(
`          >
            Plan home
          </Link>`
  ),
  'Calendar no longer needs a redundant Plan home button.',
);

check(
  details.includes(
    "section === 'goals'"
  )
  && details.includes(
    "section === 'calendar'"
  )
  && details.includes(
    'data-focused-plan-home'
  ),
  'Existing Plan Overview, Target and Calendar content remains intact.',
);

check(
  goals.includes(
    "'Target & contributions'"
  )
  && goals.includes(
    'data-focused-plan-target-summary'
  )
  && goals.includes(
    'Add contribution'
  ),
  'Plan target and contribution workflow remains unchanged.',
);

check(
  css.includes(
    'BAJETBN V115 PLAN WORKSPACE NAVIGATION'
  )
  && css.includes(
    '.plan-workspace-tabs-v115'
  )
  && !css.includes(
    '.plan-space-action-grid-v115'
  ),
  'Plan navigation styling replaces the removed action grid.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 PLAN WORKSPACE NAVIGATION: PASS',
);
