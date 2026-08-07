import type { Appearance } from '../types/models';

export type SelectableAppearance = Exclude<Appearance, 'dark'>;
export type ThemePreset = Exclude<SelectableAppearance, 'system'>;

export interface ThemeOption {
  value: SelectableAppearance;
  label: string;
  labelMs: string;
  description: string;
  descriptionMs: string;
}

export const themeOptions: readonly ThemeOption[] = [
  {
    value: 'system',
    label: 'System Default',
    labelMs: 'Ikut Sistem',
    description: 'Follow this device.',
    descriptionMs: 'Ikut tetapan peranti ini.',
  },
  {
    value: 'black',
    label: 'Black',
    labelMs: 'Hitam',
    description: 'Near-black with teal accents.',
    descriptionMs: 'Hampir hitam dengan aksen teal.',
  },
  {
    value: 'light',
    label: 'Light',
    labelMs: 'Cerah',
    description: 'Warm, bright and clean.',
    descriptionMs: 'Cerah, lembut dan bersih.',
  },
  {
    value: 'pink-white',
    label: 'Pink & White',
    labelMs: 'Merah Jambu & Putih',
    description: 'Bright with soft pink accents.',
    descriptionMs: 'Cerah dengan aksen merah jambu.',
  },
  {
    value: 'black-pink',
    label: 'Black & Pink',
    labelMs: 'Hitam & Merah Jambu',
    description: 'Dark with vivid pink accents.',
    descriptionMs: 'Gelap dengan aksen merah jambu.',
  },
  {
    value: 'midnight-teal',
    label: 'Midnight Teal',
    labelMs: 'Teal Tengah Malam',
    description: 'Deep teal night theme.',
    descriptionMs: 'Tema malam teal gelap.',
  },
  {
    value: 'navy-blue',
    label: 'Navy Blue',
    labelMs: 'Biru Navy',
    description: 'Deep navy with blue accents.',
    descriptionMs: 'Biru navy gelap dengan aksen biru.',
  },
  {
    value: 'forest-green',
    label: 'Forest Green',
    labelMs: 'Hijau Hutan',
    description: 'Dark green with fresh highlights.',
    descriptionMs: 'Hijau gelap dengan sorotan segar.',
  },
  {
    value: 'royal-purple',
    label: 'Royal Purple',
    labelMs: 'Ungu Diraja',
    description: 'Deep purple with bright accents.',
    descriptionMs: 'Ungu gelap dengan aksen cerah.',
  },
  {
    value: 'sand-cream',
    label: 'Sand & Cream',
    labelMs: 'Pasir & Krim',
    description: 'Warm neutral colours.',
    descriptionMs: 'Warna neutral yang lembut.',
  },
  {
    value: 'slate-grey',
    label: 'Slate Grey',
    labelMs: 'Kelabu Batu',
    description: 'Calm charcoal-grey appearance.',
    descriptionMs: 'Tema kelabu arang yang tenang.',
  },
  {
    value: 'ocean-blue',
    label: 'Ocean Blue',
    labelMs: 'Biru Laut',
    description: 'Deep ocean colours.',
    descriptionMs: 'Warna laut yang dalam.',
  },
  {
    value: 'high-contrast',
    label: 'High Contrast',
    labelMs: 'Kontras Tinggi',
    description: 'Strong contrast and visible focus.',
    descriptionMs: 'Kontras kuat dan fokus yang jelas.',
  },
];

const selectableAppearances = new Set<string>(
  themeOptions.map((item) => item.value),
);

export function normalizeAppearance(
  value: unknown,
): SelectableAppearance {
  if (value === 'dark') return 'black';

  if (
    typeof value === 'string'
    && selectableAppearances.has(value)
  ) {
    return value as SelectableAppearance;
  }

  return 'black';
}

export function resolveTheme(
  appearance: Appearance | string | null | undefined,
  systemTheme: 'black' | 'light',
): ThemePreset {
  const normalized = normalizeAppearance(appearance);

  if (normalized === 'system') {
    return systemTheme;
  }

  return normalized;
}

export const themeBrowserColors: Record<ThemePreset, string> = {
  black: '#030708',
  light: '#f5f3ee',
  'pink-white': '#fff7fb',
  'black-pink': '#080508',
  'midnight-teal': '#041112',
  'navy-blue': '#07101f',
  'forest-green': '#07110b',
  'royal-purple': '#0e0918',
  'sand-cream': '#f4ead8',
  'slate-grey': '#11161b',
  'ocean-blue': '#04131c',
  'high-contrast': '#000000',
};
