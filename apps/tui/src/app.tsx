import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  breadcrumb,
  buildCsv,
  type Config,
  initialState,
  type PlannerState,
  previews,
  reducer,
  SETTINGS_PAYDAY,
  saveSettingsAction,
  today,
} from '@pacer/core';
import { Box, Text, useApp, useInput } from 'ink';
import { useMemo, useReducer } from 'react';
import { Form } from './components/Form.js';
import { Results } from './components/Results.js';
import { Settings } from './components/Settings.js';
import { saveConfig } from './config-store.js';
import { colorEnabled, makeTheme, type Theme } from './theme.js';

const EXPORT_PATH = 'pacer-budget.csv';

const F2 = ['OQ', '[12~'];
const HOME = ['[H', '[1~', 'OH'];
const END = ['[F', '[4~', 'OF'];

interface AppProps {
  config: Config;
  invalidConfig: boolean;
}

export function App({ config, invalidConfig }: AppProps) {
  const { exit } = useApp();
  const theme = useMemo(() => makeTheme(colorEnabled()), []);
  const [state, dispatch] = useReducer(reducer, undefined, (): PlannerState => {
    const s = initialState(config, today());
    if (invalidConfig) {
      s.notice = 'config.toml is invalid; using defaults';
    }
    return s;
  });

  const view = previews(state);

  const saveSettings = () => {
    dispatch(
      saveSettingsAction(state.quantumInput, state.intervalInput, state.config.payday, saveConfig),
    );
  };

  const saveCsv = () => {
    if (!state.results || state.total === null) {
      return;
    }
    try {
      writeFileSync(EXPORT_PATH, buildCsv(state.results, state.total));
      dispatch({ type: 'notice', value: `saved to ${resolve(EXPORT_PATH)}` });
    } catch (e) {
      dispatch({ type: 'error', value: `could not save: ${String(e)}` });
    }
  };

  useInput((input, key) => {
    if (F2.includes(input)) {
      dispatch({ type: 'openSettings' });
      return;
    }

    if (state.step === 'settings') {
      if (key.upArrow) {
        dispatch({ type: 'settingsUp' });
      } else if (key.downArrow) {
        dispatch({ type: 'settingsDown' });
      } else if (key.leftArrow && state.settingsCursor === SETTINGS_PAYDAY) {
        dispatch({ type: 'paydayPrev' });
      } else if (key.rightArrow && state.settingsCursor === SETTINGS_PAYDAY) {
        dispatch({ type: 'paydayNext' });
      } else if (key.return && state.settingsCursor === SETTINGS_PAYDAY) {
        saveSettings();
      } else if (key.escape) {
        dispatch({ type: 'back' });
      }
      return;
    }

    if (state.step === 'results') {
      if (input === 'q') {
        exit();
      } else if (input === 's') {
        saveCsv();
      } else if (key.upArrow || input === '+' || input === '=') {
        dispatch({ type: 'boostUp' });
      } else if (key.downArrow || input === '-' || input === '_') {
        dispatch({ type: 'boostDown' });
      } else if (key.pageUp) {
        dispatch({ type: 'boostUpCoarse' });
      } else if (key.pageDown) {
        dispatch({ type: 'boostDownCoarse' });
      } else if (HOME.includes(input)) {
        dispatch({ type: 'boostToMin' });
      } else if (END.includes(input)) {
        dispatch({ type: 'boostToMax' });
      } else if (key.escape) {
        dispatch({ type: 'back' });
      }
      return;
    }

    if (key.escape) {
      dispatch({ type: 'back' });
    }
  });

  const onFormChange = (value: string) => {
    if (state.step === 'payDate') {
      dispatch({ type: 'setPayInput', value });
    } else if (state.step === 'lastDay') {
      dispatch({ type: 'setLastInput', value });
    } else if (state.step === 'amount') {
      dispatch({ type: 'setAmountInput', value });
    }
  };

  return (
    <Box flexDirection="column">
      <Text color={theme.accent} bold>
        Pacer
      </Text>
      <Breadcrumb state={state} theme={theme} />
      {state.step === 'settings' ? (
        <Settings
          state={state}
          theme={theme}
          onQuantumChange={(value) => dispatch({ type: 'setQuantumInput', value })}
          onIntervalChange={(value) => dispatch({ type: 'setIntervalInput', value })}
          onSubmit={saveSettings}
        />
      ) : (
        <Form
          state={state}
          previews={view}
          theme={theme}
          onChange={onFormChange}
          onSubmit={() => dispatch({ type: 'confirm' })}
        />
      )}
      {state.step === 'results' && state.results && state.total !== null ? (
        <Results results={state.results} total={state.total} boost={state.boost} theme={theme} />
      ) : null}
      <Hint step={state.step} />
    </Box>
  );
}

function Breadcrumb({ state, theme }: { state: PlannerState; theme: Theme }) {
  if (state.step === 'settings') {
    return <Text dimColor>{'  Settings'}</Text>;
  }
  const crumbs = breadcrumb(state.step);
  return (
    <Text>
      {'  '}
      {crumbs.map((c, i) => (
        <Text key={c.name}>
          {i > 0 ? <Text dimColor>{' › '}</Text> : null}
          {c.status === 'done' ? (
            <Text color={theme.green} dimColor>
              {`✓ ${c.name}`}
            </Text>
          ) : c.status === 'current' ? (
            <Text color={theme.accent} bold>
              {c.name}
            </Text>
          ) : (
            <Text dimColor>{c.name}</Text>
          )}
        </Text>
      ))}
    </Text>
  );
}

function Hint({ step }: { step: PlannerState['step'] }) {
  const text =
    step === 'settings'
      ? '  ↑/↓ field   ←/→ change   Enter → save   Esc → cancel'
      : step === 'results'
        ? '  ↑/↓ ±quantum   PgUp/PgDn ×10   Home/End min/max   s → csv   Esc → edit   q → quit'
        : '  Enter → confirm   Esc → back   ←/→ move cursor   F2 → settings   Ctrl+C → quit';
  return <Text dimColor>{text}</Text>;
}
