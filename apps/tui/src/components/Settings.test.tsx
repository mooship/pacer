import { defaultConfig, initialState } from '@pacer/core';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Settings } from './Settings.js';

const theme = { accent: 'cyan', green: 'green', yellow: 'yellow', red: 'red' };

function settingsState(overrides: Partial<ReturnType<typeof initialState>> = {}) {
  return {
    ...initialState(defaultConfig(), 0),
    step: 'settings' as const,
    quantumInput: '50.00',
    intervalInput: '7',
    currencyInput: 'ZAR',
    settingsCursor: 0,
    ...overrides,
  };
}

describe('Settings', () => {
  it('renders quantum, currency, payout day, and interval fields', () => {
    const { lastFrame } = render(
      <Settings
        state={settingsState()}
        theme={theme}
        onQuantumChange={vi.fn()}
        onIntervalChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Quantum');
    expect(frame).toContain('Currency');
    expect(frame).toContain('ZAR');
    expect(frame).toContain('South African Rand');
    expect(frame).toContain('Payout day');
    expect(frame).toContain('Every (days)');
    expect(frame).toContain('Mon');
  });

  it('shows the configured payout weekday', () => {
    const { lastFrame } = render(
      <Settings
        state={settingsState({ config: { ...defaultConfig(), payday: 5 } })}
        theme={theme}
        onQuantumChange={vi.fn()}
        onIntervalChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(lastFrame() ?? '').toContain('Fri');
  });

  it('shows a saved notice via the shared status line', () => {
    const { lastFrame } = render(
      <Settings
        state={settingsState({ notice: 'settings saved' })}
        theme={theme}
        onQuantumChange={vi.fn()}
        onIntervalChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(lastFrame() ?? '').toContain('settings saved');
  });

  it('shows an error via the shared status line', () => {
    const { lastFrame } = render(
      <Settings
        state={settingsState({ error: 'interval must be a whole number of days' })}
        theme={theme}
        onQuantumChange={vi.fn()}
        onIntervalChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(lastFrame() ?? '').toContain('interval must be a whole number of days');
  });
});
