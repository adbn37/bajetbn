import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const need = (condition, message) => {
  if (!condition) throw new Error(message);
};

const personalisation = read('src/services/personalisation.ts');
const touches = read('src/components/ThemeStudioPersonalTouches.tsx');
const studio = read('src/components/ThemeStudio.tsx');
const css = read('src/styles/global.css');

need(
  personalisation.includes("export type TypographyStyle"),
  "TypographyStyle is missing.",
);

need(
  personalisation.includes("export type DecorationIntensity"),
  "DecorationIntensity is missing.",
);

need(
  personalisation.includes("typographyStyle: 'system'"),
  "System typography default is missing.",
);

need(
  personalisation.includes("decorationIntensity: 'balanced'"),
  "Balanced decoration default is missing.",
);

need(
  personalisation.includes("TYPOGRAPHY_STYLES.includes"),
  "Typography sanitization is missing.",
);

need(
  personalisation.includes("DECORATION_INTENSITIES.includes"),
  "Decoration sanitization is missing.",
);

need(
  personalisation.includes("root.dataset.typographyStyle"),
  "Typography DOM application is missing.",
);

need(
  personalisation.includes("root.dataset.decorationIntensity"),
  "Decoration DOM application is missing.",
);

for (const value of ["system", "friendly", "editorial", "mono"]) {
  need(
    personalisation.includes(value),
    "Missing typography option: " + value,
  );
}

for (const value of ["quiet", "balanced", "bold"]) {
  need(
    personalisation.includes(value),
    "Missing decoration option: " + value,
  );
}

need(
  touches.includes("loadPersonalisation"),
  "Existing personalisation loader is not reused.",
);

need(
  touches.includes("savePersonalisation"),
  "Existing personalisation saver is not reused.",
);

need(
  touches.includes("PERSONALISATION_EVENT"),
  "Existing personalisation event is not reused.",
);

need(
  touches.includes("Typography"),
  "Typography control is missing.",
);

need(
  touches.includes("Decoration level"),
  "Decoration control is missing.",
);

need(
  touches.includes("Reset touches"),
  "Reset touches action is missing.",
);

need(
  !touches.includes("localStorage"),
  "Slice 2 must not create another storage engine.",
);

need(
  !touches.includes("setDoc"),
  "Slice 2 must not directly write Firestore.",
);

need(
  !touches.includes("updateDoc"),
  "Slice 2 must not directly write Firestore.",
);

need(
  studio.includes("<ThemeStudioPersonalTouches />"),
  "Theme Studio does not render personal touches.",
);

need(
  css.includes("/* Theme Studio v2 - personal touches */"),
  "Slice 2 CSS marker is missing.",
);

need(
  css.includes("data-typography-style='friendly'"),
  "Friendly typography CSS is missing.",
);

need(
  css.includes("data-typography-style='editorial'"),
  "Editorial typography CSS is missing.",
);

need(
  css.includes("data-typography-style='mono'"),
  "Mono typography CSS is missing.",
);

need(
  css.includes("data-decoration-intensity='quiet'"),
  "Quiet decoration CSS is missing.",
);

need(
  css.includes("data-decoration-intensity='balanced'"),
  "Balanced decoration CSS is missing.",
);

need(
  css.includes("data-decoration-intensity='bold'"),
  "Bold decoration CSS is missing.",
);

need(
  css.includes("data-theme='high-contrast'"),
  "High Contrast protection is missing.",
);

console.log("Theme Studio Slice 2 personal-touch checks passed.");
