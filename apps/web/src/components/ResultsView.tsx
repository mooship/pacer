import {
  barFractions,
  coverEnd,
  currentSegment,
  fmtMoney,
  fmtRange,
  fmtWdDm,
  fmtWdDmy,
  nextPayout,
  paceStatus,
  perDay,
  summaryLine,
} from '@pacer/core';
import { clsx } from 'clsx';
import { CalendarPlus, Copy, Download, Link2, Pencil, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePacerStore } from '../store.js';
import { useNotifyOnPayoutDay } from '../useNotifyOnPayoutDay.js';
import styles from './ResultsView.module.css';

function paceSuffix(delta: number, money: (cents: number) => string): string {
  if (delta === 0) {
    return ' — right on track.';
  }
  return delta > 0 ? ` — ${money(delta)} over.` : ` — ${money(-delta)} under.`;
}

/**
 * The computed schedule: summary line, per-row bar chart, a sticky-scroll
 * table, and the Copy/Share/Calendar/CSV/Start-over actions. "Start over"
 * is a two-click confirm — the first click arms it for 3s and auto-disarms.
 */
export function ResultsView() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const exportCsv = usePacerStore((s) => s.exportCsv);
  const exportIcs = usePacerStore((s) => s.exportIcs);
  const copyToClipboard = usePacerStore((s) => s.copyToClipboard);
  const copyShareLink = usePacerStore((s) => s.copyShareLink);
  const pendingAction = usePacerStore((s) => s.pendingAction);
  const spent = usePacerStore((s) => s.spent);
  const toggleSpent = usePacerStore((s) => s.toggleSpent);
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    summaryRef.current?.focus();
  }, []);
  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );
  useNotifyOnPayoutDay();
  const handleResetClick = () => {
    if (resetArmed) {
      // resetTimer.current is always set alongside resetArmed becoming
      // true (below), so this is a type-safety guard, not a reachable
      // false case.
      /* v8 ignore next 3 */
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
      setResetArmed(false);
      dispatch({ type: 'reset' });
      return;
    }
    setResetArmed(true);
    resetTimer.current = setTimeout(() => setResetArmed(false), 3000);
  };

  if (!state.results || state.total === null || state.pay === null || state.last === null) {
    return null;
  }
  const { dates, segDays, amounts } = state.results;
  const currency = state.config.currency;
  const money = (cents: number) => fmtMoney(cents, currency);
  const totalDays = segDays.reduce((a, b) => a + b, 0);
  const fractions = barFractions(amounts);
  const todayIdx = currentSegment(state.results, state.today);
  const daysToNext = nextPayout(state.results, state.today);
  const pace = paceStatus(state.results, state.today, spent);

  return (
    <div className={styles.wrap}>
      <p className={styles.summary} ref={summaryRef} tabIndex={-1}>
        {money(state.total)} from <strong>{fmtWdDmy(state.pay)}</strong> to{' '}
        <strong>{fmtWdDmy(state.last)}</strong>
      </p>

      <p className={styles.headline}>{summaryLine(state.results, state.total, state.config)}</p>

      {daysToNext !== null ? (
        <p className={styles.next} aria-live="polite">
          Next payout in {daysToNext} day{daysToNext === 1 ? '' : 's'}.
        </p>
      ) : null}
      {pace ? (
        <p className={styles.pace} aria-live="polite">
          You've marked {money(pace.actual)} spent, {money(pace.expected)} planned by today
          {paceSuffix(pace.delta, money)}
        </p>
      ) : null}
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
              <th scope="col" className={styles.checkboxCol}>
                Spent
              </th>
            </tr>
          </thead>
          <tbody>
            {dates.map((d, i) => (
              <tr
                key={d}
                className={clsx(
                  i % 2 === 1 && styles.evenRow,
                  i === 0 && styles.firstWeek,
                  i === todayIdx && styles.today,
                )}
              >
                <th scope="row">
                  {fmtWdDm(d)}
                  {i === todayIdx ? <span className={styles.todayTag}>Today</span> : null}
                </th>
                <td>{fmtRange(d, coverEnd(d, segDays[i]))}</td>
                <td className={styles.num}>{segDays[i]}</td>
                <td className={clsx(styles.num, styles.amount)}>
                  {money(amounts[i])}
                  <span
                    className={styles.bar}
                    style={{ width: `${fractions[i] * 100}%` }}
                    aria-hidden
                  />
                </td>
                <td className={clsx(styles.num, styles.soft)}>
                  {money(perDay(amounts[i], segDays[i]))}
                </td>
                <td className={styles.checkboxCol}>
                  <input
                    type="checkbox"
                    checked={spent.has(d)}
                    onChange={() => toggleSpent(d)}
                    aria-label={`Mark ${fmtWdDm(d)} payout as spent`}
                  />
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
              <td />
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
        <button
          type="button"
          className={styles.secondary}
          onClick={copyToClipboard}
          disabled={pendingAction !== null}
        >
          <Copy size={18} aria-hidden />
          Copy
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={copyShareLink}
          disabled={pendingAction !== null}
        >
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
        className={clsx(styles.startOver, resetArmed && styles.startOverArmed)}
        onClick={handleResetClick}
      >
        <RotateCcw size={16} aria-hidden />
        {resetArmed ? 'Click again to confirm' : 'Start over'}
      </button>
    </div>
  );
}
