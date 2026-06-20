import type { StepStatus } from '@pacer/core';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import styles from './Stepper.module.css';

interface StepperProps {
  steps: { name: string; status: StepStatus }[];
}

export function Stepper({ steps }: StepperProps) {
  const current = steps.find((s) => s.status === 'current')?.name;
  return (
    <nav className={styles.stepper} aria-label="Progress">
      <ol className={styles.list}>
        {steps.map((step) => (
          <li
            key={step.name}
            className={clsx(styles.item, styles[step.status])}
            aria-current={step.status === 'current' ? 'step' : undefined}
          >
            <span className={styles.dot} aria-hidden>
              {step.status === 'done' ? <Check size={13} strokeWidth={3} /> : null}
            </span>
            <span className={styles.name}>{step.name}</span>
          </li>
        ))}
      </ol>
      <p className="visually-hidden">Current step: {current}</p>
    </nav>
  );
}
