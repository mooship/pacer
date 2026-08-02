import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  breadcrumb,
  buildCsv,
  buildIcs,
  buildSummaryText,
  type ComputeResult,
  type Config,
  examplePlan,
  initialState,
  mood,
  ok,
  type PlannerState,
  type PlanSnapshot,
  planSnapshot,
  previews,
  type Result,
  reducer,
  SETTINGS_PAYDAY,
  samePlan,
  saveSettingsAction,
  today,
} from '@pacer/core';
import clipboardy from 'clipboardy';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Form } from './components/Form.js';
import { Mascot } from './components/Mascot.js';
import { Results } from './components/Results.js';
import { Settings } from './components/Settings.js';
import { clearPlan, loadPlan, saveConfig, savePlan } from './config-store.js';
import { colorEnabled, makeTheme, type Theme } from './theme.js';

const EXPORT_PATH = 'pacer-budget.csv';
const ICS_PATH = 'pacer-paydays.ics';

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
    const { snap, invalid: invalidPlan } = loadPlan();
    if (invalidPlan && !invalidConfig) {
      s.notice = 'plan.toml is invalid; starting fresh';
    }
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
    } catch (e) {
      dispatch({ type: 'error', value: `could not save your plan: ${String(e)}` });
    }
  }, [state]);

  const view = previews(state);
  const mascotMood = mood(state);

  const saveSettings = () => {
    dispatch(
      saveSettingsAction(
        state.quantumInput,
        state.intervalInput,
        state.config.payday,
        saveConfig,
        state.currencyInput,
      ),
    );
  };

  const saveFile = (
    path: string,
    build: (results: ComputeResult, total: number) => Result<string>,
  ) => {
    // Unreachable: saveFile is only invoked from the results-step key
    // handler below, and entering that step always sets both fields
    // together. Kept as a safety net against future call sites.
    /* v8 ignore next 3 */
    if (!state.results || state.total === null) {
      return;
    }
    const built = build(state.results, state.total);
    if (!built.ok) {
      dispatch({ type: 'error', value: `could not save: ${built.error}` });
      return;
    }
    try {
      writeFileSync(path, built.value);
      dispatch({ type: 'notice', value: `saved to ${resolve(path)}` });
    } catch (e) {
      dispatch({ type: 'error', value: `could not save: ${String(e)}` });
    }
  };

  const saveCsv = () =>
    saveFile(EXPORT_PATH, (results, total) => buildCsv(results, total, state.config.currency));
  const saveIcs = () =>
    saveFile(ICS_PATH, (results, total) =>
      ok(buildIcs(results, total, { now: today(), currency: state.config.currency })),
    );

  const [resetArmed, setResetArmed] = useState(false);
  const resetTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  const handleResetKey = () => {
    if (resetArmed) {
      // resetTimer.current is always set alongside resetArmed becoming
      // true (below), so this is a type-safety guard, not a reachable
      // false case.
      /* v8 ignore next 3 */
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
      setResetArmed(false);
      dispatch({ type: 'reset' });
      return;
    }
    setResetArmed(true);
    dispatch({ type: 'notice', value: 'press r again to start over' });
    resetTimer.current = setTimeout(() => setResetArmed(false), 3000);
  };

  const copyToClipboard = async () => {
    // Unreachable for the same reason as saveFile's guard above.
    /* v8 ignore next 3 */
    if (!state.results || state.total === null) {
      return;
    }
    try {
      await clipboardy.write(buildSummaryText(state.results, state.total, state.config));
      dispatch({ type: 'notice', value: 'copied to clipboard' });
    } catch (e) {
      dispatch({ type: 'error', value: `could not copy: ${String(e)}` });
    }
  };

  useInput((input, key) => {
    if (resetArmed && input !== 'r') {
      setResetArmed(false);
      // Same type-safety guard as handleResetKey's — never false in
      // practice since resetTimer.current is set alongside resetArmed.
      /* v8 ignore next 3 */
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    }

    if (key.tab) {
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
        handleResetKey();
      } else if (key.escape) {
        dispatch({ type: 'back' });
      }
      return;
    }

    if (input === 'e') {
      dispatch({ type: 'restorePlan', snap: examplePlan(state.today) });
    } else if (key.escape) {
      dispatch({ type: 'back' });
    }
  });

  const onFormChange = (value: string) => {
    switch (state.step) {
      case 'payDate':
        dispatch({ type: 'setPayInput', value });
        break;
      case 'lastDay':
        dispatch({ type: 'setLastInput', value });
        break;
      case 'amount':
        dispatch({ type: 'setAmountInput', value });
        break;
      // Form's fields only fire onFormChange while active, i.e. while step
      // matches one of the cases above; this default is an unreachable
      // type-safety net.
      /* v8 ignore next 2 */
      default:
        break;
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
      {state.step === 'payDate' && state.pay === null ? (
        <Text dimColor>
          {'  Pace a salary across the month so it lasts until your next payday.'}
        </Text>
      ) : null}
      {state.step === 'settings' ? (
        <Settings
          state={state}
          theme={theme}
          onQuantumChange={(value) => dispatch({ type: 'setQuantumInput', value })}
          onIntervalChange={(value) => dispatch({ type: 'setIntervalInput', value })}
          onCurrencyChange={(value) => dispatch({ type: 'setCurrencyInput', value })}
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
        <Results
          results={state.results}
          total={state.total}
          config={state.config}
          today={state.today}
          theme={theme}
        />
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
        ? '  s → csv   i → calendar   c → copy   r r → start over   e → example   Esc → edit   q → quit'
        : '  Enter → confirm   Esc → back   ←/→ move cursor   e → example   Tab → settings   Ctrl+C → quit';
  return <Text dimColor>{text}</Text>;
}
