import {
  BRIDGE_LABEL,
  type ComputeResult,
  type Config,
  coverEnd,
  currentSegment,
  fmtMoney,
  fmtRange,
  fmtWdDm,
  perDay,
  summaryLine,
} from '@pacer/core';
import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';

const WIDTHS = [13, 16, 6, 12, 12] as const;
const BAR_CELLS = 8;
const pad = (s: string, w: number): string => s.padEnd(w).slice(0, w);

interface ResultsProps {
  results: ComputeResult;
  total: number;
  boost: number;
  config: Config;
  today: number;
  theme: Theme;
}

export function Results({ results, total, boost, config, today, theme }: ResultsProps) {
  const { dates, segDays, amounts } = results;
  const cur = config.currency;
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  const maxAmount = Math.max(...amounts, 1);
  const todayIdx = currentSegment(results, today);
  const daysToNext =
    todayIdx !== null && todayIdx + 1 < dates.length ? dates[todayIdx + 1] - today : null;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.accent} bold>
          {`  ${summaryLine(results, total, config)}`}
        </Text>
      </Box>
      {daysToNext !== null ? (
        <Box>
          <Text color={theme.accent}>
            {`  Next payout in ${daysToNext} day${daysToNext === 1 ? '' : 's'}.`}
          </Text>
        </Box>
      ) : null}
      <Box>
        <Text dimColor>{'  Bridge top-up  '}</Text>
        <Text color={theme.yellow} bold>
          {fmtMoney(boost, cur)}
        </Text>
        <Text dimColor>{`   ↑/↓ to move money into the ${BRIDGE_LABEL} payment below`}</Text>
      </Box>
      <Box borderStyle="round" flexDirection="column" paddingX={1}>
        <Box>
          <Text color={theme.accent} bold>
            {'  '}
            {pad('Pay', WIDTHS[0])}
            {pad('Covers', WIDTHS[1])}
            {pad('Days', WIDTHS[2])}
            {pad('Amount', WIDTHS[3])}
            {pad('Per day', WIDTHS[4])}
          </Text>
        </Box>
        {dates.map((d, i) => {
          const dim = i % 2 === 1;
          const isToday = i === todayIdx;
          const barLen = Math.max(1, Math.round((amounts[i] / maxAmount) * BAR_CELLS));
          const barColor = i === 0 ? theme.yellow : isToday ? theme.accent : theme.green;
          return (
            <Box key={d}>
              <Text color={isToday ? theme.accent : undefined} bold={isToday}>
                {isToday ? '▸ ' : '  '}
              </Text>
              <Text color={i === 0 ? theme.yellow : undefined} dimColor={dim}>
                {pad(fmtWdDm(d), WIDTHS[0])}
              </Text>
              <Text dimColor={dim}>{pad(fmtRange(d, coverEnd(d, segDays[i])), WIDTHS[1])}</Text>
              <Text dimColor={dim}>{pad(String(segDays[i]), WIDTHS[2])}</Text>
              <Text color={theme.green} dimColor={dim}>
                {pad(fmtMoney(amounts[i], cur), WIDTHS[3])}
              </Text>
              <Text dimColor>{pad(fmtMoney(perDay(amounts[i], segDays[i]), cur), WIDTHS[4])}</Text>
              <Text color={barColor}>{'█'.repeat(barLen)}</Text>
            </Box>
          );
        })}
        <Box>
          <Text bold>{'  '}</Text>
          <Text bold>{pad('Total', WIDTHS[0])}</Text>
          <Text bold>{pad('', WIDTHS[1])}</Text>
          <Text bold>{pad(String(totalDays), WIDTHS[2])}</Text>
          <Text color={theme.green} bold>
            {pad(fmtMoney(total, cur), WIDTHS[3])}
          </Text>
          <Text dimColor>{pad(fmtMoney(perDay(total, totalDays), cur), WIDTHS[4])}</Text>
        </Box>
      </Box>
    </Box>
  );
}
