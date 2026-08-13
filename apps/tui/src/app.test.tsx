import { daysFromCivil, defaultConfig, type PlanSnapshot } from '@pacer/core';
import { render } from 'ink-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';
import type { PlanLoad } from './config-store.js';

const clipboardWrite = vi.fn((_text: string) => Promise.resolve());
vi.mock('clipboardy', () => ({
  default: { write: (text: string) => clipboardWrite(text) },
}));

const writeFileSyncMock = vi.fn();
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, writeFileSync: (...args: unknown[]) => writeFileSyncMock(...args) };
});

const buildCsvErrorOnce = { armed: false };
vi.mock('@pacer/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@pacer/core')>();
  return {
    ...actual,
    buildCsv: (...args: Parameters<typeof actual.buildCsv>) => {
      if (buildCsvErrorOnce.armed) {
        buildCsvErrorOnce.armed = false;
        return { ok: false as const, error: 'mismatched rows' };
      }
      return actual.buildCsv(...args);
    },
  };
});

const loadPlanMock = vi.fn((): PlanLoad => ({ snap: null as PlanSnapshot | null, invalid: false }));
const savePlanMock = vi.fn();
const clearPlanMock = vi.fn();
const saveConfigMock = vi.fn();
vi.mock('./config-store.js', () => ({
  loadPlan: () => loadPlanMock(),
  savePlan: (...args: unknown[]) => savePlanMock(...args),
  clearPlan: (...args: unknown[]) => clearPlanMock(...args),
  saveConfig: (...args: unknown[]) => saveConfigMock(...args),
}));

const ESC = '\x1B';
const ENTER = '\r';
const UP = '\x1B[A';
const DOWN = '\x1B[B';
const LEFT = '\x1B[D';
const RIGHT = '\x1B[C';
const TAB = '\t';

// ink-testing-library's Stdin mock overwrites its buffered `data` on every
// write; two writes issued back-to-back without a tick in between silently
// drop the first one. Ink also holds a lone ESC for up to 20ms
// (pendingInputFlushDelayMilliseconds in Ink's App component) before
// deciding it isn't the start of a longer escape sequence, so the wait
// between keystrokes needs to clear that window too.
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));
async function press(stdin: { write: (data: string) => void }, key: string): Promise<void> {
  stdin.write(key);
  await tick();
}

