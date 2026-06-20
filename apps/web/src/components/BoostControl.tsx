import { fmtMoney } from '@pacer/core';
import { ChevronsLeft, ChevronsRight, Minus, Plus } from 'lucide-react';
import { usePacerStore } from '../store.js';
import styles from './BoostControl.module.css';

export function BoostControl() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const { boost, boostMax } = state;
  const quantum = state.config.quantum;
  const disabled = boostMax <= 0;

  return (
    <section className={styles.wrap} aria-labelledby="boost-label">
      <div className={styles.head}>
        <span id="boost-label" className={styles.title}>
          Bridge top-up
        </span>
        <output className={styles.value} htmlFor="boost-range">
          {fmtMoney(boost)}
        </output>
      </div>
      <p className={styles.help}>
        Extra cash added to the <strong>Bridge</strong> payment below — the first, often shorter
        payment that covers you until your regular pay cycle kicks in.
      </p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => dispatch({ type: 'boostToMin' })}
          disabled={disabled}
          aria-label="Minimum top-up"
        >
          <ChevronsLeft size={18} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => dispatch({ type: 'boostDown' })}
          disabled={disabled}
          aria-label="Decrease top-up"
        >
          <Minus size={18} aria-hidden />
        </button>
        <input
          id="boost-range"
          className={styles.range}
          type="range"
          min={0}
          max={boostMax}
          step={quantum}
          value={boost}
          disabled={disabled}
          onChange={(e) => dispatch({ type: 'setBoost', value: Number(e.target.value) })}
          aria-label="Bridge top-up"
          aria-valuetext={fmtMoney(boost)}
        />
        <button
          type="button"
          className={styles.btn}
          onClick={() => dispatch({ type: 'boostUp' })}
          disabled={disabled}
          aria-label="Increase top-up"
        >
          <Plus size={18} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => dispatch({ type: 'boostToMax' })}
          disabled={disabled}
          aria-label="Maximum top-up"
        >
          <ChevronsRight size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}
