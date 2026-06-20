import { daysFromCivil } from '@pacer/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const planParams = {
  p: daysFromCivil(2026, 6, 25),
  l: daysFromCivil(2026, 7, 24),
  t: 500000,
  b: 0,
};

describe('usePacerStore initial state', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.resetModules();
  });

  it('restores a stored plan straight to results', async () => {
    localStorage.setItem(
      'pacer.plan',
      JSON.stringify({ pay: planParams.p, last: planParams.l, total: planParams.t, boost: 0 }),
    );
    const { usePacerStore } = await import('./store.js');
    const s = usePacerStore.getState().state;
    expect(s.step).toBe('results');
    expect(s.total).toBe(500000);
    expect(s.notice).toBe('restored your last plan');
  });

  it('restores a plan from the URL ahead of localStorage', async () => {
    window.history.replaceState(null, '', `/?p=${planParams.p}&l=${planParams.l}&t=400000&b=0`);
    const { usePacerStore } = await import('./store.js');
    const s = usePacerStore.getState().state;
    expect(s.step).toBe('results');
    expect(s.total).toBe(400000);
  });

  it('surfaces a notice when stored config is invalid at load time', async () => {
    localStorage.setItem('pacer.config', JSON.stringify({ quantum: 'bad' }));
    const { usePacerStore } = await import('./store.js');
    expect(usePacerStore.getState().state.notice).toBe(
      'stored settings were invalid; using defaults',
    );
  });

  it('has no notice when stored config is valid', async () => {
    localStorage.setItem('pacer.config', JSON.stringify({ quantum: 10000 }));
    const { usePacerStore } = await import('./store.js');
    expect(usePacerStore.getState().state.notice).toBeNull();
  });

  it('has no notice when nothing is stored', async () => {
    const { usePacerStore } = await import('./store.js');
    expect(usePacerStore.getState().state.notice).toBeNull();
  });
});
