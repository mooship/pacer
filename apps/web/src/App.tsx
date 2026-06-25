import { Settings as SettingsIcon } from 'lucide-react';
import styles from './App.module.css';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { Mascot } from './components/Mascot.js';
import { PlanForm } from './components/PlanForm.js';
import { ResultsView } from './components/ResultsView.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { StatusMessage } from './components/StatusMessage.js';
import { usePacerStore } from './store.js';

export function App() {
  const state = usePacerStore((s) => s.state);
  const dispatch = usePacerStore((s) => s.dispatch);
  const baseStep = state.step === 'settings' ? state.settingsReturn : state.step;
  const onResults = baseStep === 'results';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            <Mascot size={26} />
          </span>
          <div>
            <h1 className={styles.title}>Pacer</h1>
            <p className={styles.tagline}>Pace your pay across the month</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={() => dispatch({ type: 'openSettings' })}
        >
          <SettingsIcon size={20} aria-hidden />
          <span className="visually-hidden">Settings</span>
        </button>
      </header>

      <ErrorBoundary>
        <main className={styles.card}>
          {onResults ? <ResultsView /> : <PlanForm />}
          <StatusMessage />
        </main>

        <SettingsDialog />
      </ErrorBoundary>

      <footer className={styles.footer}>
        <p>Allowances round to your quantum; the remainder rides on the first payment.</p>
      </footer>
    </div>
  );
}
