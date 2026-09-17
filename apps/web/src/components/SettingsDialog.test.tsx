import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePacerStore } from '../store.js';
import { SettingsDialog } from './SettingsDialog.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY), notifyEnabled: false });
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
    expect(screen.getByLabelText('Currency')).toHaveValue('USD');
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

  it('shows live invalid feedback on the quantum field while typing, before Save', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText(/Quantum/));
    await user.type(screen.getByLabelText(/Quantum/), 'abc');

    const quantum = screen.getByLabelText(/Quantum/);
    expect(quantum).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter an amount like 50 or 50.00.')).toBeInTheDocument();
    expect(usePacerStore.getState().state.step).toBe('settings');
  });

  it('shows a live preview once the quantum is valid', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText(/Quantum/));
    await user.type(screen.getByLabelText(/Quantum/), '100');

    expect(screen.getByLabelText(/Quantum/)).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('shows live invalid feedback on the interval field while typing', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Every (days)'));
    await user.type(screen.getByLabelText('Every (days)'), 'abc');

    expect(screen.getByLabelText('Every (days)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a whole number of days, like 7 or 14.')).toBeInTheDocument();
  });

  it('names an unrecognized currency as invalid while typing, quoting what was typed', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Currency'));
    await user.type(screen.getByLabelText('Currency'), 'ZZZZ');

    expect(screen.getByLabelText('Currency')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('"ZZZZ" isn\'t a recognized currency code.')).toBeInTheDocument();
  });

  it('shows the resolved currency name as a live preview once valid', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Currency'));
    await user.type(screen.getByLabelText('Currency'), 'eur');

    expect(screen.getByLabelText('Currency')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Euro')).toBeInTheDocument();
  });

  it('rejects an unrecognized currency on Save instead of silently falling back to a default', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Currency'));
    await user.type(screen.getByLabelText('Currency'), 'ZZZZ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/isn't a recognized currency code/i);
    expect(usePacerStore.getState().state.config.currency).toBe('USD');
    expect(usePacerStore.getState().state.step).toBe('settings');
  });

  it('rejects a blank currency on Save instead of silently defaulting to USD', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Currency'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/enter a currency code/i);
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

  it('updates the currency field by typing a code', async () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.clear(screen.getByLabelText('Currency'));
    await user.type(screen.getByLabelText('Currency'), 'ZAR');

    expect(usePacerStore.getState().state.currencyInput).toBe('ZAR');
  });

  it('offers every currency as a searchable datalist option', () => {
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const { container } = render(<SettingsDialog />);

    const input = screen.getByLabelText('Currency');
    expect(input).toHaveAttribute('list', 'currency-options');
    const datalist = container.querySelector('#currency-options');
    expect(datalist?.querySelector('option[value="USD"]')).toHaveTextContent('USD — US Dollar');
    expect(datalist?.querySelector('option[value="ZAR"]')).toHaveTextContent(
      'ZAR — South African Rand',
    );
  });

  it('still renders its fields in a browser without <dialog> showModal support', () => {
    const original = HTMLDialogElement.prototype.showModal;
    // @ts-expect-error simulating an older browser without showModal
    delete HTMLDialogElement.prototype.showModal;
    try {
      usePacerStore.getState().dispatch({ type: 'openSettings' });
      render(<SettingsDialog />);
      expect(screen.getByRole('heading', { name: 'Settings', hidden: true })).toBeInTheDocument();
      expect(screen.getByLabelText('Currency')).toBeInTheDocument();
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

describe('notification toggle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reflects the current preference', () => {
    usePacerStore.setState({ notifyEnabled: true });
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    render(<SettingsDialog />);
    expect(screen.getByLabelText('Notify me on payout day')).toBeChecked();
  });

  it('enables notifications once permission is granted', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.click(screen.getByLabelText('Notify me on payout day'));

    expect(usePacerStore.getState().notifyEnabled).toBe(true);
  });

  it('surfaces an error when permission is denied', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });
    usePacerStore.getState().dispatch({ type: 'openSettings' });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.click(screen.getByLabelText('Notify me on payout day'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked/i);
  });
});
