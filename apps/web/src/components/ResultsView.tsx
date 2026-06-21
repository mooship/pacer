import {
  BRIDGE_LABEL,
  coverEnd,
  currentSegment,
  fmtMoney,
  fmtRange,
  fmtWdDm,
  fmtWdDmy,
  perDay,
  summaryLine,
} from '@pacer/core';
import { clsx } from 'clsx';
import { CalendarPlus, Copy, Download, Link2, Pencil, RotateCcw } from 'lucide-react';
import { usePacerStore } from '../store.js';
import { BoostControl } from './BoostControl.js';
import styles from './ResultsView.module.css';

export function ResultsView() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const exportCsv = usePacerStore((s) => s.exportCsv);
  const exportIcs = usePacerStore((s) => s.exportIcs);
  const copyToClipboard = usePacerStore((s) => s.copyToClipboard);
  const copyShareLink = usePacerStore((s) => s.copyShareLink);

  if (!state.results || state.total === null || state.pay === null || state.last === null) {
    return null;
  }
  const { dates, segDays, amounts } = state.results;
  const currency = state.config.currency;
  const money = (cents: number) => fmtMoney(cents, currency);
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  const maxAmount = Math.max(...amounts, 1);
  const todayIdx = currentSegment(state.results, state.today);
  const daysToNext =
    todayIdx !== null && todayIdx + 1 < dates.length ? dates[todayIdx + 1] - state.today : null;

  return (
    <div className={styles.wrap}>
      <p className={styles.summary}>
        {money(state.total)} from <strong>{fmtWdDmy(state.pay)}</strong> to{' '}
        <strong>{fmtWdDmy(state.last)}</strong>
      </p>

      <p className={styles.headline}>{summaryLine(state.results, state.total, state.config)}</p>

      {daysToNext !== null ? (
        <p className={styles.next} aria-live="polite">
          Next payout in {daysToNext} day{daysToNext === 1 ? '' : 's'}.
        </p>
      ) : null}

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
              <tr
                key={d}
                className={clsx(i === 0 && styles.bridge, i === todayIdx && styles.today)}
              >
                <th scope="row">
                  {fmtWdDm(d)}
                  {i === 0 ? <span className={styles.bridgeTag}>{BRIDGE_LABEL}</span> : null}
                  {i === todayIdx ? <span className={styles.todayTag}>Today</span> : null}
                </th>
                <td>{fmtRange(d, coverEnd(d, segDays[i]))}</td>
                <td className={styles.num}>{segDays[i]}</td>
                <td className={clsx(styles.num, styles.amount)}>
                  {money(amounts[i])}
                  <span
                    className={styles.bar}
                    style={{ width: `${(amounts[i] / maxAmount) * 100}%` }}
                    aria-hidden
                  />
                </td>
                <td className={clsx(styles.num, styles.soft)}>
                  {money(perDay(amounts[i], segDays[i]))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td />
              <td className={styles.num}>{totalDays}</td>
              <td className={clsx(styles.num, styles.amount)}>{money(state.total)}</td>
              <td className={clsx(styles.num, styles.soft)}>
                {money(perDay(state.total, totalDays))}
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
        <button type="button" className={styles.secondary} onClick={copyToClipboard}>
          <Copy size={18} aria-hidden />
          Copy
        </button>
        <button type="button" className={styles.secondary} onClick={copyShareLink}>
          <Link2 size={18} aria-hidden />
          Share
        </button>
        <button type="button" className={styles.secondary} onClick={exportIcs}>
          <CalendarPlus size={18} aria-hidden />
          Calendar
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
