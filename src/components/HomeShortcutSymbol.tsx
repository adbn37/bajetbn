/** Simple cohesive outline icon family for Home shortcuts. Visual only. */
const iconPaths: Record<string, string> = {
  trips: 'M3 17l8-4 7-9 2 2-7 9-4 7-3 1 1-6-4-2-1-4Z',
  bills: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6',
  receipt: 'M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3Zm3 5h8M8 12h8',
  budgets: 'M4 20v-8h4v8M10 20V5h4v15M16 20v-11h4v11M3 20h18',
  recurring: 'M20 7v5h-5M4 17v-5h5M5.7 9a7 7 0 0 1 12-2L20 12M4 12l2.3 4a7 7 0 0 0 12-2',
  subscription: 'M3 9l4.5 4 4.5-7 4.5 7L21 9l-2 10H5L3 9Zm2 12h14',
  accounts: 'M3 9l9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18',
  reports: 'M5 20V13h3v7M10.5 20V9h3v11M16 20V4h3v16M3 21h18',
  debt: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12',
  goals: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 5 7-7',
  inbox: 'M4 4h16v12l-3 4H7l-3-4V4Zm0 11h5l1 2h4l1-2h5',
};

export function HomeShortcutSymbol({ id, fallback }: { id: string; fallback: string }) {
  if (id.startsWith('space:')) {
    return <span className="bajetbn-v3-space-glyph">{fallback}</span>;
  }
  const d = iconPaths[id];
  if (!d) {
    return <span className="bajetbn-v3-space-glyph">{fallback}</span>;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
