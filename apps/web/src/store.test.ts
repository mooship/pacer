import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadStoredConfig, usePacerStore } from './store.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
});

const store = () => usePacerStore.getState();

describe('pacer store', () => {
  it('walks the flow to a results plan', () => {
    const { dispatch } = store();
    dispatch({ type: 'setPayInput', value: '2026-06-25' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setLastInput', value: '2026-07-24' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setAmountInput', value: '5000' });
    dispatch({ type: 'confirm' });

    const s = store().state;
    expect(s.step).toBe('results');
    expect(s.total).toBe(500000);
    expect(s.results?.amounts.reduce((a, b) => a + b, 0)).toBe(500000);
    expect(s.boostMax).toBeGreaterThan(0);
  });

  it('clamps the boost to the recurring total', () => {
    const { dispatch } = store();
    dispatch({ type: 'setPayInput', value: '2026-06-25' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setLastInput', value: '2026-07-24' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setAmountInput', value: '5000' });
    dispatch({ type: 'confirm' });

    dispatch({ type: 'boostUp' });
    expect(store().state.boost).toBe(5000);
    dispatch({ type: 'boostToMax' });
    expect(store().state.boost).toBe(store().state.boostMax);
    dispatch({ type: 'setBoost', value: 9_999_999 });
    expect(store().state.boost).toBe(store().state.boostMax);
  });

  it('persists settings to localStorage and reloads them', () => {
    const { dispatch, saveSettings } = store();
    dispatch({ type: 'openSettings' });
    dispatch({ type: 'setQuantumInput', value: '100' });
    dispatch({ type: 'setIntervalInput', value: '14' });
    saveSettings();

    expect(store().state.config.quantum).toBe(10000);
    expect(store().state.config.interval).toBe(14);
    expect(store().state.notice).toBe('settings saved');

    const stored = JSON.parse(localStorage.getItem('pacer.config') ?? '{}');
    expect(stored).toMatchObject({ quantum: 10000, interval: 14 });
  });

  it('rejects an invalid quantum without persisting', () => {
    const { dispatch, saveSettings } = store();
    dispatch({ type: 'openSettings' });
    dispatch({ type: 'setQuantumInput', value: 'abc' });
    saveSettings();
    expect(store().state.error).not.toBeNull();
    expect(localStorage.getItem('pacer.config')).toBeNull();
  });
});

const reachResults = () => {
  const { dispatch } = store();
  dispatch({ type: 'setPayInput', value: '2026-06-25' });
  dispatch({ type: 'confirm' });
  dispatch({ type: 'setLastInput', value: '2026-07-24' });
  dispatch({ type: 'confirm' });
  dispatch({ type: 'setAmountInput', value: '5000' });
  dispatch({ type: 'confirm' });
};

describe('plan persistence', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('persists a plan snapshot to localStorage and the URL on results', () => {
    reachResults();
    const stored = JSON.parse(localStorage.getItem('pacer.plan') ?? '{}');
    expect(stored).toMatchObject({ total: 500000, boost: 0 });
    expect(window.location.search).toContain('t=500000');
  });

  it('clears the stored plan and URL on reset', () => {
    reachResults();
    store().dispatch({ type: 'reset' });
    expect(localStorage.getItem('pacer.plan')).toBeNull();
    expect(window.location.search).toBe('');
  });
});

describe('exportIcs', () => {
  const blobs: Blob[] = [];

  beforeEach(() => {
    blobs.length = 0;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:mock';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the paydays as a calendar blob and notes it', async () => {
    reachResults();
    store().exportIcs();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(blobs).toHaveLength(1);
    expect(await blobs[0].text()).toContain('BEGIN:VCALENDAR');
    expect(store().state.notice).toBe('calendar exported');
  });

  it('does nothing before there is a plan', () => {
    store().exportIcs();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});

describe('copyShareLink', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copies the current location once a plan exists', async () => {
    reachResults();
    await store().copyShareLink();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
    expect(store().state.notice).toBe('link copied');
  });

  it('does nothing before there is a plan', async () => {
    await store().copyShareLink();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});

describe('exportCsv', () => {
  const blobs: Blob[] = [];

  beforeEach(() => {
    blobs.length = 0;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:mock';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the plan as a CSV blob and notes it', async () => {
    const { dispatch, exportCsv } = store();
    dispatch({ type: 'setPayInput', value: '2026-06-25' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setLastInput', value: '2026-07-24' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setAmountInput', value: '5000' });
    dispatch({ type: 'confirm' });

    exportCsv();

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(blobs).toHaveLength(1);
    expect(await blobs[0].text()).toContain('Pay date,Covers,Days,Amount,Per day');
    expect(store().state.notice).toBe('plan downloaded');
  });

  it('does nothing before there is a plan', () => {
    store().exportCsv();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(blobs).toHaveLength(0);
  });
});

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copies the plan as text and notes it', async () => {
    const { dispatch, copyToClipboard } = store();
    dispatch({ type: 'setPayInput', value: '2026-06-25' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setLastInput', value: '2026-07-24' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setAmountInput', value: '5000' });
    dispatch({ type: 'confirm' });

    await copyToClipboard();

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Pacer plan:'),
    );
    expect(store().state.notice).toBe('copied to clipboard');
  });

  it('does nothing before there is a plan', async () => {
    await store().copyToClipboard();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('reports an error when the clipboard write fails', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const { dispatch, copyToClipboard } = store();
    dispatch({ type: 'setPayInput', value: '2026-06-25' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setLastInput', value: '2026-07-24' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setAmountInput', value: '5000' });
    dispatch({ type: 'confirm' });

    await copyToClipboard();

    expect(store().state.error).toBe('could not copy to clipboard');
  });
});

describe('loadStoredConfig', () => {
  it('reads a persisted config back', () => {
    localStorage.setItem(
      'pacer.config',
      JSON.stringify({ quantum: 10000, payday: 3, interval: 7 }),
    );
    expect(loadStoredConfig()).toEqual({
      config: { quantum: 10000, payday: 3, interval: 7, currency: 'R' },
      invalid: false,
    });
  });

  it('falls back to defaults when nothing is stored', () => {
    expect(loadStoredConfig()).toEqual({ config: defaultConfig(), invalid: false });
  });

  it('falls back to defaults for unparseable storage', () => {
    localStorage.setItem('pacer.config', 'not json');
    expect(loadStoredConfig()).toEqual({ config: defaultConfig(), invalid: true });
  });

  it('falls back to defaults and flags invalid stored data', () => {
    localStorage.setItem('pacer.config', JSON.stringify({ quantum: 'bad' }));
    expect(loadStoredConfig()).toEqual({ config: defaultConfig(), invalid: true });
  });
});
