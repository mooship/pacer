import { type PlannerState, WD } from '@pacer/core';
import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';
import { Field } from './Field.js';
import { StatusLine } from './Form.js';

interface SettingsProps {
  state: PlannerState;
  theme: Theme;
  onQuantumChange: (value: string) => void;
  onIntervalChange: (value: string) => void;
  onSubmit: () => void;
}

export function Settings({
  state,
  theme,
  onQuantumChange,
  onIntervalChange,
  onSubmit,
}: SettingsProps) {
  const paydayActive = state.settingsCursor === 1;
  return (
    <Box flexDirection="column">
      <Field
        label="Quantum (R)"
        labelWidth={14}
        value={state.quantumInput}
        active={state.settingsCursor === 0}
        done={state.settingsCursor !== 0}
        theme={theme}
        onChange={onQuantumChange}
        onSubmit={onSubmit}
      />
      <Box>
        <Text dimColor={!paydayActive}>{`  ${'Payout day'.padEnd(14)}`}</Text>
        <Text color={paydayActive ? theme.accent : undefined}>
          {`‹ ${WD[state.config.payday]} ›`}
        </Text>
      </Box>
      <Field
        label="Every (days)"
        labelWidth={14}
        value={state.intervalInput}
        active={state.settingsCursor === 2}
        done={state.settingsCursor !== 2}
        theme={theme}
        onChange={onIntervalChange}
        onSubmit={onSubmit}
      />
      <StatusLine state={state} theme={theme} />
    </Box>
  );
}
