import {
  type Action,
  buildCsv,
  buildIcs,
  buildSummaryText,
  type Config,
  type ConfigLoad,
  decodePlan,
  defaultConfig,
  encodePlan,
  initialState,
  type PlannerState,
  type PlanSnapshot,
  parsePlan,
  parseStoredConfig,
  planSnapshot,
  reducer,
  samePlan,
  saveSettingsAction,
  today,
} from '@pacer/core';
import { create } from 'zustand';

const STORAGE_KEY = 'pacer.config';
const PLAN_KEY = 'pacer.plan';

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

function loadUrlPlan(): PlanSnapshot | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const decoded = decodePlan(params);
    return decoded.ok ? decoded.value : null;
  } catch {
    return null;
  }
}

function loadStoredPlan(): PlanSnapshot | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? parsePlan(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function persistPlan(snap: PlanSnapshot): void {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(snap));
    window.history.replaceState(null, '', `?${encodePlan(snap)}`);
  } catch {}
}

function clearStoredPlan(): void {
  try {
    localStorage.removeItem(PLAN_KEY);
    window.history.replaceState(null, '', window.location.pathname);
  } catch {}
}

function downloadBlob(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function syncPlan(prev: PlannerState, next: PlannerState): void {
  const prevSnap = planSnapshot(prev);
  const nextSnap = planSnapshot(next);
  if (samePlan(prevSnap, nextSnap)) {
    return;
  }
  if (nextSnap) {
    persistPlan(nextSnap);
  } else {
    clearStoredPlan();
  }
}

interface PacerStore {
  state: PlannerState;
  dispatch: (action: Action) => void;
  saveSettings: () => void;
  exportCsv: () => void;
  exportIcs: () => void;
  copyToClipboard: () => Promise<void>;
  copyShareLink: () => Promise<void>;
}

const { config: initialConfig, invalid: invalidStoredConfig } = loadStoredConfig();

function buildInitialState(): PlannerState {
  const base: PlannerState = {
    ...initialState(initialConfig, today()),
    ...(invalidStoredConfig && { notice: 'stored settings were invalid; using defaults' }),
  };
  const snap = loadUrlPlan() ?? loadStoredPlan();
  if (snap) {
    const restored = reducer(base, { type: 'restorePlan', snap });
    const saved = planSnapshot(restored);
    if (saved) {
      persistPlan(saved);
    }
    return { ...restored, notice: 'restored your last plan' };
  }
  return base;
}

export const usePacerStore = create<PacerStore>((set, get) => ({
  state: buildInitialState(),

  dispatch: (action) =>
    set((s) => {
      const next = reducer(s.state, action);
      syncPlan(s.state, next);
      return { state: next };
    }),

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
    downloadBlob(csv, 'text/csv;charset=utf-8', 'pacer-budget.csv');
    set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'plan downloaded' }) }));
  },

  exportIcs: () => {
    const { state } = get();
    if (!state.results || state.total === null) {
      return;
    }
    const ics = buildIcs(state.results, state.total, { now: today() });
    downloadBlob(ics, 'text/calendar;charset=utf-8', 'pacer-paydays.ics');
    set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'calendar exported' }) }));
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

  copyShareLink: async () => {
    const { state } = get();
    if (!planSnapshot(state)) {
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'link copied' }) }));
    } catch {
      set((s) => ({ state: reducer(s.state, { type: 'error', value: 'could not copy link' }) }));
    }
  },
}));
