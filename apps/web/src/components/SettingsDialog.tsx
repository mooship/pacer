import { CURRENCY_CODES, currencyName, currencySymbol, WD } from '@pacer/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePacerStore } from '../store.js';
import styles from './SettingsDialog.module.css';

/**
 * The quantum/currency/payday/interval settings form, rendered in a native
 * `<dialog>` opened via `showModal()`. Its `onCancel` (triggered by the
 * browser's native Escape dismissal) is intercepted to route through the
 * reducer's `back` action instead of closing the dialog directly.
 */
export function SettingsDialog() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const saveSettings = usePacerStore((s) => s.saveSettings);
  const notifyEnabled = usePacerStore((s) => s.notifyEnabled);
  const setNotifyEnabled = usePacerStore((s) => s.setNotifyEnabled);
  const ref = useRef<HTMLDialogElement>(null);
  const open = state.step === 'settings';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="settings-title"
      onCancel={(e) => {
        e.preventDefault();
        dispatch({ type: 'back' });
      }}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          saveSettings();
        }}
        noValidate
      >
        <h2 id="settings-title" className={styles.title}>
          Settings
        </h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quantum">
            Quantum ({currencySymbol(state.currencyInput)})
          </label>
          <input
            id="quantum"
            className={styles.input}
            value={state.quantumInput}
            inputMode="decimal"
            autoComplete="off"
            onChange={(e) => dispatch({ type: 'setQuantumInput', value: e.target.value })}
          />
          <p className={styles.help}>Rounding granularity for allowances.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="currency">
            Currency
          </label>
          <input
            id="currency"
            className={styles.input}
            list="currency-options"
            value={state.currencyInput}
            autoComplete="off"
            onChange={(e) => dispatch({ type: 'setCurrencyInput', value: e.target.value })}
          />
          <datalist id="currency-options">
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {currencyName(code)}
              </option>
            ))}
          </datalist>
          <p className={styles.help}>Used to format amounts throughout the plan.</p>
        </div>

        <fieldset className={styles.field}>
          <legend className={styles.label}>Payout day</legend>
          <div className={styles.cycle}>
            <button
              type="button"
              className={styles.cycleBtn}
              onClick={() => dispatch({ type: 'paydayPrev' })}
              aria-label="Previous day"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <output className={styles.cycleValue}>{WD[state.config.payday]}</output>
            <button
              type="button"
              className={styles.cycleBtn}
              onClick={() => dispatch({ type: 'paydayNext' })}
              aria-label="Next day"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
          <p className={styles.help}>Day of the week recurring allowances land on.</p>
        </fieldset>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="interval">
            Every (days)
          </label>
          <input
            id="interval"
            className={styles.input}
            value={state.intervalInput}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => dispatch({ type: 'setIntervalInput', value: e.target.value })}
          />
          <p className={styles.help}>How many days between recurring allowance payouts.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
            />
            Notify me on payout day
          </label>
          <p className={styles.help}>
            Shows a browser notification when you open Pacer on a day a payout is due. Only works
            while this tab or app is open.
          </p>
        </div>

        {state.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => dispatch({ type: 'back' })}
          >
            Cancel
          </button>
          <button type="submit" className={styles.save}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
