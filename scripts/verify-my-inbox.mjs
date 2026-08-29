import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let checks = 0;

function fail(message) {
  throw new Error(message);
}

function read(file) {
  return fs.readFileSync(
    path.join(root, file),
    'utf8',
  );
}

function need(condition, message) {
  checks += 1;

  if (!condition) {
    fail(message);
  }
}

for (const file of [
  'src/pages/MyInboxPage.tsx',
  'src/repositories/myInboxRepository.ts',
]) {
  need(
    fs.existsSync(
      path.join(root, file),
    ),
    'Missing My Inbox file: ' + file,
  );
}

const repo =
  read(
    'src/repositories/myInboxRepository.ts',
  );

const page =
  read(
    'src/pages/MyInboxPage.tsx',
  );

const app =
  read(
    'src/app/App.tsx',
  );

const personalisation =
  read(
    'src/services/personalisation.ts',
  );

const css =
  read(
    'src/styles/global.css',
  );

for (const marker of [
  "collection(db, 'spaceMembers')",
  "collection(db, 'spaceApprovals')",
  "collection(db, 'sharedBillAssignments')",
  "collection(db, 'userNotifications')",
  'ACTION_NOTIFICATION_TYPES',
  "'space_mention'",
  "'record_mention'",
  "'space_reminder'",
  "'task_assignment'",
  "'contribution_request'",
  "kind: own ? 'approval_request' : 'approval_review'",
  "membership.role === 'owner' || membership.role === 'admin'",
  "assignment.memberUid !== input.uid",
  "targetPath: '/spaces/' + spaceId + '?tab=bills'",
  "approval.targetPath || ('/spaces/' + spaceId + '?tab=approvals')",
]) {
  need(
    repo.includes(marker),
    'My Inbox repository missing: ' + marker,
  );
}

for (const forbidden of [
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
  'writeBatch(',
  'httpsCallable(',
]) {
  need(
    !repo.includes(forbidden),
    'My Inbox must remain derived/read-only: '
      + forbidden,
  );
}

for (const marker of [
  'bajetbn:my-inbox-dismissed:v1',
  'dismissible',
  "filter === 'action'",
  "filter === 'waiting'",
  "filter === 'money'",
  'Completing the source record removes the item automatically.',
  'One source of truth.',
]) {
  need(
    page.includes(marker),
    'My Inbox page missing: ' + marker,
  );
}

need(
  app.includes(
    "const MyInboxPage = lazy(",
  ),
  'MyInboxPage lazy import missing.',
);

need(
  app.includes(
    '<Route path="inbox" element={<MyInboxPage />} />',
  ),
  'My Inbox route missing.',
);

need(
  personalisation.includes(
    "| 'inbox'",
  ),
  'My Inbox navigation ID missing.',
);

need(
  personalisation.includes(
    "id: 'inbox'",
  ),
  'My Inbox navigation item missing.',
);

need(
  personalisation.includes(
    "path: '/inbox'",
  ),
  'My Inbox navigation path missing.',
);

need(
  (
    personalisation.match(
      /^\s*inbox:\s*'[^']+',\s*$/gm,
    )
    || []
  ).length === 3,
  'All navigation icon maps must define Inbox.',
);

need(
  css.includes(
    '/* v1.7.0 My Inbox */',
  ),
  'My Inbox CSS marker missing.',
);

// ------------------------------------------------------------
// v1.11 mobile navigation contract
//
// Fixed mobile destinations:
// Home | Spaces | Add | More
//
// Notifications live in the responsive header.
// My Inbox remains available through the wider navigation/
// More experience and must not replace a fixed bottom item.
// ------------------------------------------------------------

const shell =
  read(
    'src/layouts/AppShell.tsx',
  );

const mobileClassIndex =
  shell.indexOf(
    'className="mobile-bottom-nav',
  );

need(
  mobileClassIndex >= 0,
  'Mobile bottom navigation class is missing.',
);

const mobileNavStart =
  shell.lastIndexOf(
    '<nav',
    mobileClassIndex,
  );

const mobileNavEnd =
  shell.indexOf(
    '</nav>',
    mobileClassIndex,
  );

need(
  mobileNavStart >= 0
    && mobileNavEnd > mobileNavStart,
  'Mobile bottom navigation section is missing.',
);

const mobileNavigation =
  shell.slice(
    mobileNavStart,
    mobileNavEnd
      + '</nav>'.length,
  );

const homeIndex =
  mobileNavigation.indexOf(
    '<small>Home</small>',
  );

const spacesIndex =
  mobileNavigation.indexOf(
    '<small>Spaces</small>',
  );

const addIndex =
  mobileNavigation.indexOf(
    'mobile-bottom-add',
  );

const moreIndex =
  mobileNavigation.indexOf(
    '<small>More</small>',
  );

need(
  homeIndex >= 0
    && spacesIndex > homeIndex
    && addIndex > spacesIndex
    && moreIndex > addIndex,
  'Mobile bottom navigation must be Home, Spaces, Add, More.',
);

need(
  mobileNavigation.includes(
    'to="/spaces"',
  ),
  'Mobile Spaces destination is missing.',
);

need(
  mobileNavigation.includes(
    "navigate('/?quick=1')",
  ),
  'Mobile Add action must open money activity.',
);

need(
  mobileNavigation.includes(
    'to="/more"',
  ),
  'Mobile More destination is missing.',
);

need(
  !mobileNavigation.includes(
    '<small>Activity</small>',
  )
    && !mobileNavigation.includes(
      'to="/transactions"',
    ),
  'Mobile Activity shortcut must remain removed.',
);

need(
  !mobileNavigation.includes(
    '<small>Business</small>',
  )
    && !mobileNavigation.includes(
      'businessPickerLoading',
    ),
  'Old Business bottom-nav destination must remain removed.',
);

need(
  !mobileNavigation.includes(
    '<small>Alerts</small>',
  )
    && !mobileNavigation.includes(
      'to="/notifications"',
    ),
  'Notifications must not consume a fixed bottom-nav destination.',
);

need(
  shell.includes(
    "navigate('/notifications')",
  ),
  'Responsive-header notification access is missing.',
);

need(
  shell.includes(
    '<NotificationBellIcon />',
  ),
  'Responsive notification bell is missing.',
);

need(
  !shell.includes(
    '<small>My Inbox</small>',
  ),
  'My Inbox must not replace the fixed mobile bottom navigation.',
);

console.log(
  'My Inbox verification passed ('
    + checks
    + ' structural checks): '
    + 'Inbox remains derived/read-only and mobile navigation '
    + 'uses Home, Spaces, Add, More.',
);