import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App.js';
import { usePacerStore } from './store.js';

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), daysFromCivil(2026, 6, 17)) });
});

describe('App', () => {
  it('renders the brand with every field editable at once', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Pacer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pay date')).toBeEnabled();
    expect(screen.getByLabelText('Last day it covers')).toBeEnabled();
    expect(screen.getByLabelText('Amount (R)')).toBeEnabled();
  });

  it('plans from all fields with a single submit', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Pay date'), '2026-06-25');
    await user.type(screen.getByLabelText('Last day it covers'), '2026-07-24');
    await user.type(screen.getByLabelText('Amount (R)'), '5000');
    await user.click(screen.getByRole('button', { name: /plan it/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Bridge top-up')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /top-up/i })).toBeInTheDocument();
  });

  it('shows inline invalid feedback for a bad amount and stays on the form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Pay date'), '2026-06-25');
    await user.type(screen.getByLabelText('Last day it covers'), '+30');
    const amount = screen.getByLabelText('Amount (R)');
    await user.type(amount, 'abc');
    await user.click(screen.getByRole('button', { name: /plan it/i }));

    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/enter an amount like/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('loads a worked example in one click', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /see an example/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /top-up/i })).toBeInTheDocument();
  });

  it('shows inline invalid feedback while typing an unreadable date', async () => {
    const user = userEvent.setup();
    render(<App />);

    const payInput = screen.getByLabelText('Pay date');
    await user.type(payInput, 'not-a-date');

    expect(payInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Hmm, try today/i)).toBeInTheDocument();
  });

  it('offers a calendar picker affordance on the date fields', () => {
    render(<App />);
    expect(
      screen.getByRole('button', { name: /pick pay date from a calendar/i }),
    ).toBeInTheDocument();
  });

  it('opens a calendar popover and selecting a day fills the date field', async () => {
    const user = userEvent.setup();
    render(<App />);

    const payInput = screen.getByLabelText('Pay date');
    await user.type(payInput, '2026-06-25');

    await user.click(screen.getByRole('button', { name: /pick pay date from a calendar/i }));
    const dialog = screen.getByRole('dialog', { name: /pay date calendar/i });

    await user.click(within(dialog).getByText('20'));

    expect(payInput).toHaveValue('2026-06-20');
    expect(screen.queryByRole('dialog', { name: /pay date calendar/i })).toBeNull();
  });

  it('renders results in the configured currency', async () => {
    usePacerStore.setState({
      state: initialState({ ...defaultConfig(), currency: '$' }, daysFromCivil(2026, 6, 17)),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Pay date'), '2026-06-25');
    await user.type(screen.getByLabelText('Last day it covers'), '2026-07-24');
    await user.type(screen.getByLabelText('Amount (R)'), '5000');
    await user.click(screen.getByRole('button', { name: /plan it/i }));

    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('$');
    expect(table).not.toHaveTextContent('R5');
  });
});
