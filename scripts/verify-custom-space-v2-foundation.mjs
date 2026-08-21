import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const need = (condition, message) => { if (!condition) throw new Error(message); };

const models = read("src/types/models.ts");
const repository = read("src/repositories/spaceRepository.ts");
const spaces = read("src/features/spaces/SpacesPage.tsx");
const modules = read("src/features/spaces/customSpaceModules.ts");
const css = read("src/styles/global.css");

need(models.includes("export type CustomSpaceModule ="), "CustomSpaceModule type is missing.");

for (const token of ["budgets", "goals", "bills", "reports", "calendar", "group_fund"]) {
  need(models.includes(token), "Custom Space module model missing " + token + ".");
}

need(models.includes("customModules?: CustomSpaceModule[];"), "Space model must store optional Custom Space modules.");

need(modules.includes("CUSTOM_SPACE_MODULE_OPTIONS"), "Custom Space module options are missing.");
need(modules.includes("DEFAULT_CUSTOM_SPACE_MODULES"), "Custom Space defaults are missing.");
need(modules.includes("normalizeCustomSpaceModules"), "Custom Space normalizer is missing.");
need(modules.includes("if (!value) return [...DEFAULT_CUSTOM_SPACE_MODULES];"), "Existing Custom Spaces must default to all modules.");

need(repository.includes("customModules?: CustomSpaceModule[]"), "createSpace/updateSpace inputs must accept Custom Space modules.");
need(repository.includes("input.type ==="), "Custom Space creation persistence is missing.");
need(repository.includes("customModules: input.customModules"), "Custom Space creation must save selected modules.");
need(repository.includes("updates.customModules"), "Custom Space editing must save selected modules.");

need(spaces.includes("Choose what this Space needs"), "Custom Space module picker is missing.");
need(spaces.includes("CUSTOM_SPACE_MODULE_OPTIONS.map"), "Module picker must use shared Custom Space definitions.");
need(spaces.includes("normalizeCustomSpaceModules(initial.customModules)"), "Existing Custom Space edit flow must normalize saved modules.");
need(spaces.includes("Money activity, Members, Chat, Shared expenses and Settlements are always included."), "Core shared-space tools must remain always enabled.");

for (const label of ["Vehicle", "Property", "Project", "Event", "Asset", "Custom"]) {
  need(spaces.includes(">" + label + "</option>"), "Space type option disappeared: " + label);
}

need(css.includes("/* Custom Space v2 - module picker */"), "Custom Space module picker styles are missing.");

const packageJson = JSON.parse(read("package.json"));
const releaseJson = JSON.parse(read("release.json"));
need(packageJson.version === releaseJson.version, "package.json and release.json versions must match.");

console.log("Custom Space v2 Slice 1 foundation checks passed.");
