export type ThemeV2CardStyle = "solid" | "soft" | "glass" | "outline";
export type ThemeV2CardDensity = "compact" | "comfortable" | "roomy";
export type ThemeV2FontChoice = "system" | "friendly" | "editorial" | "mono" | "humanist" | "rounded";

export interface ThemeStudioV2Settings {
  accentColor: string;
  patternIntensity: number;
  cardStyle: ThemeV2CardStyle;
  cardRadius: number;
  shadowStrength: number;
  cardDensity: ThemeV2CardDensity;
  fontChoice: ThemeV2FontChoice;
}

export const THEME_STUDIO_V2_EVENT = "bajetbn:theme-studio-v2";
const STORAGE_PREFIX = "bajetbn.themeStudioV2.";

const CARD_STYLES: ThemeV2CardStyle[] = ["solid", "soft", "glass", "outline"];
const CARD_DENSITIES: ThemeV2CardDensity[] = ["compact", "comfortable", "roomy"];
const FONT_CHOICES: ThemeV2FontChoice[] = ["system", "friendly", "editorial", "mono", "humanist", "rounded"];

const FONT_STACKS: Record<ThemeV2FontChoice, string> = {
  system: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  friendly: '"Trebuchet MS", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
  editorial: 'Georgia, "Times New Roman", ui-serif, serif',
  mono: '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  humanist: '"Segoe UI", Candara, Calibri, Optima, ui-sans-serif, sans-serif',
  rounded: '"Arial Rounded MT Bold", "Trebuchet MS", ui-rounded, system-ui, sans-serif',
};

export function defaultThemeStudioV2(): ThemeStudioV2Settings {
  return {
    accentColor: "#2DD4BF",
    patternIntensity: 50,
    cardStyle: "soft",
    cardRadius: 16,
    shadowStrength: 45,
    cardDensity: "comfortable",
    fontChoice: "system",
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeThemeAccent(value: unknown, fallback = "#2DD4BF") {
  const candidate = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback;
}

function parseHex(hex: string) {
  const value = normalizeThemeAccent(hex).slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function channelLuminance(value: number) {
  const next = value / 255;
  return next <= 0.03928 ? next / 12.92 : Math.pow((next + 0.055) / 1.055, 2.4);
}

function accentContrastText(hex: string) {
  const rgb = parseHex(hex);
  const luminance = 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
  return luminance > 0.42 ? "#041014" : "#FFFFFF";
}

function accentSecondary(hex: string) {
  const rgb = parseHex(hex);
  const mix = (value: number) => Math.round(value + (255 - value) * 0.22);
  return "#" + [mix(rgb.r), mix(rgb.g), mix(rgb.b)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function sanitizeThemeStudioV2(value?: Partial<ThemeStudioV2Settings> | null): ThemeStudioV2Settings {
  const defaults = defaultThemeStudioV2();
  const cardStyle = CARD_STYLES.includes(value?.cardStyle as ThemeV2CardStyle)
    ? value!.cardStyle as ThemeV2CardStyle
    : defaults.cardStyle;
  const cardDensity = CARD_DENSITIES.includes(value?.cardDensity as ThemeV2CardDensity)
    ? value!.cardDensity as ThemeV2CardDensity
    : defaults.cardDensity;
  const fontChoice = FONT_CHOICES.includes(value?.fontChoice as ThemeV2FontChoice)
    ? value!.fontChoice as ThemeV2FontChoice
    : defaults.fontChoice;

  return {
    accentColor: normalizeThemeAccent(value?.accentColor, defaults.accentColor),
    patternIntensity: Math.round(clamp(Number(value?.patternIntensity ?? defaults.patternIntensity), 0, 100)),
    cardStyle,
    cardRadius: Math.round(clamp(Number(value?.cardRadius ?? defaults.cardRadius), 6, 32)),
    shadowStrength: Math.round(clamp(Number(value?.shadowStrength ?? defaults.shadowStrength), 0, 100)),
    cardDensity,
    fontChoice,
  };
}

export function loadThemeStudioV2(uid: string): ThemeStudioV2Settings {
  if (!uid || typeof window === "undefined") return defaultThemeStudioV2();
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + uid);
    return sanitizeThemeStudioV2(raw ? JSON.parse(raw) as Partial<ThemeStudioV2Settings> : null);
  } catch {
    return defaultThemeStudioV2();
  }
}

export function clearThemeStudioV2() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  delete root.dataset.themeStudioV2;
  delete root.dataset.v2CardStyle;
  delete root.dataset.v2CardDensity;
  delete root.dataset.v2FontChoice;
  for (const property of [
    "--theme-user-accent",
    "--theme-accent-contrast",
    "--theme-pattern-strength",
    "--theme-card-radius",
    "--theme-card-shadow",
    "--theme-card-density-y",
    "--theme-font-family",
    "--accent",
    "--accent-2",
  ]) root.style.removeProperty(property);
}

export function applyThemeStudioV2(value: ThemeStudioV2Settings) {
  if (typeof document === "undefined") return;
  const settings = sanitizeThemeStudioV2(value);
  const root = document.documentElement;
  const highContrast = String(root.dataset.theme || "").toLowerCase().includes("contrast");

  root.dataset.themeStudioV2 = "on";
  root.dataset.v2CardStyle = settings.cardStyle;
  root.dataset.v2CardDensity = settings.cardDensity;
  root.dataset.v2FontChoice = settings.fontChoice;

  root.style.setProperty("--theme-pattern-strength", String(Math.round(settings.patternIntensity * 0.42)) + "%");
  root.style.setProperty("--theme-card-radius", String(settings.cardRadius) + "px");
  root.style.setProperty("--theme-card-shadow", "0 " + String(Math.round(settings.shadowStrength * 0.16)) + "px " + String(Math.round(10 + settings.shadowStrength * 0.38)) + "px rgba(0,0,0," + String((0.05 + settings.shadowStrength * 0.0022).toFixed(3)) + ")");
  root.style.setProperty("--theme-card-density-y", settings.cardDensity === "compact" ? "0.62rem" : settings.cardDensity === "roomy" ? "1.18rem" : "0.88rem");
  root.style.setProperty("--theme-font-family", FONT_STACKS[settings.fontChoice]);

  if (highContrast) {
    root.style.removeProperty("--theme-user-accent");
    root.style.removeProperty("--theme-accent-contrast");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-2");
  } else {
    root.style.setProperty("--theme-user-accent", settings.accentColor);
    root.style.setProperty("--theme-accent-contrast", accentContrastText(settings.accentColor));
    root.style.setProperty("--accent", settings.accentColor);
    root.style.setProperty("--accent-2", accentSecondary(settings.accentColor));
  }
}

export function saveThemeStudioV2(uid: string, value: ThemeStudioV2Settings): ThemeStudioV2Settings {
  const next = sanitizeThemeStudioV2(value);
  applyThemeStudioV2(next);
  if (uid && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + uid, JSON.stringify(next));
    } catch {
      // Keep the visual change for this session when local storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(THEME_STUDIO_V2_EVENT, { detail: { uid, settings: next } }));
  }
  return next;
}
