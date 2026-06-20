import { type ComputeResult, coverEnd, fmtMoney, fmtRange, fmtWdDm, perDay } from '@pacer/core';
import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';

const WIDTHS = [13, 16, 6, 12, 12] as const;
const pad = (s: string, w: number): string => s.padEnd(w).slice(0, w);

interface ResultsProps {
  results: ComputeResult;
  total: number;
  boost: number;
  theme: Theme;
}

export function Results({ results, total, boost, theme }: ResultsProps) {
  const { dates, segDays, amounts } = results;
  const totalDays = segDays.reduce((a, b) => a + b, 0);

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{'  Bridge top-up  '}</Text>
        <Text color={theme.yellow} bold>
          {fmtMoney(boost)}
        </Text>
        <Text dimColor>{'   ↑/↓ to move money into the first, shorter payment'}</Text>
      </Box>
      <Box borderStyle="round" flexDirection="column" paddingX={1}>
        <Box>
          <Text color={theme.accent} bold>
            {pad('Pay', WIDTHS[0])}
            {pad('Covers', WIDTHS[1])}
            {pad('Days', WIDTHS[2])}
            {pad('Amount', WIDTHS[3])}
            {pad('Per day', WIDTHS[4])}
          </Text>
        </Box>
        {dates.map((d, i) => {
          const dim = i % 2 === 1;
          return (
            <Box key={d}>
              <Text color={i === 0 ? theme.yellow : undefined} dimColor={dim}>
                {pad(fmtWdDm(d), WIDTHS[0])}
              </Text>
              <Text dimColor={dim}>{pad(fmtRange(d, coverEnd(d, segDays[i])), WIDTHS[1])}</Text>
              <Text dimColor={dim}>{pad(String(segDays[i]), WIDTHS[2])}</Text>
              <Text color={theme.green} dimColor={dim}>
                {pad(fmtMoney(amounts[i]), WIDTHS[3])}
              </Text>
              <Text dimColor>{pad(fmtMoney(perDay(amounts[i], segDays[i])), WIDTHS[4])}</Text>
            </Box>
          );
        })}
        <Box>
          <Text bold>{pad('Total', WIDTHS[0])}</Text>
          <Text bold>{pad('', WIDTHS[1])}</Text>
          <Text bold>{pad(String(totalDays), WIDTHS[2])}</Text>
          <Text color={theme.green} bold>
            {pad(fmtMoney(total), WIDTHS[3])}
          </Text>
          <Text dimColor>{pad(fmtMoney(perDay(total, totalDays)), WIDTHS[4])}</Text>
        </Box>
      </Box>
    </Box>
  );
}
