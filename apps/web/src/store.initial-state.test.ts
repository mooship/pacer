import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('usePacerStore initial state', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
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
