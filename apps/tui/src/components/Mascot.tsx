import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';

export type Mood = 'idle' | 'success' | 'error';

const FRAMES: Record<Mood, readonly string[]> = {
  idle: [' ____', '(o  )=', ' \\__/'],
  success: [' ____', '(o  )=<', ' \\__/ ~'],
  error: [' \\__/', '(x  )==', '  ----'],
};

interface MascotProps {
  mood: Mood;
  theme: Theme;
}

export function Mascot({ mood, theme }: MascotProps) {
  const color = mood === 'success' ? theme.green : mood === 'error' ? theme.red : undefined;
  return (
    <Box flexDirection="column">
      {FRAMES[mood].map((line) => (
        <Text key={line} color={color} dimColor={mood === 'idle'}>
          {line}
        </Text>
      ))}
    </Box>
  );
}
