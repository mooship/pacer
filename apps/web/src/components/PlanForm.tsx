import { type Step, previews } from '@pacer/core';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePacerStore } from '../store.js';
import { Field } from './Field.js';
import styles from './PlanForm.module.css';

const statusFor = (step: Step, field: Step, done: boolean): 'active' | 'done' | 'idle' =>
  step === field ? 'active' : done ? 'done' : 'idle';

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
      <Field
        id="pay-date"
        label="Pay date"
        value={state.payInput}
        onChange={(value) => dispatch({ type: 'setPayInput', value })}
        status={statusFor(state.step, 'payDate', state.pay !== null)}
        placeholder="today, +7, or 2026-07-25"
        hint={state.step === 'payDate' ? view.pay : undefined}
      />
      <Field
        id="last-day"
        label="Last day it covers"
        value={state.lastInput}
        onChange={(value) => dispatch({ type: 'setLastInput', value })}
        status={statusFor(state.step, 'lastDay', state.last !== null)}
        placeholder="+30 or 2026-07-25"
        hint={state.step === 'lastDay' ? view.last : undefined}
      />
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
    </form>
  );
}
