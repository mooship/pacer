import { type ComputeResult, compute, daysFromCivil, defaultConfig } from '@pacer/core';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Results } from './Results.js';

const theme = { accent: 'cyan', green: 'green', yellow: 'yellow', red: 'red' };

function computeOk(...args: Parameters<typeof compute>): ComputeResult {
  const r = compute(...args);
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.value;
}

describe('Results', () => {
  it('renders a summary line, table header, and per-segment rows', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const results = computeOk(pay, end, 500000, defaultConfig());
    const { lastFrame } = render(
      <Results
        results={results}
        total={500000}
        config={defaultConfig()}
        today={pay}
        theme={theme}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pay');
    expect(frame).toContain('Covers');
    expect(frame).toContain('Total');
    expect(frame).toContain('R5,000.00');
  });

  it('shows the next payout countdown when the plan has not started', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const results = computeOk(pay, end, 500000, defaultConfig());
    const { lastFrame } = render(
      <Results
        results={results}
        total={500000}
        config={defaultConfig()}
        today={pay - 3}
        theme={theme}
      />,
    );
    expect(lastFrame() ?? '').toContain('Next payout in 3 days.');
  });

  it('uses singular "day" when the next payout is tomorrow', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const results = computeOk(pay, end, 500000, defaultConfig());
    const { lastFrame } = render(
      <Results
        results={results}
        total={500000}
        config={defaultConfig()}
        today={pay - 1}
        theme={theme}
      />,
    );
    expect(lastFrame() ?? '').toContain('Next payout in 1 day.');
  });

  it('omits the countdown once the plan has finished', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const results = computeOk(pay, end, 500000, defaultConfig());
    const { lastFrame } = render(
      <Results
        results={results}
        total={500000}
        config={defaultConfig()}
        today={end + 1}
        theme={theme}
      />,
    );
    expect(lastFrame() ?? '').not.toContain('Next payout');
  });

  it('highlights the current segment when today falls on a later payout', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const end = daysFromCivil(2026, 7, 24);
    const results = computeOk(pay, end, 500000, defaultConfig());
    const { lastFrame } = render(
      <Results
        results={results}
        total={500000}
        config={defaultConfig()}
        today={results.dates[1]}
        theme={theme}
      />,
    );
    expect(lastFrame() ?? '').toContain('▸');
  });

  it('renders a single-segment plan without crashing', () => {
    const pay = daysFromCivil(2026, 6, 25);
    const results = computeOk(pay, pay, 100000, defaultConfig());
    const { lastFrame } = render(
      <Results
        results={results}
        total={100000}
        config={defaultConfig()}
        today={pay}
        theme={theme}
      />,
    );
    expect(lastFrame() ?? '').toContain('R1,000.00');
  });
});
