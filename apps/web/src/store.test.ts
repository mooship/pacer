import { daysFromCivil, defaultConfig, examplePlan, initialState } from '@pacer/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTIFY_KEY } from './notify.js';
import { loadStoredConfig, SPENT_KEY, usePacerStore } from './store.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({
    state: initialState(defaultConfig(), TODAY),
    spent: new Set(),
    notifyEnabled: false,
    pendingAction: null,
  });
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
    expect(store().state.error).toBe('amount must be a number, got `abc`');
    expect(localStorage.getItem('pacer.config')).toBeNull();
  });

  it('persists a custom currency code', () => {
    const { dispatch, saveSettings } = store();
    dispatch({ type: 'openSettings' });
    dispatch({ type: 'setCurrencyInput', value: 'USD' });
    saveSettings();

    expect(store().state.config.currency).toBe('USD');
    const stored = JSON.parse(localStorage.getItem('pacer.config') ?? '{}');
    expect(stored).toMatchObject({ currency: 'USD' });
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
    expect(stored).toMatchObject({ total: 500000 });
    expect(window.location.search).toContain('t=500000');
  });

  it('clears the stored plan and URL on reset', () => {
    reachResults();
    store().dispatch({ type: 'reset' });
    expect(localStorage.getItem('pacer.plan')).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('surfaces an error instead of failing silently when the URL cannot be updated', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    reachResults();
    expect(store().state.error).toContain('could not update the share link');
    replaceState.mockRestore();
  });

  it('surfaces an error instead of failing silently when clearing the URL fails', () => {
    reachResults();
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    store().dispatch({ type: 'reset' });
    expect(store().state.error).toContain('could not update the share link');
    replaceState.mockRestore();
  });

  it('surfaces an error instead of failing silently when localStorage.setItem fails', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    reachResults();
    expect(store().state.error).toContain('could not save your plan');
    setItem.mockRestore();
  });

  it('surfaces an error instead of failing silently when localStorage.removeItem fails', () => {
    reachResults();
    const removeItem = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    store().dispatch({ type: 'reset' });
    expect(store().state.error).toContain('could not clear your saved plan');
    removeItem.mockRestore();
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

  it('reports an error when the clipboard write fails', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    reachResults();
    await store().copyShareLink();
    expect(store().state.error).toBe('could not copy link');
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

  it('surfaces a build error instead of downloading a malformed csv', () => {
    reachResults();
    // buildCsv validates its input's array lengths; state.results can only
    // reach this shape by direct injection, not through the reducer, but
    // exportCsv should still handle it instead of downloading garbage.
    usePacerStore.setState((s) => ({
      state: { ...s.state, results: { dates: [0, 1], segDays: [1], amounts: [100, 200] } },
    }));

    store().exportCsv();

    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(store().state.error).toContain('matching lengths');
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
  const setLanguage = (language: string) => {
    Object.defineProperty(navigator, 'language', { value: language, configurable: true });
  };
  const originalLanguage = navigator.language;

  const setTimeZone = (timeZone: string) => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone,
      locale: 'en',
      calendar: 'gregory',
      numberingSystem: 'latn',
    } as Intl.ResolvedDateTimeFormatOptions);
  };

  afterEach(() => {
    setLanguage(originalLanguage);
    vi.restoreAllMocks();
  });

  it('reads a persisted config back', () => {
    localStorage.setItem(
      'pacer.config',
      JSON.stringify({ quantum: 10000, payday: 3, interval: 7 }),
    );
    expect(loadStoredConfig()).toEqual({
      config: { quantum: 10000, payday: 3, interval: 7, currency: 'USD' },
      invalid: false,
    });
  });

  it('falls back to defaults when nothing is stored and locale detection is unavailable', () => {
    setLanguage('not-a-locale-tag-!!!');
    expect(loadStoredConfig()).toEqual({ config: defaultConfig(), invalid: false });
  });

  it('detects the currency from the browser locale on a first-ever visit', () => {
    setLanguage('en-GB');
    expect(loadStoredConfig()).toEqual({
      config: { ...defaultConfig(), currency: 'GBP' },
      invalid: false,
    });
  });

  it('falls back to the default currency when the locale has no known mapping', () => {
    setLanguage('en-AQ');
    expect(loadStoredConfig()).toEqual({ config: defaultConfig(), invalid: false });
  });

  it('does not override an already-stored currency with locale detection', () => {
    setLanguage('en-GB');
    localStorage.setItem('pacer.config', JSON.stringify({ currency: 'JPY' }));
    expect(loadStoredConfig().config.currency).toBe('JPY');
  });

  it('detects the currency from the device time zone on a first-ever visit', () => {
    setTimeZone('Africa/Johannesburg');
    expect(loadStoredConfig().config.currency).toBe('ZAR');
  });

  it('prefers the time zone over a language region that disagrees with it', () => {
    setTimeZone('Africa/Johannesburg');
    setLanguage('en-GB');
    expect(loadStoredConfig().config.currency).toBe('ZAR');
  });

  it('falls back to language detection when the time zone has no known mapping', () => {
    setTimeZone('Antarctica/Vostok');
    setLanguage('en-GB');
    expect(loadStoredConfig().config.currency).toBe('GBP');
  });

  it('falls back to language detection when reading the time zone throws', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('unsupported');
    });
    setLanguage('en-GB');
    expect(loadStoredConfig().config.currency).toBe('GBP');
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

describe('spend tracking', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('does nothing before a plan is showing results', () => {
    store().toggleSpent(TODAY);
    expect(store().spent.size).toBe(0);
    expect(localStorage.getItem(SPENT_KEY)).toBeNull();
  });

  it('marks a payout date as spent and persists it against the plan', () => {
    reachResults();
    const date = store().state.results?.dates[0] as number;

    store().toggleSpent(date);

    expect(store().spent.has(date)).toBe(true);
    const stored = JSON.parse(localStorage.getItem(SPENT_KEY) ?? '{}');
    expect(stored.dates).toEqual([date]);
    expect(stored.plan).toMatchObject({ total: 500000 });
  });

  it('unmarks a date that was already marked', () => {
    reachResults();
    const date = store().state.results?.dates[0] as number;
    store().toggleSpent(date);

    store().toggleSpent(date);

    expect(store().spent.has(date)).toBe(false);
    const stored = JSON.parse(localStorage.getItem(SPENT_KEY) ?? '{}');
    expect(stored.dates).toEqual([]);
  });

  it('surfaces an error instead of failing silently when persisting spent dates fails', () => {
    reachResults();
    const date = store().state.results?.dates[0] as number;
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    store().toggleSpent(date);

    expect(store().state.error).toContain('could not save your progress');
    setItem.mockRestore();
  });

  it('resets marked dates when the plan changes', () => {
    reachResults();
    const date = store().state.results?.dates[0] as number;
    store().toggleSpent(date);
    expect(store().spent.size).toBe(1);

    store().dispatch({ type: 'reset' });

    expect(store().spent.size).toBe(0);
  });

  it('keeps marked dates when re-entering the same results without changing the plan', () => {
    reachResults();
    const date = store().state.results?.dates[0] as number;
    store().toggleSpent(date);

    store().dispatch({ type: 'back' });
    store().dispatch({ type: 'confirm' });

    expect(store().spent.has(date)).toBe(true);
  });

  it('restores marked dates for a plan matching what is already in storage', () => {
    reachResults();
    const date = store().state.results?.dates[0] as number;
    store().toggleSpent(date);
    store().dispatch({ type: 'reset' });
    expect(store().spent.size).toBe(0);

    reachResults();

    expect(store().spent.has(date)).toBe(true);
  });

  it('ignores a spent record left over from a different plan', () => {
    localStorage.setItem(
      SPENT_KEY,
      JSON.stringify({ plan: { pay: 1, last: 2, total: 3 }, dates: [1] }),
    );
    reachResults();
    expect(store().spent.size).toBe(0);
  });

  it('ignores a malformed spent record', () => {
    localStorage.setItem(SPENT_KEY, 'not json');
    reachResults();
    expect(store().spent.size).toBe(0);
  });

  it('ignores a spent record with a non-array dates field', () => {
    const { pay, last, total } = examplePlan(TODAY);
    localStorage.setItem(SPENT_KEY, JSON.stringify({ plan: { pay, last, total }, dates: 'nope' }));
    store().dispatch({ type: 'restorePlan', snap: examplePlan(TODAY) });
    expect(store().spent.size).toBe(0);
  });
});

describe('notifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enables notifications once permission is granted', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });

    await store().setNotifyEnabled(true);

    expect(store().notifyEnabled).toBe(true);
    expect(localStorage.getItem(NOTIFY_KEY)).toBe('1');
    expect(store().state.error).toBeNull();
  });

  it('surfaces an error when the browser blocks the permission request', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });

    await store().setNotifyEnabled(true);

    expect(store().notifyEnabled).toBe(false);
    expect(store().state.error).toBe('notifications were blocked by your browser');
  });

  it('disables notifications without touching the error state', async () => {
    localStorage.setItem(NOTIFY_KEY, '1');
    usePacerStore.setState({ notifyEnabled: true });

    await store().setNotifyEnabled(false);

    expect(store().notifyEnabled).toBe(false);
    expect(localStorage.getItem(NOTIFY_KEY)).toBeNull();
    expect(store().state.error).toBeNull();
  });
});
