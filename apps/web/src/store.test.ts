import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePacerStore } from './store.js';

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
