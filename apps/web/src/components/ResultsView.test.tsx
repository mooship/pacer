import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePacerStore } from '../store.js';
import { ResultsView } from './ResultsView.js';

const TODAY = daysFromCivil(2026, 6, 17);

function reachResults(): void {
  const { dispatch } = usePacerStore.getState();
  dispatch({ type: 'setPayInput', value: '2026-06-25' });
  dispatch({ type: 'confirm' });
  dispatch({ type: 'setLastInput', value: '2026-07-24' });
  dispatch({ type: 'confirm' });
  dispatch({ type: 'setAmountInput', value: '5000' });
  dispatch({ type: 'confirm' });
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY), pendingAction: null });
  reachResults();
});

describe('ResultsView', () => {
  it('renders nothing before a plan reaches results', () => {
    usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
    const { container } = render(<ResultsView />);
    expect(container).toBeEmptyDOMElement();
  });

  it('focuses the summary on mount so keyboard/screen-reader users land somewhere meaningful', () => {
    render(<ResultsView />);
    expect(screen.getByText(/R5,000\.00 from/)).toHaveFocus();
  });

  it('goes back to editing on Edit', async () => {
    const user = userEvent.setup();
    render(<ResultsView />);
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(usePacerStore.getState().state.step).toBe('amount');
  });

  it('downloads a CSV via the Download CSV button', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ResultsView />);

    await user.click(screen.getByRole('button', { name: /download csv/i }));

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(usePacerStore.getState().state.notice).toBe('plan downloaded');
    vi.restoreAllMocks();
  });

  it('exports a calendar via the Calendar button', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ResultsView />);

    await user.click(screen.getByRole('button', { name: /calendar/i }));

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(usePacerStore.getState().state.notice).toBe('calendar exported');
    vi.restoreAllMocks();
  });

  it('copies the summary via the Copy button', async () => {
    // userEvent's own setup() installs a clipboard shim, so the stub must be
    // applied after setup() or userEvent clobbers it before the click fires.
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<ResultsView />);

    await user.click(screen.getByRole('button', { name: /^copy$/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(usePacerStore.getState().state.notice).toBe('copied to clipboard');
    vi.unstubAllGlobals();
  });

  it('copies the share link via the Share button', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<ResultsView />);

    await user.click(screen.getByRole('button', { name: /share/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
    expect(usePacerStore.getState().state.notice).toBe('link copied');
    vi.unstubAllGlobals();
  });

  it('disables Copy and Share while an action is pending', () => {
    usePacerStore.setState({ pendingAction: 'copy' });
    render(<ResultsView />);
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
  });

  describe('start over', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('requires a second click within the window to reset', () => {
      render(<ResultsView />);

      fireEvent.click(screen.getByRole('button', { name: /start over/i }));
      expect(screen.getByRole('button', { name: /click again to confirm/i })).toBeInTheDocument();
      expect(usePacerStore.getState().state.step).toBe('results');

      fireEvent.click(screen.getByRole('button', { name: /click again to confirm/i }));
      expect(usePacerStore.getState().state.step).toBe('payDate');
    });

    it('disarms itself after the confirmation window elapses', () => {
      render(<ResultsView />);

      fireEvent.click(screen.getByRole('button', { name: /start over/i }));
      expect(screen.getByRole('button', { name: /click again to confirm/i })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByRole('button', { name: /^start over$/i })).toBeInTheDocument();
      expect(usePacerStore.getState().state.step).toBe('results');
    });
  });
});
