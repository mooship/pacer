import { defaultConfig } from '@pacer/core';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { App } from './app.js';

describe('App', () => {
  it('renders the title, breadcrumb, and form', () => {
    const { lastFrame } = render(<App config={defaultConfig()} invalidConfig={false} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pacer');
    expect(frame).toContain('Pay date');
    expect(frame).toContain('Last day');
    expect(frame).toContain('Amount');
    expect(frame).toContain('F2 → settings');
  });

  it('surfaces an invalid-config notice', () => {
    const { lastFrame } = render(<App config={defaultConfig()} invalidConfig={true} />);
    expect(lastFrame() ?? '').toContain('config.toml is invalid');
  });
});
