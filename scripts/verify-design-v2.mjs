import fs from 'node:fs';
const main=fs.readFileSync('src/main.tsx','utf8');
const css=fs.readFileSync('src/styles/design-combined-v2.css','utf8');
const home=fs.readFileSync('src/pages/DashboardPage.tsx','utf8');
const assertions={
  'Phase 1 stylesheet imported': main.includes("import './styles/design-combined-v1.css';"),
  'Phase 2 stylesheet imported': main.includes("import './styles/design-combined-v2.css';"),
  'Home remains scoped': home.includes('bajetbn-design-combined-v1'),
  'Account/Space switch targeted': css.includes('.bajetbn-home-mode-overview-v116'),
  'Amount display uses tabular figures': css.includes('font-variant-numeric: tabular-nums'),
  'Money modal targeted': css.includes('.bajetbn-reference-activity-form'),
  'Reduced-motion respected': css.includes('prefers-reduced-motion: reduce'),
};
for(const [label,pass] of Object.entries(assertions))console.log(`${pass?'PASS':'FAIL'} ${label}`);
if(Object.values(assertions).some(pass=>!pass))process.exitCode=1;
else console.log('Phase 2 structural check PASS (not a visual/runtime test)');
