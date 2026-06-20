import { usePacerStore } from '../store.js';
import styles from './Mascot.module.css';

interface MascotProps {
  size?: number;
}

export function Mascot({ size = 26 }: MascotProps) {
  const state = usePacerStore((s) => s.state);
  const baseStep = state.step === 'settings' ? state.settingsReturn : state.step;
  const variant =
    state.error && state.step !== 'settings'
      ? 'error'
      : baseStep === 'results'
        ? 'success'
        : 'idle';

  return (
    <span className={styles.mascot} data-variant={variant} style={{ fontSize: size }}>
      🐢
    </span>
  );
}
