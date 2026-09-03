import fs from "node:fs";

function need(path, token) {
  const text = fs.readFileSync(path, "utf8");

  if (!text.includes(token)) {
    throw new Error(path + " missing: " + token);
  }
}

for (const token of [
  "export type MarketplaceInventoryProfile",
  "marketplaceInventoryProfile?: MarketplaceInventoryProfile",
]) {
  need("src/types/models.ts", token);
}

for (const token of [
  "marketplaceInventoryProfile?: MarketplaceInventoryProfile",
  "existingProfile?.marketplaceInventoryProfile",
]) {
  need(
    "src/repositories/businessAdvancedRepository.ts",
    token,
  );
}

for (const token of [
  "What does this marketplace mainly sell?",
  "General / Mixed items",
  "Trading Cards & Collectibles",
  "Fashion / Clothing",
  "Electronics",
  "Toys / Hobby",
  "Books / Comics",
  "Beauty / Personal Care",
  "Food / Homemade Products",
  "Automotive / Parts",
  "Handmade / Crafts",
  "Other / Custom",
]) {
  need(
    "src/features/business/BusinessWizardPage.tsx",
    token,
  );
}

for (const token of [
  "getBusinessProfile",
  "marketplaceInventoryProfile",
]) {
  need(
    "src/features/sme-pos/SmePosPage.tsx",
    token,
  );
}

for (const token of [
  "inventoryProfile: MarketplaceInventoryProfile",
  "marketplaceCategoryPlaceholder",
  "showListingCollectibleDetails",
  "showManualCollectibleDetails",
  "Item Category / Type",
  "+ Add collectible details for this item",
  "display: showListingCollectibleDetails ? undefined : 'none'",
  "display: showManualCollectibleDetails ? undefined : 'none'",
]) {
  need(
    "src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx",
    token,
  );
}

for (const token of [
  "'marketplaceInventoryProfile'",
  "request.resource.data.marketplaceInventoryProfile in [",
  "!('marketplaceInventoryProfile' in request.resource.data)",
]) {
  need(
    "firestore.rules",
    token,
  );
}

console.log(
  "PASS: Marketplace inventory profile verification.",
);
