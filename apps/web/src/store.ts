import {
  type Action,
  buildCsv,
  buildIcs,
  buildSummaryText,
  type Config,
  type ConfigLoad,
  currencyForRegion,
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
  regionForTimeZone,
  samePlan,
  saveSettingsAction,
  today,
} from '@pacer/core';
import { create } from 'zustand';

/** `localStorage` key for the persisted {@link Config}. */
export const STORAGE_KEY = 'pacer.config';
/** `localStorage` key for the persisted {@link PlanSnapshot}. */
export const PLAN_KEY = 'pacer.plan';

/** `region` mapped to its currency, or `null` if unset or unmapped. */
function currencyOrNull(region: string | null | undefined): string | null {
  return region ? currencyForRegion(region) : null;
}

/**
 * Guesses a currency from the browser's IANA time zone (e.g.
 * `Africa/Johannesburg` -> `ZA` -> `ZAR`); `null` if detection throws or the
 * zone has no mapped region/currency. The time zone reflects the device's
 * configured location, unlike the language preference `detectLocaleCurrency`
 * falls back to — a browser's UI language (e.g. "English") is routinely set
 * to a generic regional variant like `en-GB` regardless of where the device
 * actually is, so language alone is an unreliable proxy for location.
 */
function detectTimeZoneCurrency(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return currencyOrNull(regionForTimeZone(timeZone));
  } catch {
    return null;
  }
}

/** Guesses a currency from the browser's locale region, via `Intl.Locale`; `null` if detection throws or the region has no mapped currency. */
function detectLocaleCurrency(): string | null {
  try {
    return currencyOrNull(new Intl.Locale(navigator.language).maximize().region);
  } catch {
    return null;
  }
}

/** Guesses the visitor's currency, preferring the device time zone (a location signal) over the browser's language preference. */
function detectCurrency(): string | null {
  return detectTimeZoneCurrency() ?? detectLocaleCurrency();
}

/**
 * Loads the persisted {@link Config} from `localStorage`. On a first-ever
 * visit (no stored value at all), detects currency from the browser locale
 * instead of using core's default. An invalid stored value (bad JSON, or a
 * shape that fails Zod validation) does not re-run detection — it falls
 * back to {@link defaultConfig} with `invalid: true`.
 */
export function loadStoredConfig(): ConfigLoad {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const result = parseStoredConfig({});
      const detected = detectCurrency();
      return detected ? { ...result, config: { ...result.config, currency: detected } } : result;
    }
    return parseStoredConfig(JSON.parse(raw));
  } catch {
    return { config: defaultConfig(), invalid: true };
  }
}

function persistConfig(config: Config): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Reads a plan from the current URL's query string, if it decodes to a valid {@link PlanSnapshot}. */
function loadUrlPlan(): PlanSnapshot | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const decoded = decodePlan(params);
    return decoded.ok ? decoded.value : null;
  } catch {
    return null;
  }
}

/** Reads the persisted plan from `localStorage`, if present and valid. */
function loadStoredPlan(): PlanSnapshot | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? parsePlan(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Persists `snap` to `localStorage` and mirrors it into the URL query
 * string. Returns a human-readable error message if either write fails
 * (e.g. storage quota), or `null` on success; both writes are attempted
 * even if the first fails.
 */
function persistPlan(snap: PlanSnapshot): string | null {
  let error: string | null = null;
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(snap));
  } catch (e) {
    error = `could not save your plan: ${String(e)}`;
  }
  try {
    window.history.replaceState(null, '', `?${encodePlan(snap)}`);
  } catch (e) {
    error ??= `could not update the share link: ${String(e)}`;
  }
  return error;
}

/** Removes the persisted plan and its URL query string, mirroring {@link persistPlan}'s error handling. */
function clearStoredPlan(): string | null {
  let error: string | null = null;
  try {
    localStorage.removeItem(PLAN_KEY);
  } catch (e) {
    error = `could not clear your saved plan: ${String(e)}`;
  }
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch (e) {
    error ??= `could not update the share link: ${String(e)}`;
  }
  return error;
}

/** Triggers a browser download of `content` as a file named `filename`, via a throwaway object URL. */
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

/**
 * Persists the plan snapshot after a state transition, but only when it
 * actually changed — clears storage if the new state has no snapshot
 * (stepped back out of results), persists it otherwise. Returns an error
 * message from the underlying persist/clear call, or `null`.
 */
function syncPlan(prev: PlannerState, next: PlannerState): string | null {
  const prevSnap = planSnapshot(prev);
  const nextSnap = planSnapshot(next);
  if (samePlan(prevSnap, nextSnap)) {
    return null;
  }
  return nextSnap ? persistPlan(nextSnap) : clearStoredPlan();
}

