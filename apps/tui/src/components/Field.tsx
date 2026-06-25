import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { Theme } from '../theme.js';

interface FieldProps {
  label: string;
  labelWidth: number;
  value: string;
  active: boolean;
  done: boolean;
  theme: Theme;
  placeholder?: string;
  preview?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
}

export function Field({
  label,
  labelWidth,
  value,
  active,
  done,
  theme,
  placeholder,
  preview,
  invalid = false,
  onChange,
  onSubmit,
}: FieldProps) {
  const paddedLabel = `  ${label.padEnd(labelWidth)}`;
  const bracket = invalid ? theme.red : active ? theme.accent : undefined;
  return (
    <Box>
      <Text dimColor={!active}>{paddedLabel}</Text>
      <Text color={bracket} dimColor={!active}>
        [
      </Text>
      {active && onChange ? (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit ?? (() => {})}
          placeholder={placeholder ?? ''}
        />
      ) : value ? (
        <Text dimColor={!done}>{value}</Text>
      ) : (
        <Text dimColor>{placeholder ?? ''}</Text>
      )}
      <Text color={bracket} dimColor={!active}>
        ]
      </Text>
      {preview ? (
        <Text color={theme.green} dimColor={!active}>
          {`  → ${preview}`}
        </Text>
      ) : null}
    </Box>
  );
}
