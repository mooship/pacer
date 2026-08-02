import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePacerStore } from '../store.js';
import { PlanForm } from './PlanForm.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
});

describe('PlanForm', () => {
  it('fills the pay date from a quick-pick chip', async () => {
    const user = userEvent.setup();
    render(<PlanForm />);

    await user.click(screen.getByRole('button', { name: 'Today' }));

    expect(screen.getByLabelText('Pay date')).toHaveValue('today');
  });

  it('fills the last day from a quick-pick chip', async () => {
    const user = userEvent.setup();
    render(<PlanForm />);

    await user.click(screen.getByRole('button', { name: '+30 days' }));

    expect(screen.getByLabelText('Last day it covers')).toHaveValue('+30');
  });

  it('focuses the first empty field on mount', () => {
    render(<PlanForm />);
    expect(screen.getByLabelText('Pay date')).toHaveFocus();
  });

  it('focuses the first invalid field on a failed submit', async () => {
    const user = userEvent.setup();
    render(<PlanForm />);

    await user.type(screen.getByLabelText('Pay date'), '2026-06-25');
    await user.click(screen.getByRole('button', { name: /plan it/i }));

    expect(screen.getByLabelText('Last day it covers')).toHaveFocus();
  });
});
