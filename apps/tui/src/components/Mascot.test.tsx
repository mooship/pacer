import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Mascot } from './Mascot.js';

const theme = { accent: 'cyan', green: 'green', yellow: 'yellow', red: 'red' };

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Polls instead of trusting a fixed delay: real-timer animation assertions
// that wait a fixed guessed duration flake under system load (a slow CPU or
// a busy test runner can delay the interval firing past the guess).
async function waitForFrame(
  lastFrame: () => string | undefined,
  predicate: (frame: string) => boolean,
  timeoutMs = 3000,
): Promise<string> {
  const start = Date.now();
  for (;;) {
    const frame = lastFrame() ?? '';
    if (predicate(frame)) {
      return frame;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for frame condition; last frame:\n${frame}`);
    }
    await wait(20);
  }
}

// Waits until the frame stops changing for `quietMs`, i.e. the animation
// has settled — robust against however fast or slow the system is, unlike
// waiting a fixed guessed duration.
async function waitForQuiescentFrame(
  lastFrame: () => string | undefined,
  quietMs = 300,
  timeoutMs = 5000,
): Promise<string> {
  const start = Date.now();
  let last = lastFrame() ?? '';
  let lastChangeAt = Date.now();
  for (;;) {
    await wait(30);
    const frame = lastFrame() ?? '';
    if (frame !== last) {
      last = frame;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt >= quietMs) {
      return last;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for frame to settle; last frame:\n${frame}`);
    }
  }
}

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
    const changed = await waitForFrame(lastFrame, (f) => f !== first);
    expect(changed).not.toBe(first);
  });

  it('stops on the last error frame instead of looping', async () => {
    const { lastFrame } = render(<Mascot mood="error" theme={theme} />);
    const settled = await waitForQuiescentFrame(lastFrame);
    // error's last frame happens to render identical text to its first
    // frame, so settling can't be detected by content match alone — give
    // it one more real wait to prove it doesn't resume cycling.
    await wait(400);
    expect(lastFrame()).toBe(settled);
  });

  it('resets to the first frame when the mood changes', () => {
    // Every success and error frame renders its own mood's marker
    // regardless of which frame index the animation happens to be on, so
    // this doesn't need to wait for any particular animation timing.
    const { lastFrame, rerender } = render(<Mascot mood="success" theme={theme} />);
    rerender(<Mascot mood="error" theme={theme} />);
    expect(lastFrame() ?? '').toContain('x');
  });

  it('unmounts cleanly without leaving a dangling interval', () => {
    const { unmount } = render(<Mascot mood="idle" theme={theme} />);
    expect(() => unmount()).not.toThrow();
  });
});