/** The Zustand store shape: wraps core's {@link PlannerState}/{@link reducer} with persistence and side effects. */
interface PacerStore {
  state: PlannerState;
  /** Which async action (if any) is in flight, to prevent overlapping clipboard writes. */
  pendingAction: 'copy' | 'share' | null;
  /** Runs `action` through the reducer and syncs the resulting plan to storage/URL. */
  dispatch: (action: Action) => void;
  /** Parses and persists the settings form, then applies the resulting action. */
  saveSettings: () => void;
  /** Downloads the current results as a CSV file. */
  exportCsv: () => void;
  /** Downloads the current results as an `.ics` calendar file. */
  exportIcs: () => void;
  /** Copies the plan summary text to the clipboard. */
  copyToClipboard: () => Promise<void>;
  /** Copies the current shareable URL to the clipboard. */
  copyShareLink: () => Promise<void>;
}

const { config: initialConfig, invalid: invalidStoredConfig } = loadStoredConfig();

/**
 * Builds the store's initial state: starts from the persisted config (with
 * an "invalid settings" notice if it failed validation), then restores a
 * plan from the URL or `localStorage` if one is present — the URL always
 * takes precedence, so a shared link overrides whatever's saved locally.
 */
function buildInitialState(): PlannerState {
  const base: PlannerState = {
    ...initialState(initialConfig, today()),
    ...(invalidStoredConfig && { notice: 'stored settings were invalid; using defaults' }),
  };
  const snap = loadUrlPlan() ?? loadStoredPlan();
  if (snap) {
    const restored = reducer(base, { type: 'restorePlan', snap });
    const saved = planSnapshot(restored);
    // saved is never null here: snap only ever comes from decodePlan/
    // parsePlan, which already guarantee pay/last/total are set, and
    // restorePlan always lands on the results step.
    /* v8 ignore next 3 */
    if (saved) {
      persistPlan(saved);
    }
    return { ...restored, notice: 'restored your last plan' };
  }
  return base;
}

/** The app's single Zustand store: `PlannerState` plus persistence-aware dispatch and export/copy actions. */
export const usePacerStore = create<PacerStore>((set, get) => ({
  state: buildInitialState(),
  pendingAction: null,

  dispatch: (action) =>
    set((s) => {
      const next = reducer(s.state, action);
      const syncError = syncPlan(s.state, next);
      if (syncError && !next.error) {
        return { state: { ...next, error: syncError } };
      }
      return { state: next };
    }),

  saveSettings: () => {
    const { state } = get();
    const action = saveSettingsAction(
      state.quantumInput,
      state.intervalInput,
      state.config.payday,
      persistConfig,
      state.currencyInput,
    );
    set((s) => ({ state: reducer(s.state, action) }));
  },

  exportCsv: () => {
    const { state } = get();
    if (!state.results || state.total === null) {
      return;
    }
    const csv = buildCsv(state.results, state.total, state.config.currency);
    if (!csv.ok) {
      set((s) => ({ state: reducer(s.state, { type: 'error', value: csv.error }) }));
      return;
    }
    downloadBlob(csv.value, 'text/csv;charset=utf-8', 'pacer-budget.csv');
    set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'plan downloaded' }) }));
  },

  exportIcs: () => {
    const { state } = get();
    if (!state.results || state.total === null) {
      return;
    }
    const ics = buildIcs(state.results, state.total, {
      now: today(),
      currency: state.config.currency,
    });
    downloadBlob(ics, 'text/calendar;charset=utf-8', 'pacer-paydays.ics');
    set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'calendar exported' }) }));
  },

  copyToClipboard: async () => {
    const { state, pendingAction } = get();
    if (!state.results || state.total === null || pendingAction) {
      return;
    }
    set({ pendingAction: 'copy' });
    try {
      await navigator.clipboard.writeText(
        buildSummaryText(state.results, state.total, state.config),
      );
      set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'copied to clipboard' }) }));
    } catch {
      set((s) => ({
        state: reducer(s.state, { type: 'error', value: 'could not copy to clipboard' }),
      }));
    } finally {
      set({ pendingAction: null });
    }
  },

  copyShareLink: async () => {
    const { state, pendingAction } = get();
    if (!planSnapshot(state) || pendingAction) {
      return;
    }
    set({ pendingAction: 'share' });
    try {
      await navigator.clipboard.writeText(window.location.href);
      set((s) => ({ state: reducer(s.state, { type: 'notice', value: 'link copied' }) }));
    } catch {
      set((s) => ({ state: reducer(s.state, { type: 'error', value: 'could not copy link' }) }));
    } finally {
      set({ pendingAction: null });
    }
  },
}));
