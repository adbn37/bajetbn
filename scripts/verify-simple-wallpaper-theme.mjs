import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) =>
  fs.readFileSync(
    path.join(root, file),
    "utf8",
  ).replace(/\r\n?/g, "\n");

const need = (condition, message) => {
  if (!condition) throw new Error(message);
};

const studio =
  read("src/components/ThemeStudio.tsx");
const assistant =
  read("src/components/ThemeWallpaperAssistant.tsx");
const settings =
  read("src/pages/SettingsPage.tsx");
const service =
  read("src/services/themeStudioV2.ts");
const css =
  read("src/styles/global.css");

need(
  studio.includes("<ThemeChooser compact />"),
  "Theme selection must use the compact chooser.",
);

need(
  studio.includes("<ThemeWallpaperAssistant />"),
  "Simple wallpaper assistant is not mounted.",
);

need(
  studio.includes("Advanced customisation")
    && studio.includes("<details"),
  "Advanced theme controls must be collapsed by default.",
);

need(
  studio.includes("<PersonalStyleSettings")
    && studio.includes("<ThemeStudioPersonalTouches />")
    && studio.includes("<ThemeStudioAdvancedControls />")
    && studio.includes("<ThemeStudioSyncPanel />"),
  "Existing power-user theme controls must remain available under Advanced customisation.",
);

need(
  !studio.includes("theme-studio-preview"),
  "The large duplicate Theme Studio preview must not remain in the default theme UI.",
);

need(
  !settings.includes("<PersonalStyleSettings"),
  "Settings must not show a second standalone Personal Style panel.",
);

for (const token of [
  "createImageBitmap(file)",
  "reader.readAsDataURL(file);",
  "document.createElement('canvas')",
  "getImageData",
  "uploadThemeStudioWallpaper",
  "deleteThemeStudioWallpaper",
  "wallpaperAutoMatch",
  "wallpaperAutoCards",
  "wallpaperPalette",
  "cardOpacity",
  "Suggested colours",
  "Automatic card transparency",
  "Colour matching is analysed on this device",
]) {
  need(
    assistant.includes(token),
    "Wallpaper assistant is missing " + token,
  );
}


need(
  !assistant.includes("URL.createObjectURL(file)"),
  "Wallpaper analysis must not depend on blob image URLs blocked by BajetBN CSP.",
);

for (const token of [
  "wallpaperAutoMatch",
  "wallpaperAutoCards",
  "wallpaperPalette",
  "cardOpacity",
  "--theme-card-opacity",
]) {
  need(
    service.includes(token),
    "Theme Studio v2 service is missing " + token,
  );
}

need(
  assistant.includes(
    "Financial status colours do not change.",
  ),
  "Wallpaper matching must preserve financial colour semantics.",
);

need(
  css.includes(
    "/* Theme Studio simplified wallpaper assistant */",
  ),
  "Simplified Theme Studio CSS marker is missing.",
);

need(
  css.includes("--theme-card-opacity"),
  "Wallpaper-aware card opacity CSS is missing.",
);

need(
  css.includes(
    "[data-theme*=contrast][data-theme-wallpaper=custom]",
  ),
  "High Contrast wallpaper protection must remain intact.",
);

console.log(
  "Simple theme + smart wallpaper verification PASS.",
);
