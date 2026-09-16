import { viteReleaseMarkerPlugin } from './scripts/vite-release-marker-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react(), viteReleaseMarkerPlugin()],
  build: {
    // Keep source maps on staging for debugging, but trim them from production.
    sourcemap: mode !== 'production',
    target: 'es2022',
  },
  server: {
    port: 5173,
  },
}));
