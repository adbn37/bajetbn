import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const need = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(read("package.json"));
const service = read("src/services/themeStudioV2.ts");
const controls = read("src/components/ThemeStudioAdvancedControls.tsx");
const runtime = read("src/components/ThemeStudioV2Runtime.tsx");
const studio = read("src/components/ThemeStudio.tsx");
const shell = read("src/layouts/AppShell.tsx");
const css = read("src/styles/global.css");

need(packageJson.version.localeCompare("1.5.0", undefined, { numeric: true, sensitivity: "base" }) >= 0, "Theme Studio v2 requires v1.5.0 or newer.");

for (const token of [
  "accentColor",
  "patternIntensity",
  "cardStyle",
  "cardRadius",
  "shadowStrength",
  "cardDensity",
  "fontChoice",
  "normalizeThemeAccent",
  "High Contrast",
]) need(service.includes(token) || controls.includes(token), "Theme Studio v2 is missing " + token);

need(service.includes('includes("contrast")'), "High Contrast accent protection is missing.");
need(!service.includes('setProperty("--danger"'), "Theme Studio v2 must not replace semantic danger colours.");
need(controls.includes("HEX"), "Custom HEX accent entry is missing.");
need(controls.includes('type="color"'), "Accent colour picker is missing.");
need(controls.includes('type="range"'), "Theme Studio v2 sliders are missing.");
need(controls.includes("Reset all"), "Theme Studio v2 reset-all control is missing.");
need(controls.includes("Live preview"), "Theme Studio v2 live preview is missing.");
need(controls.includes("theme-v2-preview-phone"), "Mobile preview is missing.");
need(controls.includes("theme-v2-positive") && controls.includes("theme-v2-negative"), "Financial colour preview protection is missing.");
need(runtime.includes("MutationObserver"), "Theme changes must reapply High Contrast protection.");
need(studio.includes("<ThemeStudioAdvancedControls />"), "Theme Studio v2 controls are not mounted.");
need(shell.includes("<ThemeStudioV2Runtime />"), "Theme Studio v2 runtime is not mounted.");
need(css.includes("/* Theme Studio v2 - advanced personal visual controls */"), "Theme Studio v2 CSS marker is missing.");
need(css.includes("[data-v2-card-style=glass]"), "Glass card style is missing.");
need(css.includes("[data-v2-card-style=outline]"), "Outline card style is missing.");
need(css.includes("--theme-pattern-strength"), "Pattern intensity styling is missing.");
need(css.includes("--theme-accent-contrast"), "Accent contrast styling is missing.");

console.log("Theme Studio v2 Slice 1 visual customisation checks passed.");
