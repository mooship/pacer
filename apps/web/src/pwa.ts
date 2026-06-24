import type { VitePWAOptions } from 'vite-plugin-pwa';

export const THEME_COLOR = '#ffb703';

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
