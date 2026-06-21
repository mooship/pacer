import {
  type PlannerState,
  SETTINGS_CURRENCY,
  SETTINGS_INTERVAL,
  SETTINGS_PAYDAY,
  SETTINGS_QUANTUM,
  WD,
} from '@pacer/core';
import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';
import { Field } from './Field.js';
import { StatusLine } from './Form.js';

interface SettingsProps {
  state: PlannerState;
  theme: Theme;
  onQuantumChange: (value: string) => void;
  onIntervalChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onSubmit: () => void;
}

export function Settings({
  state,
  theme,
  onQuantumChange,
  onIntervalChange,
  onCurrencyChange,
  onSubmit,
}: SettingsProps) {
  const paydayActive = state.settingsCursor === SETTINGS_PAYDAY;
  return (
    <Box flexDirection="column">
      <Field
        label="Quantum (R)"
        labelWidth={14}
        value={state.quantumInput}
        active={state.settingsCursor === SETTINGS_QUANTUM}
        done={state.settingsCursor !== SETTINGS_QUANTUM}
        theme={theme}
        onChange={onQuantumChange}
        onSubmit={onSubmit}
      />
      <Field
        label="Currency"
        labelWidth={14}
        value={state.currencyInput}
        active={state.settingsCursor === SETTINGS_CURRENCY}
        done={state.settingsCursor !== SETTINGS_CURRENCY}
        theme={theme}
        onChange={onCurrencyChange}
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
        active={state.settingsCursor === SETTINGS_INTERVAL}
        done={state.settingsCursor !== SETTINGS_INTERVAL}
        theme={theme}
        onChange={onIntervalChange}
        onSubmit={onSubmit}
      />
      <StatusLine state={state} theme={theme} />
    </Box>
  );
}
