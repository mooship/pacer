import { BRIDGE_LABEL, coverEnd, fmtMoney, fmtRange, fmtWdDm, fmtWdDmy, perDay } from '@pacer/core';
import { clsx } from 'clsx';
import { Download, Pencil, RotateCcw } from 'lucide-react';
import { usePacerStore } from '../store.js';
import { BoostControl } from './BoostControl.js';
import styles from './ResultsView.module.css';

export function ResultsView() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const exportCsv = usePacerStore((s) => s.exportCsv);

  if (!state.results || state.total === null || state.pay === null || state.last === null) {
    return null;
  }
  const { dates, segDays, amounts } = state.results;
  const totalDays = segDays.reduce((a, b) => a + b, 0);

  return (
    <div className={styles.wrap}>
      <p className={styles.summary}>
        {fmtMoney(state.total)} from <strong>{fmtWdDmy(state.pay)}</strong> to{' '}
        <strong>{fmtWdDmy(state.last)}</strong>
      </p>

      <BoostControl />

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption className="visually-hidden">
            Payment schedule with per-day spending for each segment
          </caption>
          <thead>
            <tr>
              <th scope="col">Pay</th>
              <th scope="col">Covers</th>
              <th scope="col" className={styles.num}>
                Days
              </th>
              <th scope="col" className={styles.num}>
                Amount
              </th>
              <th scope="col" className={styles.num}>
                Per day
              </th>
            </tr>
          </thead>
          <tbody>
            {dates.map((d, i) => (
              <tr key={d} className={clsx(i === 0 && styles.bridge)}>
                <th scope="row">
                  {fmtWdDm(d)}
                  {i === 0 ? <span className={styles.bridgeTag}>{BRIDGE_LABEL}</span> : null}
                </th>
                <td>{fmtRange(d, coverEnd(d, segDays[i]))}</td>
                <td className={styles.num}>{segDays[i]}</td>
                <td className={clsx(styles.num, styles.amount)}>{fmtMoney(amounts[i])}</td>
                <td className={clsx(styles.num, styles.soft)}>
                  {fmtMoney(perDay(amounts[i], segDays[i]))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td />
              <td className={styles.num}>{totalDays}</td>
              <td className={clsx(styles.num, styles.amount)}>{fmtMoney(state.total)}</td>
              <td className={clsx(styles.num, styles.soft)}>
                {fmtMoney(perDay(state.total, totalDays))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => dispatch({ type: 'back' })}
        >
          <Pencil size={18} aria-hidden />
          Edit
        </button>
        <button type="button" className={styles.primary} onClick={exportCsv}>
          <Download size={18} aria-hidden />
          Download CSV
        </button>
      </div>
      <button
        type="button"
        className={styles.startOver}
        onClick={() => dispatch({ type: 'reset' })}
      >
        <RotateCcw size={16} aria-hidden />
        Start over
      </button>
    </div>
  );
}
