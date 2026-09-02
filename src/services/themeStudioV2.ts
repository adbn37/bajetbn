export type ThemeV2CardStyle = "solid" | "soft" | "glass" | "outline";
export type ThemeV2CardDensity = "compact" | "comfortable" | "roomy";
export type ThemeV2FontChoice = "system" | "friendly" | "editorial" | "mono" | "humanist" | "rounded";
export type ThemeWallpaperFit = "cover" | "contain" | "fill";
export type ThemeWallpaperPosition = "center" | "top" | "bottom" | "left" | "right";

export interface ThemeStudioV2Settings {
  accentColor: string;
  patternIntensity: number;
  cardStyle: ThemeV2CardStyle;
  cardRadius: number;
  shadowStrength: number;
  cardDensity: ThemeV2CardDensity;
  fontChoice: ThemeV2FontChoice;
  wallpaperPath: string | null;
  wallpaperFit: ThemeWallpaperFit;
  wallpaperPosition: ThemeWallpaperPosition;
  wallpaperBlur: number;
  wallpaperDim: number;
  wallpaperAutoMatch: boolean;
  wallpaperAutoCards: boolean;
  wallpaperAutoFocus: boolean;
  wallpaperFocusX: number;
  wallpaperFocusY: number;
  wallpaperPalette: string[];
  cardOpacity: number;
}

export const THEME_STUDIO_V2_EVENT = "bajetbn:theme-studio-v2";
const STORAGE_PREFIX = "bajetbn.themeStudioV2.";

