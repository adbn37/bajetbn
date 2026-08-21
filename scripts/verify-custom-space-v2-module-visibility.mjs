import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const need = (condition, message) => { if (!condition) throw new Error(message); };

const details = read("src/features/spaces/SpaceDetailsPage.tsx");
const modules = read("src/features/spaces/customSpaceModules.ts");
const repository = read("src/repositories/spaceRepository.ts");

need(details.includes("normalizeCustomSpaceModules(space.customModules)"), "Custom module selections must be normalized.");
need(details.includes("customModules.includes('group_fund')"), "Custom Group Fund must obey module selection.");
need(details.includes("const enabledKeys = new Set<string>(['money', ...customModules]);"), "Custom Space home must filter optional modules.");
need(details.includes("quickLinks.splice(index, 1)"), "Disabled modules must be removed from Custom Space home.");

need(details.includes("function CustomSpaceModuleSettings"), "In-Space module settings are missing.");
need(details.includes("CUSTOM_SPACE_MODULE_OPTIONS.map"), "Module settings must use shared definitions.");
need(details.includes("customModules: modules"), "Module settings must persist selections.");
need(details.includes("Save modules"), "Module settings require an explicit save action.");

need(details.includes("Money activity, Members, Chat, Shared expenses and Settlements stay available."), "Core Custom Space capabilities must remain explicit.");
need(repository.includes("updates.customModules"), "Repository must persist Custom Space modules.");
need(modules.includes("if (!value) return [...DEFAULT_CUSTOM_SPACE_MODULES];"), "Legacy Custom Spaces must remain backward-compatible.");

console.log("Custom Space v2 Slice 2 module visibility checks passed.");
