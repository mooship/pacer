import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

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
      localStorage.removeItem('pacer.config');
      localStorage.removeItem('pacer.plan');
    } catch {
      // localStorage may be unavailable; falls through to reload
    }
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
