import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePacerStore } from '../store.js';
import { Mascot } from './Mascot.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
});

describe('Mascot', () => {
  it('shows the idle variant before anything is entered', () => {
    render(<Mascot />);
    expect(screen.getByText('🐢')).toHaveAttribute('data-variant', 'idle');
  });

  it('shows the error variant when the current step has an error', () => {
    const { dispatch } = usePacerStore.getState();
    dispatch({ type: 'confirm' });
    render(<Mascot />);
    expect(screen.getByText('🐢')).toHaveAttribute('data-variant', 'error');
  });

  it('shows the success variant once a plan reaches results', () => {
    const { dispatch } = usePacerStore.getState();
    dispatch({ type: 'setPayInput', value: '2026-06-25' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setLastInput', value: '2026-07-24' });
    dispatch({ type: 'confirm' });
    dispatch({ type: 'setAmountInput', value: '5000' });
    dispatch({ type: 'confirm' });
    render(<Mascot />);
    expect(screen.getByText('🐢')).toHaveAttribute('data-variant', 'success');
  });
});
