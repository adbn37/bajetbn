export type IconPack = 'classic' | 'rounded' | 'minimal' | 'retro';
export type SurfaceStyle = 'solid' | 'soft' | 'glass';
export type WallpaperStyle = 'none' | 'dots' | 'grid' | 'waves' | 'stars';
export type NavigationId =
  | 'overview'
  | 'spaces'
  | 'accounts'
  | 'transactions'
  | 'recurring'
  | 'budgets'
  | 'goals'
  | 'bills'
  | 'calendar'
  | 'search'
  | 'offline-sync'
  | 'reports';

export interface NavigationItem {
  id: NavigationId;
  path: string;
  label: string;
  icon: string;
  protected?: boolean;
}

export interface PersonalisationSettings {
  iconPack: IconPack;
  surfaceStyle: SurfaceStyle;
  wallpaperStyle: WallpaperStyle;
  navigationOrder: NavigationId[];
  hiddenNavigation: NavigationId[];
  pinnedNavigation: NavigationId[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'overview', path: '/', label: 'Overview', icon: '⌂', protected: true },
  { id: 'spaces', path: '/spaces', label: 'Spaces', icon: '◫', protected: true },
  { id: 'accounts', path: '/accounts', label: 'Accounts', icon: '◉' },
  { id: 'transactions', path: '/transactions', label: 'Money activity', icon: '↔' },
  { id: 'recurring', path: '/recurring', label: 'Recurring money', icon: '↻' },
  { id: 'budgets', path: '/budgets', label: 'Budgets', icon: '▤' },
  { id: 'goals', path: '/goals', label: 'Goals', icon: '◇' },
  { id: 'bills', path: '/bills', label: 'Bills & instalments', icon: '◷' },
  { id: 'calendar', path: '/calendar', label: 'Calendar', icon: '▦' },
  { id: 'search', path: '/search', label: 'Search', icon: '⌕' },
  { id: 'offline-sync', path: '/offline-sync', label: 'Offline & sync', icon: '⇅' },
  { id: 'reports', path: '/reports', label: 'Money reports', icon: '⌁' },
];

const ALL_NAVIGATION_IDS = NAVIGATION_ITEMS.map((item) => item.id);

export const RECOMMENDED_NAVIGATION_ORDER: NavigationId[] = [
  'overview',
  'spaces',
  'transactions',
  'accounts',
  'budgets',
  'bills',
  'search',
  'recurring',
  'goals',
  'calendar',
  'reports',
  'offline-sync',
];

export const RECOMMENDED_HIDDEN_NAVIGATION: NavigationId[] = [
  'recurring',
  'goals',
  'calendar',
  'reports',
  'offline-sync',
];
const ICON_PACKS: IconPack[] = ['classic', 'rounded', 'minimal', 'retro'];
const SURFACE_STYLES: SurfaceStyle[] = ['solid', 'soft', 'glass'];
const WALLPAPER_STYLES: WallpaperStyle[] = ['none', 'dots', 'grid', 'waves', 'stars'];
const STORAGE_PREFIX = 'bajetbn:personalisation:';
export const PERSONALISATION_EVENT = 'bajetbn:personalisation-changed';

const ICONS: Record<IconPack, Partial<Record<NavigationId, string>>> = {
  classic: {},
  rounded: {
    overview: '●',
    spaces: '▦',
    accounts: '◉',
    transactions: '↕',
    recurring: '⟳',
    budgets: '▣',
    goals: '◆',
    bills: '◴',
    calendar: '▦',
    search: '⌕',
    'offline-sync': '⇅',
    reports: '◌',
  },
  minimal: {
    overview: 'H',
    spaces: 'S',
    accounts: 'A',
    transactions: 'M',
    recurring: 'R',
    budgets: 'B',
    goals: 'G',
    bills: 'D',
    calendar: 'C',
    search: 'Q',
    'offline-sync': '↕',
    reports: 'R',
  },
  retro: {
    overview: '★',
    spaces: '▧',
    accounts: '¢',
    transactions: '↔',
    recurring: '⟳',
    budgets: '▤',
    goals: '♦',
    bills: '◴',
    calendar: '▥',
    search: '⌕',
    'offline-sync': '⇵',
    reports: '▨',
  },
};

