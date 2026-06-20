import {
  type Action,
  buildCsv,
  type Config,
  type ConfigLoad,
  defaultConfig,
  initialState,
  type PlannerState,
  parseSettings,
  parseStoredConfig,
  reducer,
  today,
} from '@pacer/core';
import { create } from 'zustand';

const STORAGE_KEY = 'pacer.config';

export function loadStoredConfig(): ConfigLoad {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return parseStoredConfig(raw ? JSON.parse(raw) : {});
  } catch {
    return { config: defaultConfig(), invalid: true };
  }
}

function persistConfig(config: Config): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface PacerStore {
  state: PlannerState;
  dispatch: (action: Action) => void;
  saveSettings: () => void;
  exportCsv: () => void;
}

const { config: initialConfig, invalid: invalidStoredConfig } = loadStoredConfig();

export const usePacerStore = create<PacerStore>((set, get) => ({
  state: {
    ...initialState(initialConfig, today()),
    ...(invalidStoredConfig && { notice: 'stored settings were invalid; using defaults' }),
  },

  dispatch: (action) => set((s) => ({ state: reducer(s.state, action) })),

  saveSettings: () => {
    const { state } = get();
    const parsed = parseSettings(state.quantumInput, state.intervalInput, state.config.payday);
    if (!parsed.ok) {
      set((s) => ({ state: reducer(s.state, { type: 'error', value: parsed.error }) }));
      return;
    }
    try {
      persistConfig(parsed.value);
      set((s) => ({ state: reducer(s.state, { type: 'settingsSaved', config: parsed.value }) }));
    } catch (e) {
      set((s) => ({
        state: reducer(s.state, { type: 'error', value: `could not save settings: ${String(e)}` }),
      }));
    }
  },

  exportCsv: () => {
    const { state } = get();
    if (!state.results || state.total === null) {
      return;
    }
    const csv = buildCsv(state.results, state.total);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pacer-budget.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'plan downloaded' }) }));
  },
}));
