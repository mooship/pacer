import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAN_KEY, STORAGE_KEY } from '../store.js';
import { ErrorBoundary } from './ErrorBoundary.js';

function Boom(): never {
  throw new Error('kaboom');
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing has crashed', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('shows a crash notice instead of the broken tree', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
    expect(console.error).toHaveBeenCalled();
  });

  it('clears saved config and plan and reloads on "Start over"', async () => {
    localStorage.setItem(STORAGE_KEY, '{"quantum":5000}');
    localStorage.setItem(PLAN_KEY, '{"pay":1}');
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Start over' }));

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(PLAN_KEY)).toBeNull();
  });
});
