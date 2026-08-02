import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './Field.js';

const theme = { accent: 'cyan', green: 'green', yellow: 'yellow', red: 'red' };

describe('Field', () => {
  it('shows the placeholder when inactive and empty', () => {
    const { lastFrame } = render(
      <Field
        label="Pay date"
        labelWidth={18}
        value=""
        active={false}
        done={false}
        theme={theme}
        placeholder="today, +7, or 2026-07-25"
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pay date');
    expect(frame).toContain('today, +7, or 2026-07-25');
  });

  it('shows the value when inactive and filled', () => {
    const { lastFrame } = render(
      <Field
        label="Pay date"
        labelWidth={18}
        value="2026-06-25"
        active={false}
        done={true}
        theme={theme}
      />,
    );
    expect(lastFrame() ?? '').toContain('2026-06-25');
  });

  it('renders an editable text input when active', () => {
    const { lastFrame } = render(
      <Field
        label="Amount"
        labelWidth={18}
        value="5000"
        active={true}
        done={false}
        theme={theme}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(lastFrame() ?? '').toContain('5000');
  });

  it('renders a preview arrow when a preview is supplied', () => {
    const { lastFrame } = render(
      <Field
        label="Pay date"
        labelWidth={18}
        value="today"
        active={false}
        done={true}
        theme={theme}
        preview="Thu 25 Jun 2026"
      />,
    );
    expect(lastFrame() ?? '').toContain('→ Thu 25 Jun 2026');
  });
});