const CARD_STYLES: ThemeV2CardStyle[] = ["solid", "soft", "glass", "outline"];
const CARD_DENSITIES: ThemeV2CardDensity[] = ["compact", "comfortable", "roomy"];
const FONT_CHOICES: ThemeV2FontChoice[] = ["system", "friendly", "editorial", "mono", "humanist", "rounded"];
const WALLPAPER_FITS: ThemeWallpaperFit[] = ["cover", "contain", "fill"];
const WALLPAPER_POSITIONS: ThemeWallpaperPosition[] = ["center", "top", "bottom", "left", "right"];

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
    wallpaperPath: null,
    wallpaperFit: "cover",
    wallpaperPosition: "center",
    wallpaperBlur: 0,
    wallpaperDim: 28,
    wallpaperAutoMatch: true,
    wallpaperAutoCards: true,
    wallpaperAutoFocus: true,
    wallpaperFocusX: 50,
    wallpaperFocusY: 50,
    wallpaperPalette: [],
    cardOpacity: 88,
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

  const wallpaperFit = WALLPAPER_FITS.includes(value?.wallpaperFit as ThemeWallpaperFit)
    ? value!.wallpaperFit as ThemeWallpaperFit
    : defaults.wallpaperFit;

  const wallpaperPosition = WALLPAPER_POSITIONS.includes(value?.wallpaperPosition as ThemeWallpaperPosition)
    ? value!.wallpaperPosition as ThemeWallpaperPosition
    : defaults.wallpaperPosition;

  const wallpaperPathValue = typeof value?.wallpaperPath === "string"
    ? value.wallpaperPath.trim()
    : "";

  const wallpaperPalette = Array.isArray(value?.wallpaperPalette)
    ? value!.wallpaperPalette
        .map((entry) => String(entry || "").trim().toUpperCase())
        .filter((entry) => /^#[0-9A-F]{6}$/.test(entry))
        .slice(0, 5)
    : defaults.wallpaperPalette;

  return {
    accentColor: normalizeThemeAccent(value?.accentColor, defaults.accentColor),
    patternIntensity: Math.round(clamp(Number(value?.patternIntensity ?? defaults.patternIntensity), 0, 100)),
    cardStyle,
    cardRadius: Math.round(clamp(Number(value?.cardRadius ?? defaults.cardRadius), 6, 32)),
    shadowStrength: Math.round(clamp(Number(value?.shadowStrength ?? defaults.shadowStrength), 0, 100)),
    cardDensity,
    fontChoice,
    wallpaperPath: wallpaperPathValue || null,
    wallpaperFit,
    wallpaperPosition,
    wallpaperBlur: Math.round(clamp(Number(value?.wallpaperBlur ?? defaults.wallpaperBlur), 0, 20)),
    wallpaperDim: Math.round(clamp(Number(value?.wallpaperDim ?? defaults.wallpaperDim), 0, 80)),
    wallpaperAutoMatch: typeof value?.wallpaperAutoMatch === "boolean"
      ? value.wallpaperAutoMatch
      : defaults.wallpaperAutoMatch,
    wallpaperAutoCards: typeof value?.wallpaperAutoCards === "boolean"
      ? value.wallpaperAutoCards
      : defaults.wallpaperAutoCards,
    wallpaperAutoFocus: typeof value?.wallpaperAutoFocus === "boolean"
      ? value.wallpaperAutoFocus
      : defaults.wallpaperAutoFocus,
    wallpaperFocusX: Math.round(clamp(Number(value?.wallpaperFocusX ?? defaults.wallpaperFocusX), 0, 100)),
    wallpaperFocusY: Math.round(clamp(Number(value?.wallpaperFocusY ?? defaults.wallpaperFocusY), 0, 100)),
    wallpaperPalette,
    cardOpacity: Math.round(clamp(Number(value?.cardOpacity ?? defaults.cardOpacity), 60, 100)),
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
  delete root.dataset.themeWallpaper;

  for (const property of [
    "--theme-user-accent",
    "--theme-accent-contrast",
    "--theme-pattern-strength",
    "--theme-card-radius",
    "--theme-card-shadow",
    "--theme-card-density-y",
    "--theme-font-family",
    "--theme-wallpaper-image",
    "--theme-wallpaper-fit",
    "--theme-wallpaper-position",
    "--theme-wallpaper-blur",
    "--theme-wallpaper-dim",
    "--theme-card-opacity",
    "--accent",
    "--accent-2",
  ]) root.style.removeProperty(property);
}

export function applyThemeStudioV2WallpaperUrl(url: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!url) {
    root.style.removeProperty("--theme-wallpaper-image");
    root.dataset.themeWallpaper = "none";
    return;
  }

  const safeUrl = url.replace(/"/g, "%22");
  root.style.setProperty("--theme-wallpaper-image", 'url("' + safeUrl + '")');
  root.dataset.themeWallpaper = "custom";
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
  root.dataset.themeWallpaper = settings.wallpaperPath ? "custom" : "none";

  root.style.setProperty("--theme-pattern-strength", String(Math.round(settings.patternIntensity * 0.42)) + "%");
  root.style.setProperty("--theme-card-radius", String(settings.cardRadius) + "px");
  root.style.setProperty("--theme-card-shadow", "0 " + String(Math.round(settings.shadowStrength * 0.16)) + "px " + String(Math.round(10 + settings.shadowStrength * 0.38)) + "px rgba(0,0,0," + String((0.05 + settings.shadowStrength * 0.0022).toFixed(3)) + ")");
  root.style.setProperty("--theme-card-density-y", settings.cardDensity === "compact" ? "0.62rem" : settings.cardDensity === "roomy" ? "1.18rem" : "0.88rem");
  root.style.setProperty("--theme-font-family", FONT_STACKS[settings.fontChoice]);
  root.style.setProperty("--theme-wallpaper-fit", settings.wallpaperFit);
  root.style.setProperty(
    "--theme-wallpaper-position",
    settings.wallpaperAutoFocus
      ? String(settings.wallpaperFocusX) + "% " + String(settings.wallpaperFocusY) + "%"
      : settings.wallpaperPosition,
  );
  root.style.setProperty("--theme-wallpaper-blur", String(settings.wallpaperBlur) + "px");
  root.style.setProperty("--theme-wallpaper-dim", String(settings.wallpaperDim / 100));
  root.style.setProperty("--theme-card-opacity", String(settings.cardOpacity) + "%");

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

    window.dispatchEvent(new CustomEvent(THEME_STUDIO_V2_EVENT, {
      detail: { uid, settings: next },
    }));
  }

  return next;
}
