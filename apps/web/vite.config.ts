import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { pwaOptions } from './src/pwa.js';

export default defineConfig({
  plugins: [react(), VitePWA(pwaOptions)],
  test: {
    environment: 'happy-dom',
    globals: true,
    restoreMocks: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
