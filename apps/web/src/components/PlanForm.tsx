import { type Action, previews, type Step } from '@pacer/core';
import { ArrowLeft, ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePacerStore } from '../store.js';
import { Field } from './Field.js';
import styles from './PlanForm.module.css';

const statusFor = (step: Step, field: Step, done: boolean): 'active' | 'done' | 'idle' =>
  step === field ? 'active' : done ? 'done' : 'idle';

const PAY_CHIPS: { label: string; value: string }[] = [
  { label: 'Today', value: 'today' },
  { label: 'In 1 week', value: '+7' },
  { label: 'In 2 weeks', value: '+14' },
];

const LAST_CHIPS: { label: string; value: string }[] = [
  { label: '+30 days', value: '+30' },
  { label: '+60 days', value: '+60' },
];

function Chips({
  chips,
  onPick,
}: {
  chips: { label: string; value: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <div className={styles.chips}>
      {chips.map((c) => (
        <button key={c.value} type="button" className={styles.chip} onClick={() => onPick(c.value)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function PlanForm() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const view = previews(state);
  const formRef = useRef<HTMLFormElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus when the active step changes
  useEffect(() => {
    const next = formRef.current?.querySelector<HTMLInputElement>('input:not([disabled])');
    next?.focus();
  }, [state.step]);

  const onAmount = state.step === 'amount';
  const fresh = state.step === 'payDate' && state.payInput.trim() === '' && state.pay === null;

  const loadExample = () => {
    const steps: Action[] = [
      { type: 'setPayInput', value: 'today' },
      { type: 'confirm' },
      { type: 'setLastInput', value: '+30' },
      { type: 'confirm' },
      { type: 'setAmountInput', value: '18500' },
      { type: 'confirm' },
    ];
    for (const action of steps) {
      dispatch(action);
    }
  };

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: 'confirm' });
      }}
      noValidate
    >
      {fresh ? (
        <p className={styles.intro}>
          Tell Pacer when you get paid, the last day that pay needs to last, and how much it is.
          You'll get a day-by-day spending pace so the money reaches your next payday.
        </p>
      ) : null}

      <Field
        id="pay-date"
        label="Pay date"
        value={state.payInput}
        onChange={(value) => dispatch({ type: 'setPayInput', value })}
        status={statusFor(state.step, 'payDate', state.pay !== null)}
        placeholder="today, +7, 07-25, or 2026-07-25"
        hint={state.step === 'payDate' ? view.pay : undefined}
      />
      {state.step === 'payDate' ? (
        <Chips chips={PAY_CHIPS} onPick={(value) => dispatch({ type: 'setPayInput', value })} />
      ) : null}

      <Field
        id="last-day"
        label="Last day it covers"
        value={state.lastInput}
        onChange={(value) => dispatch({ type: 'setLastInput', value })}
        status={statusFor(state.step, 'lastDay', state.last !== null)}
        placeholder="+30, 07-25, or 2026-07-25"
        hint={state.step === 'lastDay' ? view.last : undefined}
      />
      {state.step === 'lastDay' ? (
        <Chips chips={LAST_CHIPS} onPick={(value) => dispatch({ type: 'setLastInput', value })} />
      ) : null}

      <Field
        id="amount"
        label="Amount (R)"
        value={state.amountInput}
        onChange={(value) => dispatch({ type: 'setAmountInput', value })}
        status={statusFor(state.step, 'amount', state.total !== null)}
        placeholder="e.g. 18500"
        hint={state.step === 'amount' ? view.amount : undefined}
        inputMode="decimal"
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.back}
          onClick={() => dispatch({ type: 'back' })}
          disabled={state.step === 'payDate'}
        >
          <ArrowLeft size={18} aria-hidden />
          Back
        </button>
        <button type="submit" className={styles.next}>
          {onAmount ? 'Plan it' : 'Continue'}
          {onAmount ? <Sparkles size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
        </button>
      </div>

      {fresh ? (
        <button type="button" className={styles.example} onClick={loadExample}>
          <Wand2 size={16} aria-hidden />
          See an example
        </button>
      ) : null}
    </form>
  );
}
