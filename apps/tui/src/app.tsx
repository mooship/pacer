import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  breadcrumb,
  buildCsv,
  buildIcs,
  buildSummaryText,
  type ComputeResult,
  type Config,
  initialState,
  mood,
  type PlannerState,
  type PlanSnapshot,
  planSnapshot,
  previews,
  reducer,
  SETTINGS_PAYDAY,
  samePlan,
  saveSettingsAction,
  today,
} from '@pacer/core';
import clipboardy from 'clipboardy';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Form } from './components/Form.js';
import { Mascot } from './components/Mascot.js';
import { Results } from './components/Results.js';
import { Settings } from './components/Settings.js';
import { clearPlan, loadPlan, saveConfig, savePlan } from './config-store.js';
import { colorEnabled, makeTheme, type Theme } from './theme.js';

const EXPORT_PATH = 'pacer-budget.csv';
const ICS_PATH = 'pacer-paydays.ics';

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
    const snap = loadPlan();
    if (snap) {
      const restored = reducer(s, { type: 'restorePlan', snap });
      restored.notice = 'restored your last plan';
      return restored;
    }
    return s;
  });

  const lastSaved = useRef<PlanSnapshot | null>(null);
  useEffect(() => {
    const snap = planSnapshot(state);
    if (samePlan(snap, lastSaved.current)) {
      return;
    }
    lastSaved.current = snap;
    try {
      if (snap) {
        savePlan(snap);
      } else {
        clearPlan();
      }
    } catch {}
  }, [state]);

  const view = previews(state);
  const mascotMood = mood(state);

  const saveSettings = () => {
    dispatch(
      saveSettingsAction(state.quantumInput, state.intervalInput, state.config.payday, saveConfig),
    );
  };

  const saveFile = (path: string, build: (results: ComputeResult, total: number) => string) => {
    if (!state.results || state.total === null) {
      return;
    }
    try {
      writeFileSync(path, build(state.results, state.total));
      dispatch({ type: 'notice', value: `saved to ${resolve(path)}` });
    } catch (e) {
      dispatch({ type: 'error', value: `could not save: ${String(e)}` });
    }
  };

  const saveCsv = () => saveFile(EXPORT_PATH, (results, total) => buildCsv(results, total));
  const saveIcs = () =>
    saveFile(ICS_PATH, (results, total) => buildIcs(results, total, { now: today() }));

  const copyToClipboard = async () => {
    if (!state.results || state.total === null) {
      return;
    }
    try {
      await clipboardy.write(buildSummaryText(state.results, state.total));
      dispatch({ type: 'notice', value: 'copied to clipboard' });
    } catch (e) {
      dispatch({ type: 'error', value: `could not copy: ${String(e)}` });
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
      } else if (input === 'i') {
        saveIcs();
      } else if (input === 'c') {
        copyToClipboard();
      } else if (input === 'r') {
        dispatch({ type: 'reset' });
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
      <Box flexDirection="row" gap={1}>
        <Mascot mood={mascotMood} theme={theme} />
        <Box flexDirection="column">
          <Text color={theme.accent} bold>
            Pacer
          </Text>
          <Breadcrumb state={state} theme={theme} />
        </Box>
      </Box>
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
        ? '  ↑/↓ ±quantum   PgUp/PgDn ×10   Home/End min/max   s → csv   i → calendar   c → copy   r → start over   Esc → edit   q → quit'
        : '  Enter → confirm   Esc → back   ←/→ move cursor   F2 → settings   Ctrl+C → quit';
  return <Text dimColor>{text}</Text>;
}
