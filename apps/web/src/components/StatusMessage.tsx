import { clsx } from 'clsx';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { usePacerStore } from '../store.js';
import styles from './StatusMessage.module.css';

export function StatusMessage() {
  const state = usePacerStore((s) => s.state);
  const showError = state.step !== 'settings' && Boolean(state.error);
  const showNotice = Boolean(state.notice);

  return (
    <div className={styles.region} aria-live="polite">
      {showError ? (
        <p className={clsx(styles.message, styles.error)} role="alert">
          <CircleAlert size={16} aria-hidden />
          {state.error}
        </p>
      ) : showNotice ? (
        <p className={clsx(styles.message, styles.notice)}>
          <CircleCheck size={16} aria-hidden />
          {state.notice}
        </p>
      ) : null}
    </div>
  );
}
