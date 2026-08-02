import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './Field.js';

describe('Field', () => {
  it('falls back to its own internal ref when no inputRef is provided', () => {
    render(<Field id="amount" label="Amount" value="5000" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Amount')).toHaveValue('5000');
  });
});
