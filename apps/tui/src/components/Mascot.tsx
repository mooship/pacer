import type { Mood } from '@pacer/core';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { Theme } from '../theme.js';

const FRAMES: Record<Mood, readonly (readonly string[])[]> = {
  idle: [
    [' ____', '(o  )=', ' \\__/'],
    [' ____', '(-  )=', ' \\__/'],
  ],
  success: [
    [' ____', '(o  )=<', ' \\__/ ~'],
    [' ____', '(o  )=<', ' \\__/~~'],
  ],
  error: [
    [' \\__/', '(x  )==', '  ----'],
    ['\\__/', '(x  )==', ' ----'],
    ['  \\__/', ' (x  )==', '   ----'],
    [' \\__/', '(x  )==', '  ----'],
  ],
};

const INTERVAL_MS: Record<Mood, number> = {
  idle: 900,
  success: 180,
  error: 110,
};

interface MascotProps {
  mood: Mood;
  theme: Theme;
}

export function Mascot({ mood, theme }: MascotProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const frames = FRAMES[mood];
    const loops = mood !== 'error';
    const id = setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (next < frames.length) {
          return next;
        }
        if (loops) {
          return 0;
        }
        clearInterval(id);
        return f;
      });
    }, INTERVAL_MS[mood]);
    return () => clearInterval(id);
  }, [mood]);

  const color = mood === 'success' ? theme.green : mood === 'error' ? theme.red : undefined;
  const lines = FRAMES[mood][frame];

  return (
    <Box flexDirection="column">
      {lines.map((line) => (
        <Text key={line} color={color} dimColor={mood === 'idle'}>
          {line}
        </Text>
      ))}
    </Box>
  );
}
