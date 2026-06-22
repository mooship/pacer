import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      pwaAssets: {
        image: 'public/favicon.svg',
        preset: 'minimal-2023',
      },
      manifest: {
        name: 'Pacer',
        short_name: 'Pacer',
        description: 'Pace your pay across the month.',
        theme_color: '#ffb703',
        background_color: '#fffbf0',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    restoreMocks: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
