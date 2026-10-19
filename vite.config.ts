import { viteReleaseMarkerPlugin } from './scripts/vite-release-marker-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react(), viteReleaseMarkerPlugin()],
  build: {
    // Keep source maps on staging for debugging, but trim them from production.
    sourcemap: mode !== 'production',
    target: 'es2022',
    manifest: true,
    // Phase 11.0: Vite 8/Rolldown groups, never legacy Rollup manualChunks.
    // Avoid grouping all node_modules into one eagerly loaded vendor payload.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'framework-v110',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
              entriesAware: true,
            },
            {
              name: 'firebase-firestore-v110',
              test: /node_modules[\\/]@firebase[\\/]firestore[\\/]/,
              priority: 20,
              entriesAware: true,
            },
            {
              name: 'firebase-auth-v110',
              test: /node_modules[\\/]@firebase[\\/]auth[\\/]/,
              priority: 19,
              entriesAware: true,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
}));
