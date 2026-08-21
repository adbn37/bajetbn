import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const need = (condition, message) => { if (!condition) throw new Error(message); };

const studio = read("src/components/ThemeStudio.tsx");
const chooser = read("src/components/ThemeChooser.tsx");
const settings = read("src/pages/SettingsPage.tsx");
const presets = read("src/config/themePresets.ts");
const preferences = read("src/contexts/PreferencesContext.tsx");
const css = read("src/styles/global.css");

const authFiles = [
  "src/layouts/AuthLayout.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/Login.tsx",
].filter(exists);

const authSource = authFiles.map(read).join("\n");

need(studio.includes("export function ThemeStudio"), "Theme Studio component is missing.");
need(studio.includes("<ThemeChooser />"), "Theme Studio must reuse the existing ThemeChooser.");
need(studio.includes("usePreferences()"), "Theme Studio must reuse PreferencesContext.");
need(studio.includes("normalizeAppearance(appearance)"), "Theme Studio must use existing appearance normalization.");
need(!studio.includes("localStorage"), "Theme Studio must not create another persistence engine.");

need(settings.includes("<ThemeStudio />"), "Settings must render Theme Studio.");
need(!settings.includes("<ThemeChooser />"), "Settings must not render a second standalone ThemeChooser.");

need(authSource.includes("ThemeChooser"), "Login/auth flow must retain ThemeChooser.");
need(authSource.includes("compact"), "Login/auth ThemeChooser must remain compact.");

need(chooser.includes("setAppearance"), "Existing immediate theme switching must remain intact.");
need(preferences.includes("bajetbn.preferences.v1"), "Existing preference persistence must remain intact.");
need(preferences.includes("dataset.theme"), "Existing document theme application must remain intact.");

const themes = [
  "light",
  "black",
  "pink-white",
  "black-pink",
  "midnight-teal",
  "navy-blue",
  "forest-green",
  "royal-purple",
  "sand-cream",
  "slate-grey",
  "ocean-blue",
  "high-contrast",
];

for (const theme of themes) {
  need(presets.includes(theme), "Missing theme preset: " + theme);
  need(css.includes("data-theme=") && css.includes(theme), "Missing CSS theme treatment: " + theme);
}

need(css.includes("/* Theme Studio v1 - expressive visual layer */"), "Theme Studio CSS layer is missing.");
need(css.includes("--studio-wallpaper"), "Theme Studio wallpaper token is missing.");
need(css.includes("--studio-card-radius"), "Theme Studio card treatment token is missing.");
need(css.includes("--studio-card-shadow"), "Theme Studio card shadow token is missing.");
need(css.includes("--studio-preview-pattern"), "Theme Studio pattern token is missing.");

need(css.includes("high-contrast"), "High Contrast theme protection is missing.");
need(css.includes("--studio-wallpaper: none;"), "High Contrast must disable decorative wallpaper.");
need(css.includes("--studio-card-shadow: none;"), "High Contrast must disable decorative card shadow.");

need(studio.includes("Financial contrast protected") || studio.includes("Kontras kewangan dilindungi"), "Theme Studio must communicate financial readability protection.");
need(!studio.includes("role ==="), "Theme Studio must not alter role logic.");
need(!studio.includes("permission"), "Theme Studio must not alter permission logic.");

console.log("Theme Studio Slice 1 checks passed.");
