import { viteReleaseMarkerPlugin } from './scripts/vite-release-marker-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), viteReleaseMarkerPlugin()],
  build: {
    sourcemap: true,
    target: 'es2022',
  },
  server: {
    port: 5173,
  },
});
