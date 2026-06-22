import { type FieldState, fmtIso, previews, resolveDate } from '@pacer/core';
import { Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePacerStore } from '../store.js';
import { Field } from './Field.js';
import styles from './PlanForm.module.css';

const hintFor = (
  attempted: boolean,
  state: FieldState,
  preview: string,
  invalidMsg: string,
  requiredMsg: string,
): string | undefined => {
  if (state === 'invalid') {
    return invalidMsg;
  }
  if (state === 'empty') {
    return attempted ? requiredMsg : undefined;
  }
  return preview;
};

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
  const [attempted, setAttempted] = useState(false);

  const payResolved =
    state.payInput.trim() !== '' ? resolveDate(state.payInput, state.today) : null;
  const payMin = payResolved?.ok ? fmtIso(payResolved.value) : undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus the first empty field on entry
  useEffect(() => {
    const inputs = [...(formRef.current?.querySelectorAll<HTMLInputElement>('input') ?? [])];
    const target = inputs.find((i) => i.value.trim() === '') ?? inputs[0];
    target?.focus();
  }, [state.step]);

  const fresh =
    state.payInput.trim() === '' &&
    state.lastInput.trim() === '' &&
    state.amountInput.trim() === '';

  const loadExample = () => {
    dispatch({
      type: 'restorePlan',
      snap: { pay: state.today, last: state.today + 30, total: 1850000, boost: 0 },
    });
  };

  const submit = () => {
    if (view.payState !== 'ok' || view.lastState !== 'ok' || view.amountState !== 'ok') {
      setAttempted(true);
      const order: FieldState[] = [view.payState, view.lastState, view.amountState];
      const ids = ['pay-date', 'last-day', 'amount'];
      const firstBad = order.findIndex((s) => s !== 'ok');
      if (firstBad !== -1) {
        document.getElementById(ids[firstBad])?.focus();
      }
      return;
    }
    dispatch({ type: 'submit' });
  };

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
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
        complete={view.payState === 'ok'}
        placeholder="today, +7, 07-25, or 2026-07-25"
        hint={hintFor(
          attempted,
          view.payState,
          view.pay,
          'Hmm, try today, +7, 07-25, or 2026-07-25.',
          'Enter a pay date to start.',
        )}
        invalid={view.payState === 'invalid' || (attempted && view.payState === 'empty')}
        datePicker
      />
      <Chips chips={PAY_CHIPS} onPick={(value) => dispatch({ type: 'setPayInput', value })} />

      <Field
        id="last-day"
        label="Last day it covers"
        value={state.lastInput}
        onChange={(value) => dispatch({ type: 'setLastInput', value })}
        complete={view.lastState === 'ok'}
        placeholder="+30, 07-25, or 2026-07-25"
        hint={hintFor(
          attempted,
          view.lastState,
          view.last,
          'That date is before pay day — try a later one.',
          'Enter the last day this pay covers.',
        )}
        invalid={view.lastState === 'invalid' || (attempted && view.lastState === 'empty')}
        datePicker
        min={payMin}
      />
      <Chips chips={LAST_CHIPS} onPick={(value) => dispatch({ type: 'setLastInput', value })} />

      <Field
        id="amount"
        label="Amount (R)"
        value={state.amountInput}
        onChange={(value) => dispatch({ type: 'setAmountInput', value })}
        complete={view.amountState === 'ok'}
        placeholder="e.g. 18500"
        hint={hintFor(
          attempted,
          view.amountState,
          view.amount,
          'Enter an amount like 18500 or 18500.50.',
          'Enter the amount to pace.',
        )}
        invalid={view.amountState === 'invalid' || (attempted && view.amountState === 'empty')}
        inputMode="decimal"
      />

      <div className={styles.actions}>
        <button type="submit" className={styles.next}>
          Plan it
          <Sparkles size={18} aria-hidden />
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
