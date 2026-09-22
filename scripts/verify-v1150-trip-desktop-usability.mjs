import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(
    file,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const page =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const centre =
  read(
    'src/features/spaces/TripCommandCentre.tsx',
  );

const css =
  read(
    'src/styles/global.css',
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
  !page.includes(
    'trip-workbook-toolbar-v115'
  )
  && !page.includes(
    'trip-workbook-status-v115'
  ),
  'Trip workbook removes low-value internal top and bottom chrome.',
);

check(
  page.indexOf(
    'className="trip-workbook-tabs-v115"'
  )
  < page.indexOf(
    'className="trip-workbook-sheet-body-v115"'
  ),
  'Trip sheet shortcuts remain at the top.',
);

check(
  !centre.includes(
    'Open Trip Money'
  )
  && !centre.includes(
    '<th>Action</th>'
  )
  && !centre.includes(
    'onOpenSheet'
  ),
  'Overview no longer duplicates the sheet shortcuts.',
);

check(
  centre.includes(
    'trip-overview-attention-v115'
  )
  && centre.includes(
    '<strong>Needs setup</strong>'
  ),
  'Overview setup guidance is condensed into one line.',
);

check(
  css.includes(
    'BAJETBN V115 TRIP DESKTOP USABILITY POLISH'
  )
  && css.includes(
    'font-size: .82rem;'
  )
  && css.includes(
    'min-height: 46px;'
  ),
  'Desktop Trip tabs and worksheet controls use a larger readable scale.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP DESKTOP USABILITY: PASS',
);
