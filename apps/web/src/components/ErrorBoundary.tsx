import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PLAN_KEY, STORAGE_KEY } from '../store.js';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors in its subtree and shows a "Start over" fallback.
 * The only class component in the codebase — React only supports error
 * boundaries as classes. Reset clears both persisted config and plan and
 * does a full page navigation, never a patched-up in-memory recovery.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Pacer crashed:', error, info.componentStack);
  }

  private reset = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PLAN_KEY);
    } catch {}
    window.location.href = window.location.pathname;
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className={styles.wrap} role="alert">
        <p className={styles.title}>Something went wrong.</p>
        <p className={styles.body}>
          Pacer hit an unexpected error. Starting over clears your saved plan and settings.
        </p>
        <button type="button" className={styles.button} onClick={this.reset}>
          Start over
        </button>
      </div>
    );
  }
}
