import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePacerStore } from '../store.js';
import { SettingsDialog } from './SettingsDialog.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

describe('SettingsDialog', () => {
  it('is closed until the settings step is entered', () => {
    render(<SettingsDialog />);
    expect(screen.queryByRole('heading', { name: 'Settings' })).toBeNull();
  });

  it('opens with the current config prefilled', () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    render(<SettingsDialog />);
    expect(screen.getByLabelText(/Quantum/)).toHaveValue('50.00');
    expect(screen.getByLabelText('Currency symbol')).toHaveValue('R');
    expect(screen.getByLabelText('Every (days)')).toHaveValue('7');
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('cycles the payout day with the chevrons', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(screen.getByText('Tue')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('saves valid settings and returns to the previous step', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText(/Quantum/));
    await user.type(screen.getByLabelText(/Quantum/), '100');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(usePacerStore.getState().state.config.quantum).toBe(10000);
    expect(usePacerStore.getState().state.step).toBe('payDate');
  });

  it('shows a validation error instead of saving bad input', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Every (days)'));
    await user.type(screen.getByLabelText('Every (days)'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(usePacerStore.getState().state.step).toBe('settings');
  });

  it('cancels without saving', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText(/Quantum/));
    await user.type(screen.getByLabelText(/Quantum/), '999');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(usePacerStore.getState().state.config.quantum).toBe(defaultConfig().quantum);
    expect(usePacerStore.getState().state.step).toBe('payDate');
  });

  it('updates the currency symbol field', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Currency symbol'));
    await user.type(screen.getByLabelText('Currency symbol'), '$');

    expect(usePacerStore.getState().state.currencyInput).toBe('$');
  });

  it('still renders its fields in a browser without <dialog> showModal support', () => {
    const original = HTMLDialogElement.prototype.showModal;
    // @ts-expect-error simulating an older browser without showModal
    delete HTMLDialogElement.prototype.showModal;
    try {
      usePacerStore.getState().dispatch({ type: 'openSettings' });
      render(<SettingsDialog />);
      expect(screen.getByRole('heading', { name: 'Settings', hidden: true })).toBeInTheDocument();
      expect(screen.getByLabelText('Currency symbol')).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal = original;
    }
  });

  it('goes back without saving when the dialog is cancelled natively (Escape)', () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    render(<SettingsDialog />);

    const dialog = screen.getByRole('dialog', { hidden: true });
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(usePacerStore.getState().state.step).toBe('payDate');
  });
});
