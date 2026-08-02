import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pwaOptions, THEME_COLOR } from './pwa.js';

const indexHtmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.html');

describe('pwa config', () => {
  it('registers an auto-updating service worker', () => {
    expect(pwaOptions.registerType).toBe('autoUpdate');
  });

  it('defines a complete, installable manifest', () => {
    const m = pwaOptions.manifest;
    if (!m) {
      throw new Error('manifest is not defined');
    }
    expect(m.name).toBe('Pacer');
    expect(m.short_name).toBe('Pacer');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    expect(m.scope).toBe('/');
    expect(m.theme_color).toBe(THEME_COLOR);
  });

  it('generates icons from the source favicon', () => {
    expect(pwaOptions.pwaAssets?.image).toBe('public/favicon.svg');
  });

  it('keeps the index.html theme-color in sync with the manifest', () => {
    const html = readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain(`content="${THEME_COLOR}"`);
  });
});
