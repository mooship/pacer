import type { PlannerState, Previews } from '@pacer/core';
import { Box, Text } from 'ink';
import type { Theme } from '../theme.js';
import { Field } from './Field.js';

interface FormProps {
  state: PlannerState;
  previews: Previews;
  theme: Theme;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function Form({ state, previews, theme, onChange, onSubmit }: FormProps) {
  return (
    <Box flexDirection="column">
      <Field
        label="Pay date"
        labelWidth={18}
        value={state.payInput}
        active={state.step === 'payDate'}
        done={state.pay !== null}
        placeholder="today, +7, or 2026-07-25"
        preview={previews.pay}
        invalid={state.step === 'payDate' && Boolean(state.error)}
        theme={theme}
        onChange={onChange}
        onSubmit={onSubmit}
      />
      <Field
        label="Last day"
        labelWidth={18}
        value={state.lastInput}
        active={state.step === 'lastDay'}
        done={state.last !== null}
        placeholder="+30 or 2026-07-25"
        preview={previews.last}
        invalid={state.step === 'lastDay' && Boolean(state.error)}
        theme={theme}
        onChange={onChange}
        onSubmit={onSubmit}
      />
      <Field
        label={`Amount (${state.config.currency})`}
        labelWidth={18}
        value={state.amountInput}
        active={state.step === 'amount'}
        done={state.total !== null}
        placeholder="e.g. 18500"
        preview={previews.amount}
        invalid={state.step === 'amount' && Boolean(state.error)}
        theme={theme}
        onChange={onChange}
        onSubmit={onSubmit}
      />
      <Text> </Text>
      <StatusLine state={state} theme={theme} />
    </Box>
  );
}

export function StatusLine({ state, theme }: { state: PlannerState; theme: Theme }) {
  if (state.notice) {
    return <Text color={theme.green}>{`  ✓ ${state.notice}`}</Text>;
  }
  if (state.error) {
    return <Text color={theme.red}>{`  ✗ ${state.error}`}</Text>;
  }
  return <Text> </Text>;
}
