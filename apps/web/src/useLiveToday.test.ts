import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePacerStore } from './store.js';
import { useLiveToday } from './useLiveToday.js';

const TODAY = daysFromCivil(2026, 6, 17);
const TOMORROW = daysFromCivil(2026, 6, 18);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 17, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
});

describe('useLiveToday', () => {
  it('leaves today alone while the wall-clock date has not changed', () => {
    renderHook(() => useLiveToday());

    vi.advanceTimersByTime(60_000);

    expect(usePacerStore.getState().state.today).toBe(TODAY);
  });

  it('advances today on the periodic check once the date rolls over', () => {
    renderHook(() => useLiveToday());
    vi.setSystemTime(new Date(2026, 5, 18, 0, 0, 1));

    vi.advanceTimersByTime(60_000);

    expect(usePacerStore.getState().state.today).toBe(TOMORROW);
  });

  it('advances today on visibilitychange once the date rolls over', () => {
    renderHook(() => useLiveToday());
    vi.setSystemTime(new Date(2026, 5, 18, 0, 0, 1));

    document.dispatchEvent(new Event('visibilitychange'));

    expect(usePacerStore.getState().state.today).toBe(TOMORROW);
  });

  it('does not check while the tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    renderHook(() => useLiveToday());
    vi.setSystemTime(new Date(2026, 5, 18, 0, 0, 1));

    vi.advanceTimersByTime(60_000);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(usePacerStore.getState().state.today).toBe(TODAY);
  });

  it('cleans up its listener and interval on unmount', () => {
    const { unmount } = renderHook(() => useLiveToday());
    unmount();
    vi.setSystemTime(new Date(2026, 5, 18, 0, 0, 1));

    vi.advanceTimersByTime(60_000);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(usePacerStore.getState().state.today).toBe(TODAY);
  });
});
