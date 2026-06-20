import {
  type Action,
  buildCsv,
  buildSummaryText,
  type Config,
  type ConfigLoad,
  defaultConfig,
  initialState,
  type PlannerState,
  parseStoredConfig,
  reducer,
  saveSettingsAction,
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
  copyToClipboard: () => Promise<void>;
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
    const action = saveSettingsAction(
      state.quantumInput,
      state.intervalInput,
      state.config.payday,
      persistConfig,
    );
    set((s) => ({ state: reducer(s.state, action) }));
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

  copyToClipboard: async () => {
    const { state } = get();
    if (!state.results || state.total === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildSummaryText(state.results, state.total));
      set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'copied to clipboard' }) }));
    } catch {
      set((s) => ({
        state: reducer(s.state, { type: 'error', value: 'could not copy to clipboard' }),
      }));
    }
  },
}));