export function defaultPersonalisation(): PersonalisationSettings {
  return {
    iconPack: 'classic',
    surfaceStyle: 'solid',
    wallpaperStyle: 'none',
    navigationOrder: [...RECOMMENDED_NAVIGATION_ORDER],
    hiddenNavigation: [...RECOMMENDED_HIDDEN_NAVIGATION],
    pinnedNavigation: [],
  };
}

function validNavigationIds(value: unknown): NavigationId[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<NavigationId>(ALL_NAVIGATION_IDS);
  return Array.from(new Set(value.filter((item): item is NavigationId =>
    typeof item === 'string' && known.has(item as NavigationId))));
}

export function sanitizePersonalisation(value: Partial<PersonalisationSettings> | null | undefined): PersonalisationSettings {
  const defaults = defaultPersonalisation();
  const orderSource = Array.isArray(value?.navigationOrder)
    ? value.navigationOrder
    : defaults.navigationOrder;
  const order = validNavigationIds(orderSource);
  ALL_NAVIGATION_IDS.forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });

  const protectedIds = new Set(NAVIGATION_ITEMS.filter((item) => item.protected).map((item) => item.id));
  const hiddenSource = Array.isArray(value?.hiddenNavigation)
    ? value.hiddenNavigation
    : defaults.hiddenNavigation;
  const hidden = validNavigationIds(hiddenSource).filter((id) => !protectedIds.has(id));
  const pinned = validNavigationIds(value?.pinnedNavigation).filter((id) => !hidden.includes(id));

  return {
    iconPack: ICON_PACKS.includes(value?.iconPack as IconPack) ? value!.iconPack as IconPack : defaults.iconPack,
    surfaceStyle: SURFACE_STYLES.includes(value?.surfaceStyle as SurfaceStyle) ? value!.surfaceStyle as SurfaceStyle : defaults.surfaceStyle,
    wallpaperStyle: WALLPAPER_STYLES.includes(value?.wallpaperStyle as WallpaperStyle) ? value!.wallpaperStyle as WallpaperStyle : defaults.wallpaperStyle,
    navigationOrder: order,
    hiddenNavigation: hidden,
    pinnedNavigation: pinned,
  };
}

export function loadPersonalisation(uid: string): PersonalisationSettings {
  if (!uid || typeof window === 'undefined') return defaultPersonalisation();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${uid}`);
    return sanitizePersonalisation(raw ? JSON.parse(raw) as Partial<PersonalisationSettings> : null);
  } catch {
    return defaultPersonalisation();
  }
}

export function applyPersonalisation(settings: PersonalisationSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.iconPack = settings.iconPack;
  root.dataset.surfaceStyle = settings.surfaceStyle;
  root.dataset.wallpaperStyle = settings.wallpaperStyle;
}

export function savePersonalisation(uid: string, value: PersonalisationSettings): PersonalisationSettings {
  const next = sanitizePersonalisation(value);
  applyPersonalisation(next);
  if (uid && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(next));
    } catch {
      // The current session still receives the style even when local storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(PERSONALISATION_EVENT, { detail: { uid, settings: next } }));
  }
  return next;
}

export function orderedNavigation(settings: PersonalisationSettings): NavigationItem[] {
  const byId = new Map(NAVIGATION_ITEMS.map((item) => [item.id, item]));
  const hidden = new Set(settings.hiddenNavigation);
  const pinned = new Set(settings.pinnedNavigation);
  const ordered = settings.navigationOrder
    .map((id) => byId.get(id))
    .filter((item): item is NavigationItem => Boolean(item))
    .filter((item) => !hidden.has(item.id));

  return [
    ...ordered.filter((item) => pinned.has(item.id)),
    ...ordered.filter((item) => !pinned.has(item.id)),
  ];
}

export function navigationIcon(pack: IconPack, id: NavigationId, fallback: string): string {
  return ICONS[pack][id] || fallback;
}

export function isProtectedNavigation(id: NavigationId): boolean {
  return Boolean(NAVIGATION_ITEMS.find((item) => item.id === id)?.protected);
}
