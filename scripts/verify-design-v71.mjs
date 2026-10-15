#!/usr/bin/env node
/** Read-only static check for BajetBN Phase 7.1. */
import fs from 'node:fs';
import path from 'node:path';

const pathName = path.resolve('src/pages/DashboardPage.tsx');
if (!fs.existsSync(pathName)) throw new Error('Run from the BajetBN repository root.');
const content = fs.readFileSync(pathName,'utf8');
const requireContains = (s) => {if (!content.includes(s)) throw new Error('Missing Phase 7.1 behavior: '+s.slice(0,80));};
const requireAbsent = (s) => {if (content.includes(s)) throw new Error('Original synchronous effect still present: '+s.slice(0,80));};
for (const text of [
  'const homePreferenceOwnerId = user?.uid || null',
  'HOME_SHORTCUT_STORAGE_PREFIX + homePreferenceOwnerId',
  'return () => { active = false; };',
  'window.requestAnimationFrame(() => {',
  'setActiveAccountIndex(nextIndex);',
  'const accountActivityRequestRef = useRef(0);',
  'accountActivityRequestRef.current !== requestId',
  'if (active) void loadAccounts();',
  'if (active) void loadAccountActivity(activeAccount?.id || null);',
  'if (active) void openQuickActivity();',
  'HOME_SHORTCUT_DEFAULTS',
  'getPreferredHomeAccountId',
  'listTransactionsForOwnerAccount',
]) requireContains(text);
for (const text of [
  '  useEffect(() => {\n    void loadAccounts();\n  }, [',
  '  useEffect(() => {\n    void loadAccountActivity(\n      activeAccount?.id || null,',
  '  useEffect(() => {\n    if (!user) {\n      setHomeShortcutIds(',
]) requireAbsent(text);
const markers = content.match(/BAJETBN_PHASE71_HOME_HOOKS/g) || [];
if (markers.length !== 6) throw new Error(`Expected 6 Phase 7.1 change anchors; found ${markers.length}.`);
console.log('Phase 7.1 Home hooks: PASS (static checks only).');
console.log('Run the lint regression audit, typecheck, build and browser smoke tests separately.');
