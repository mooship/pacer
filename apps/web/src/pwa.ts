import type { VitePWAOptions } from 'vite-plugin-pwa';

/** Browser theme/toolbar color, shared between the PWA manifest and `index.html`'s meta tag. */
export const THEME_COLOR = '#ffb703';

/**
 * Shared `vite-plugin-pwa` config, consumed by both `vite.config.ts` and the
 * manifest. Icons are generated at build time from `public/favicon.svg` by
 * `@vite-pwa/assets-generator`.
 */
export const pwaOptions: Partial<VitePWAOptions> = {
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
    theme_color: THEME_COLOR,
    background_color: '#fffbf0',
    display: 'standalone',
    start_url: '/',
    scope: '/',
  },
};
