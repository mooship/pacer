import { mood } from '@pacer/core';
import { usePacerStore } from '../store.js';
import styles from './Mascot.module.css';

interface MascotProps {
  size?: number;
}

/** The turtle mascot, styled per the wizard's current {@link mood}. */
export function Mascot({ size = 26 }: MascotProps) {
  const state = usePacerStore((s) => s.state);

  return (
    <span className={styles.mascot} data-variant={mood(state)} style={{ fontSize: size }}>
      🐢
    </span>
  );
}
