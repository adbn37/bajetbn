export type AccountColor =
  | 'purple'
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'rose'
  | 'slate';

export const ACCOUNT_COLOR_OPTIONS: Array<{
  value: AccountColor;
  label: string;
}> = [
  { value: 'purple', label: 'Purple' },
  { value: 'blue', label: 'Blue' },
  { value: 'teal', label: 'Teal' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'rose', label: 'Rose' },
  { value: 'slate', label: 'Slate' },
];

interface AccountVisualPreferences {
  colors: Record<string, AccountColor>;
  homeAccountId?: string;
}

const STORAGE_PREFIX =
  'bajetbn.account-visuals.v1:';

const FALLBACK_COLORS: AccountColor[] =
  ACCOUNT_COLOR_OPTIONS.map((item) => item.value);

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

function isAccountColor(
  value: unknown,
): value is AccountColor {
  return ACCOUNT_COLOR_OPTIONS.some(
    (item) => item.value === value,
  );
}

function readPreferences(
  uid: string,
): AccountVisualPreferences {
  if (!uid || typeof window === 'undefined') {
    return { colors: {} };
  }

  try {
    const raw =
      window.localStorage.getItem(
        storageKey(uid),
      );

    if (!raw) {
      return { colors: {} };
    }

    const parsed =
      JSON.parse(raw) as Partial<AccountVisualPreferences>;

    const colors: Record<string, AccountColor> = {};

    Object.entries(
      parsed.colors || {},
    ).forEach(([accountId, value]) => {
      if (isAccountColor(value)) {
        colors[accountId] = value;
      }
    });

    return {
      colors,
      homeAccountId:
        typeof parsed.homeAccountId === 'string'
          ? parsed.homeAccountId
          : undefined,
    };
  } catch {
    return { colors: {} };
  }
}

function writePreferences(
  uid: string,
  value: AccountVisualPreferences,
) {
  if (!uid || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      storageKey(uid),
      JSON.stringify(value),
    );
  } catch {
    // Visual preferences are non-critical.
  }
}

export function getAccountColor(
  uid: string,
  accountId: string,
  fallbackIndex = 0,
): AccountColor {
  const saved =
    readPreferences(uid).colors[accountId];

  if (saved) {
    return saved;
  }

  return FALLBACK_COLORS[
    Math.abs(fallbackIndex)
      % FALLBACK_COLORS.length
  ];
}

export function setAccountColor(
  uid: string,
  accountId: string,
  color: AccountColor,
) {
  const current = readPreferences(uid);

  writePreferences(uid, {
    ...current,
    colors: {
      ...current.colors,
      [accountId]: color,
    },
  });
}

export function accountColorClass(
  color: AccountColor,
) {
  return `account-color-${color}`;
}

export function getPreferredHomeAccountId(
  uid: string,
) {
  return readPreferences(uid).homeAccountId || '';
}

export function setPreferredHomeAccountId(
  uid: string,
  accountId: string,
) {
  const current = readPreferences(uid);

  writePreferences(uid, {
    ...current,
    homeAccountId: accountId,
  });
}
