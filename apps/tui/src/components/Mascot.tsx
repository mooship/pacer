import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';

export type Mood = 'idle' | 'success' | 'error';

const FRAMES: Record<Mood, readonly string[]> = {
  idle: [' o ', '/|\\', '/ \\'],
  success: ['  o ', ' /|->', ' / \\'],
  error: [' o', '/|\\', ' \\_'],
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
