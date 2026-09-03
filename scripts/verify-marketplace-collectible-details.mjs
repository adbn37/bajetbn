import fs from "node:fs";

function need(path, token) {
  const text = fs.readFileSync(path, "utf8");

  if (!text.includes(token)) {
    throw new Error(`${path} missing: ${token}`);
  }
}

for (const token of [
  "franchise?: string;",
  "series?: string;",
  "itemNumber?: string;",
  "language?: string;",
  "variantRarity?: string;",
]) {
  need("src/types/models.ts", token);
}

for (const token of [
  "franchise?: string;",
  "series?: string;",
  "itemNumber?: string;",
  "language?: string;",
  "variantRarity?: string;",
]) {
  need("src/repositories/smePosRepository.ts", token);
}

for (const token of [
  "Item Genre",
  "Group / Franchise",
  "Series / Set",
  "Card / Item Number",
  "Language",
  "Variant / Rarity",
  "item.franchise",
  "item.series",
  "item.itemNumber",
  "item.language",
  "item.variantRarity",
  "form.get('franchise')",
  "form.get('series')",
  "form.get('itemNumber')",
  "form.get('language')",
  "form.get('variantRarity')",
]) {
  need(
    "src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx",
    token,
  );
}

for (const token of [
  "request.data?.franchise",
  "request.data?.series",
  "request.data?.itemNumber",
  "request.data?.language",
  "request.data?.variantRarity",
  "franchise,",
  "series,",
  "itemNumber,",
  "language,",
  "variantRarity,",
]) {
  need("functions/src/index.ts", token);
}

console.log(
  "PASS: Marketplace collectible listing details structural verification.",
);
