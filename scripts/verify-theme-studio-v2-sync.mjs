import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const need = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(read("package.json"));
const releaseJson = JSON.parse(read("release.json"));
const service = read("src/services/themeStudioV2.ts");
const persistence = read("src/services/themeStudioV2Persistence.ts");
const runtime = read("src/components/ThemeStudioV2Runtime.tsx");
const panel = read("src/components/ThemeStudioSyncPanel.tsx");
const studio = read("src/components/ThemeStudio.tsx");
const rules = read("firestore.rules");
const storageRules = read("storage.rules");
const css = read("src/styles/global.css");

need(packageJson.version === releaseJson.version, "Package and release metadata must match.");
need(service.includes("wallpaperPath"), "Wallpaper path is missing.");
need(service.includes("wallpaperFit"), "Wallpaper fit is missing.");
need(service.includes("wallpaperPosition"), "Wallpaper position is missing.");
need(service.includes("wallpaperBlur"), "Wallpaper blur is missing.");
need(service.includes("wallpaperDim"), "Wallpaper dim strength is missing.");
need(service.includes("applyThemeStudioV2WallpaperUrl"), "Wallpaper runtime URL support is missing.");

need(persistence.includes('"users", uid'), "Theme sync must reuse the existing user profile document.");
need(persistence.includes('"users/" + uid + "/theme-wallpapers/"'), "Wallpaper must use the existing private user Storage path.");
need(persistence.includes("saveThemeStudioV2SpaceOverride"), "Personal Space theme persistence is missing.");
need(persistence.includes("themeStudioV2: payload"), "Cloud theme profile sync is missing.");
need(persistence.includes("schemaVersion: 2"), "Theme Studio v2 cloud schema marker is missing.");

need(runtime.includes('pathname.match(/^\\/spaces\\/([^/]+)'), "Runtime Space route detection is missing.");
need(runtime.includes("loadThemeStudioV2SpaceOverride"), "Runtime does not apply personal Space themes.");
need(runtime.includes("hydrateThemeStudioV2FromCloud"), "Cross-device hydration is missing.");

need(panel.includes("Upload wallpaper"), "Wallpaper upload UI is missing.");
need(panel.includes("Dim strength"), "Wallpaper dim control is missing.");
need(panel.includes("Give this Space its own theme"), "Personal Space-theme opt-in is missing.");
need(panel.includes("Other members will not see your theme"), "Personal-only Space theme explanation is missing.");
need(panel.includes("Save to my account"), "Explicit cross-device save action is missing.");
need(panel.includes("Cloud sync activates with the v1.6 backend release."), "Safe staging sync fallback message is missing.");
need(studio.includes("<ThemeStudioSyncPanel />"), "Theme Studio sync panel is not mounted.");

need(rules.includes("'themeStudioV2'"), "Firestore source rule does not permit the new self-owned theme field.");
need(rules.includes("request.resource.data.themeStudioV2 is map"), "Theme profile field validation is missing.");

need(storageRules.includes("match /users/{uid}/{allPaths=**}"), "Private user Storage path is missing.");
need(storageRules.includes("request.auth.uid == uid"), "Private user Storage ownership guard is missing.");

need(css.includes("/* Theme Studio v2 - wallpaper and personal Space themes */"), "Theme Studio v2 Slice 2 CSS marker is missing.");
need(css.includes("[data-theme-wallpaper=custom]"), "Custom wallpaper CSS is missing.");
need(css.includes("[data-theme*=contrast][data-theme-wallpaper=custom]"), "High Contrast wallpaper protection is missing.");

console.log("Theme Studio v2 Slice 2 wallpaper, sync and personal Space-theme checks passed.");
