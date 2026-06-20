import {
  type Action,
  type Config,
  type PlannerState,
  buildCsv,
  defaultConfig,
  initialState,
  parseConfig,
  parseSettings,
  reducer,
  today,
} from '@pacer/core';
import { create } from 'zustand';

const STORAGE_KEY = 'pacer.config';

export function loadStoredConfig(): Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultConfig();
    }
    return parseConfig(JSON.parse(raw));
  } catch {
    return defaultConfig();
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

export const usePacerStore = create<PacerStore>((set, get) => ({
  state: initialState(loadStoredConfig(), today()),

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
