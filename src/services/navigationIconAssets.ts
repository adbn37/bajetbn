/** Phase 10.4: visual-only navigation icon mapping. No accounts, routes or transactions. */
const iconNames: Readonly<Record<string, string>> = {
  "trips": "plane",
  "bills": "bill",
  "receipt": "receipt",
  "budgets": "chart",
  "recurring": "repeat",
  "subscription": "subscription",
  "accounts": "wallet",
  "reports": "chart",
  "debt": "coins",
  "goals": "target",
  "inbox": "nav:inbox",
  "spaces": "nav:spaces",
  "calendar": "calendar",
  "search": "nav:search",
  "documents": "invoice",
  "settings": "nav:settings",
  "plus": "nav:plus",
  "logout": "nav:logout",
  "add": "nav:add",
  "move": "nav:move",
  "activity": "nav:activity",
};

export function navigationIconSrc(id: string): string {
  const key = id.startsWith('space:') ? 'spaces' : id;
  const asset = iconNames[key] || 'nav:spaces';
  return asset.startsWith('nav:')
    ? `/navigation-icons-v104/${asset.slice(4)}.svg`
    : `/category-icons-v102/${asset}.svg`;
}
