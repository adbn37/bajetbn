import fs from "node:fs";

function need(path, token) {
  const text =
    fs.readFileSync(path, "utf8");

  if (!text.includes(token)) {
    throw new Error(
      `${path} missing: ${token}`,
    );
  }
}

const hub =
  "src/features/spaces/SpaceActionHub.tsx";

const details =
  "src/features/spaces/SpaceDetailsPage.tsx";

for (const token of [
  "isBusinessOwner &&",
  "label=\"Business Setup\"",
  "/business/setup",
]) {
  need(
    hub,
    token,
  );
}

for (const token of [
  "Business Setup",
  "Open Business Setup",
  "marketplace inventory profile",
  "/business/setup",
  "currentMember?.role === 'owner'",
]) {
  need(
    details,
    token,
  );
}

console.log(
  "PASS: Existing Business Spaces expose owner-only Business Setup access.",
);
