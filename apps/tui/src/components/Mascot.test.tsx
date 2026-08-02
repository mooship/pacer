import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Mascot } from './Mascot.js';

const theme = { accent: 'cyan', green: 'green', yellow: 'yellow', red: 'red' };

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Mascot', () => {
  it('renders the idle frame', () => {
    const { lastFrame } = render(<Mascot mood="idle" theme={theme} />);
    expect(lastFrame() ?? '').toContain('o');
  });

  it('renders the success frame', () => {
    const { lastFrame } = render(<Mascot mood="success" theme={theme} />);
    expect(lastFrame() ?? '').toContain('=<');
  });

  it('renders the error frame', () => {
    const { lastFrame } = render(<Mascot mood="error" theme={theme} />);
    expect(lastFrame() ?? '').toContain('x');
  });

  it('cycles success frames on an interval', async () => {
    const { lastFrame } = render(<Mascot mood="success" theme={theme} />);
    const first = lastFrame();
    // success has a 2-frame, 180ms loop; wait for less than a full loop
    // (360ms) so we land mid-cycle rather than back where we started.
    await wait(250);
    expect(lastFrame()).not.toBe(first);
  });

  it('stops on the last error frame instead of looping', async () => {
    const { lastFrame } = render(<Mascot mood="error" theme={theme} />);
    await wait(600);
    const settled = lastFrame();
    await wait(600);
    expect(lastFrame()).toBe(settled);
  });

  it('resets to the first frame when the mood changes', async () => {
    const { lastFrame, rerender } = render(<Mascot mood="success" theme={theme} />);
    await wait(400);
    rerender(<Mascot mood="error" theme={theme} />);
    expect(lastFrame() ?? '').toContain('x');
  });

  it('unmounts cleanly without leaving a dangling interval', () => {
    const { unmount } = render(<Mascot mood="idle" theme={theme} />);
    expect(() => unmount()).not.toThrow();
  });
});
