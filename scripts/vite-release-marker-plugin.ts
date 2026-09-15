import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

type ReleaseMetadata = {
  version: string;
  label?: string;
  channel?: string;
  releasedAt?: string;
};

export function viteReleaseMarkerPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: 'bajetbn-release-marker',
    apply: 'build',

    configResolved(config) {
      resolvedConfig = config;
    },

    closeBundle() {
      if (!resolvedConfig) {
        throw new Error('Vite release marker: config was not resolved.');
      }

      const root = resolvedConfig.root;
      const releasePath = path.resolve(root, 'release.json');
      const packagePath = path.resolve(root, 'package.json');
      const outDir = path.resolve(root, resolvedConfig.build.outDir);
      const outputPath = path.join(outDir, 'release.json');

      const release = JSON.parse(
        fs.readFileSync(releasePath, 'utf8'),
      ) as ReleaseMetadata;

      const packageJson = JSON.parse(
        fs.readFileSync(packagePath, 'utf8'),
      ) as { version?: string };

      if (!release.version) {
        throw new Error(
          'Vite release marker: release.json is missing version.',
        );
      }

      if (release.version !== packageJson.version) {
        throw new Error(
          `Vite release marker: release.json version ${release.version} does not match package.json ${packageJson.version}.`,
        );
      }

      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(releasePath, outputPath);

      const deployed = JSON.parse(
        fs.readFileSync(outputPath, 'utf8'),
      ) as ReleaseMetadata;

      if (deployed.version !== release.version) {
        throw new Error(
          'Vite release marker: dist/release.json does not match canonical release.json.',
        );
      }

      console.log(
        `Vite release marker: emitted dist/release.json (BajetBN v${release.version}).`,
      );
    },
  };
}
