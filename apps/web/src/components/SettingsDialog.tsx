import { WD } from '@pacer/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePacerStore } from '../store.js';
import styles from './SettingsDialog.module.css';

export function SettingsDialog() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const saveSettings = usePacerStore((s) => s.saveSettings);
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
      {open ? (
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
              Quantum (R)
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
              Currency symbol
            </label>
            <input
              id="currency"
              className={styles.input}
              value={state.currencyInput}
              maxLength={3}
              autoComplete="off"
              onChange={(e) => dispatch({ type: 'setCurrencyInput', value: e.target.value })}
            />
            <p className={styles.help}>Shown before amounts, e.g. R, $, or €.</p>
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
      ) : null}
    </dialog>
  );
}
