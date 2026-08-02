import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DatePopover } from './DatePopover.js';

describe('DatePopover', () => {
  it('opens the calendar dialog on click', async () => {
    const user = userEvent.setup();
    render(<DatePopover label="Pay date" value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /pick pay date from a calendar/i }));

    expect(screen.getByRole('dialog', { name: /pay date calendar/i })).toBeInTheDocument();
  });

  it('does not select a day for an invalid typed date', async () => {
    const user = userEvent.setup();
    render(<DatePopover label="Pay date" value="2026-02-30" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /pick pay date from a calendar/i }));

    const dialog = screen.getByRole('dialog', { name: /pay date calendar/i });
    expect(dialog.querySelector('[aria-selected="true"]')).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger button', async () => {
    const user = userEvent.setup();
    render(<DatePopover label="Pay date" value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: /pick pay date from a calendar/i });
    await user.click(button);
    expect(screen.getByRole('dialog', { name: /pay date calendar/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: /pay date calendar/i })).toBeNull();
    expect(button).toHaveFocus();
  });

  it('closes when clicking outside the popover', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">outside</button>
        <DatePopover label="Pay date" value="" onChange={vi.fn()} />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /pick pay date from a calendar/i }));
    expect(screen.getByRole('dialog', { name: /pay date calendar/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));

    expect(screen.queryByRole('dialog', { name: /pay date calendar/i })).toBeNull();
  });

  it('disables days before the given minimum', async () => {
    const user = userEvent.setup();
    render(<DatePopover label="Last day" value="" onChange={vi.fn()} min="2026-06-25" />);

    await user.click(screen.getByRole('button', { name: /pick last day from a calendar/i }));

    const day24 = screen.getByRole('gridcell', { name: '24' }).querySelector('button');
    const day25 = screen.getByRole('gridcell', { name: '25' }).querySelector('button');
    expect(day24).toBeDisabled();
    expect(day25).not.toBeDisabled();
  });

  it('fills the field and closes when a day is picked', async () => {
    const onChange = vi.fn();
    const onPicked = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePopover label="Pay date" value="2026-06-25" onChange={onChange} onPicked={onPicked} />,
    );

    await user.click(screen.getByRole('button', { name: /pick pay date from a calendar/i }));
    await user.click(
      screen.getByRole('gridcell', { name: '20' }).querySelector('button') as HTMLElement,
    );

    expect(onChange).toHaveBeenCalledWith('2026-06-20');
    expect(onPicked).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /pay date calendar/i })).toBeNull();
  });
});