// A single tick is enough to let Ink process a keystroke, but async effects
// chained off of it (e.g. an awaited clipboard write's catch handler, then
// a dispatch, then a re-render) can take longer under system load. Poll
// instead of trusting a fixed delay.
async function waitForFrame(
  lastFrame: () => string | undefined,
  predicate: (frame: string) => boolean,
  timeoutMs = 2000,
): Promise<string> {
  const start = Date.now();
  for (;;) {
    const frame = lastFrame() ?? '';
    if (predicate(frame)) {
      return frame;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for frame condition; last frame:\n${frame}`);
    }
    await tick();
  }
}

async function type(stdin: { write: (data: string) => void }, text: string): Promise<void> {
  for (const ch of text) {
    await press(stdin, ch);
  }
}

async function submitPlan(stdin: { write: (data: string) => void }): Promise<void> {
  await type(stdin, '2026-06-25');
  await press(stdin, ENTER);
  await type(stdin, '2026-07-24');
  await press(stdin, ENTER);
  await type(stdin, '5000');
  await press(stdin, ENTER);
}

beforeEach(() => {
  clipboardWrite.mockClear();
  writeFileSyncMock.mockReset();
  loadPlanMock.mockReturnValue({ snap: null, invalid: false });
  savePlanMock.mockClear();
  savePlanMock.mockImplementation(() => {});
  clearPlanMock.mockClear();
  saveConfigMock.mockClear();
  buildCsvErrorOnce.armed = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the title, breadcrumb, and form', () => {
    const { lastFrame } = render(<App config={defaultConfig()} invalidConfig={false} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pacer');
    expect(frame).toContain('Pay date');
    expect(frame).toContain('Last day');
    expect(frame).toContain('Amount');
    expect(frame).toContain('Tab → settings');
  });

  it('surfaces an invalid-config notice', () => {
    const { lastFrame } = render(<App config={defaultConfig()} invalidConfig={true} />);
    expect(lastFrame() ?? '').toContain('config.toml is invalid');
  });

  it('surfaces an invalid-plan notice when config is valid', () => {
    loadPlanMock.mockReturnValue({ snap: null, invalid: true });
    const { lastFrame } = render(<App config={defaultConfig()} invalidConfig={false} />);
    expect(lastFrame() ?? '').toContain('plan.toml is invalid');
  });

  it('restores and displays the last saved plan on mount', () => {
    loadPlanMock.mockReturnValue({
      snap: {
        pay: daysFromCivil(2026, 6, 25),
        last: daysFromCivil(2026, 7, 24),
        total: 500000,
      },
      invalid: false,
    });
    const { lastFrame } = render(<App config={defaultConfig()} invalidConfig={false} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('restored your last plan');
    expect(frame).toContain('Total');
  });

  it('opens settings with Tab and returns on Escape without saving', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await press(stdin, TAB);
    expect(lastFrame() ?? '').toContain('Quantum');
    await press(stdin, ESC);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pay date');
    expect(saveConfigMock).not.toHaveBeenCalled();
  });

  it('moves the settings cursor and toggles the payout day with arrow keys', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await press(stdin, TAB);
    await press(stdin, DOWN);
    await press(stdin, DOWN);
    expect(lastFrame() ?? '').toContain('‹ Mon ›');
    await press(stdin, RIGHT);
    expect(lastFrame() ?? '').toContain('‹ Tue ›');
    await press(stdin, LEFT);
    expect(lastFrame() ?? '').toContain('‹ Mon ›');
    await press(stdin, UP);
  });

  it('saves settings with Enter on the payday field', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await press(stdin, TAB);
    await press(stdin, DOWN);
    await press(stdin, DOWN);
    await press(stdin, ENTER);
    expect(saveConfigMock).toHaveBeenCalledTimes(1);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('settings saved');
    expect(frame).toContain('Pay date');
  });

  it('loads the example plan with e and jumps straight to results', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await press(stdin, 'e');
    expect(lastFrame() ?? '').toContain('Total');
  });

  it('saves a csv export and shows a confirmation notice', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 's');
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    expect(writeFileSyncMock.mock.calls[0][0]).toBe('pacer-budget.csv');
    expect(lastFrame() ?? '').toContain('saved to');
  });

  it('shows an error notice when saving the csv export fails', async () => {
    writeFileSyncMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 's');
    expect(lastFrame() ?? '').toContain('could not save');
  });

  it('saves an ics export and shows a confirmation notice', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'i');
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    expect(writeFileSyncMock.mock.calls[0][0]).toBe('pacer-paydays.ics');
    expect(lastFrame() ?? '').toContain('saved to');
  });

  it('copies the summary to the clipboard and shows a confirmation notice', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'c');
    await waitForFrame(lastFrame, (f) => f.includes('copied to clipboard'));
    expect(clipboardWrite).toHaveBeenCalledTimes(1);
  });

  it('shows an error notice when copying to the clipboard fails', async () => {
    clipboardWrite.mockImplementationOnce(() => Promise.reject(new Error('no clipboard')));
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'c');
    await waitForFrame(lastFrame, (f) => f.includes('could not copy'));
  });

  it('requires pressing r twice within the window to reset', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'r');
    expect(lastFrame() ?? '').toContain('press r again to start over');
    await press(stdin, 'r');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pay date');
    expect(frame).not.toContain('Total');
  });

  it('cancels the reset arm when a different key is pressed', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'r');
    await press(stdin, 'x');
    await press(stdin, 'r');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('press r again to start over');
    expect(frame).toContain('Total');
  });

  it('quits with q from the results step', async () => {
    const { stdin, stdout } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'q');
    const framesAtExit = stdout.frames.length;
    // Ink's exit() unmounts the tree, so further keystrokes should reach no
    // input handler and produce no new frames — proof the app actually quit,
    // not just that it had rendered something at some point.
    await press(stdin, 'r');
    expect(stdout.frames.length).toBe(framesAtExit);
  });

  it('goes back a step with Escape from results', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, ESC);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Amount');
    expect(frame).not.toContain('Total');
  });

  it('goes back with Escape from the initial form step (a no-op on payDate)', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await press(stdin, ESC);
    expect(lastFrame() ?? '').toContain('Pay date');
  });

  it('shows an error notice when saving the csv export returns a build error', async () => {
    buildCsvErrorOnce.armed = true;
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 's');
    expect(lastFrame() ?? '').toContain('could not save: mismatched rows');
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it('shows an error notice when the plan autosave effect fails', async () => {
    savePlanMock.mockImplementation(() => {
      throw new Error('disk full');
    });
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await waitForFrame(lastFrame, (f) => f.includes('could not save your plan: Error: disk full'));
  });

  it('clears the pending reset timer on unmount without throwing', async () => {
    const { stdin, unmount } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await submitPlan(stdin);
    await press(stdin, 'r');
    expect(() => unmount()).not.toThrow();
  });

  it('types into the settings quantum, currency, and interval fields', async () => {
    const { lastFrame, stdin } = render(<App config={defaultConfig()} invalidConfig={false} />);
    await press(stdin, TAB);
    // quantumInput starts as "50.00"; DOWN moves to Currency ("R"); DOWN,DOWN
    // from there passes over Payday to reach Interval ("7").
    await type(stdin, '9');
    await press(stdin, DOWN);
    await type(stdin, '$');
    await press(stdin, DOWN);
    await press(stdin, DOWN);
    await type(stdin, '4');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('50.009');
    expect(frame).toContain('R$');
    expect(frame).toContain('74');
  });
});
