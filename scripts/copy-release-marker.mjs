import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const releasePath = path.join(root, 'release.json');
const packagePath = path.join(root, 'package.json');
const distPath = path.join(root, 'dist');
const outputPath = path.join(distPath, 'release.json');

const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (release.version !== packageJson.version) {
  throw new Error(
    `release.json version ${release.version} does not match package.json ${packageJson.version}.`,
  );
}

fs.mkdirSync(distPath, { recursive: true });
fs.copyFileSync(releasePath, outputPath);

const deployed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

if (deployed.version !== release.version) {
  throw new Error('dist/release.json did not preserve the canonical release version.');
}

console.log(
  `Copied release.json to dist/release.json (BajetBN v${release.version}).`,
);
