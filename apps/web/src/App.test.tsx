import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App.js';
import { usePacerStore } from './store.js';

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), daysFromCivil(2026, 6, 17)) });
});

describe('App', () => {
  it('renders the brand and only the first step is enabled', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Pacer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pay date')).toBeEnabled();
    expect(screen.getByLabelText('Last day it covers')).toBeDisabled();
    expect(screen.getByLabelText('Amount (R)')).toBeDisabled();
  });

  it('advances through the wizard to a plan with an accessible table', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Pay date'), '2026-06-25');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await user.type(screen.getByLabelText('Last day it covers'), '2026-07-24');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await user.type(screen.getByLabelText('Amount (R)'), '5000');
    await user.click(screen.getByRole('button', { name: /plan it/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Bridge top-up')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /top-up/i })).toBeInTheDocument();
  });

  it('shows a validation error for a bad amount', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(screen.getByLabelText('Last day it covers'), '+30');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(screen.getByLabelText('Amount (R)'), 'abc');
    await user.click(screen.getByRole('button', { name: /plan it/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/amount must be a number/i);
  });
});
