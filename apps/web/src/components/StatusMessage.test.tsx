import { daysFromCivil, defaultConfig, initialState } from '@pacer/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePacerStore } from '../store.js';
import { StatusMessage } from './StatusMessage.js';

const TODAY = daysFromCivil(2026, 6, 17);

beforeEach(() => {
  localStorage.clear();
  usePacerStore.setState({ state: initialState(defaultConfig(), TODAY) });
});

describe('StatusMessage', () => {
  it('renders nothing when there is no notice or error', () => {
    const { container } = render(<StatusMessage />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders an alert for an error', () => {
    usePacerStore.setState((s) => ({ state: { ...s.state, error: 'something broke' } }));
    render(<StatusMessage />);
    expect(screen.getByRole('alert')).toHaveTextContent('something broke');
  });

  it('renders a notice when there is no error', () => {
    usePacerStore.setState((s) => ({ state: { ...s.state, notice: 'saved' } }));
    render(<StatusMessage />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('saved')).toBeInTheDocument();
  });

  it('prefers the error over a simultaneous notice', () => {
    usePacerStore.setState((s) => ({
      state: { ...s.state, error: 'bad', notice: 'good' },
    }));
    render(<StatusMessage />);
    expect(screen.getByRole('alert')).toHaveTextContent('bad');
    expect(screen.queryByText('good')).toBeNull();
  });

  it('suppresses the error while on the settings step', () => {
    usePacerStore.setState((s) => ({
      state: { ...s.state, step: 'settings', error: 'bad' },
    }));
    render(<StatusMessage />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
