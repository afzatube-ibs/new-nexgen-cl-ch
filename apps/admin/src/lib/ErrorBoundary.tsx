import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Global Error Handling / Error Boundaries (Phase 2.1 §1). Catches any
 * render-time exception a module's screen throws so one broken module never
 * takes down the entire Admin Engine — a hard requirement once dozens of
 * independently-built modules render inside the same shell.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // This is the platform's own last-resort error surface; no telemetry/
    // error-reporting pipeline exists yet — a named, future integration
    // point, not something silently dropped.
    console.error('[AdminShell] Uncaught render error', error, errorInfo);
  }

  private reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
          <AlertOctagon className="size-10 text-feedback-danger" aria-hidden="true" />
          <p className="text-subheading text-text-primary">Something went wrong</p>
          <p className="max-w-sm text-body text-text-secondary">
            An unexpected error occurred while rendering this page. You can try again, or reload the app.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-md border border-border px-4 py-2 text-body-strong hover:bg-surface-subtle"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-brand px-4 py-2 text-body-strong text-white hover:bg-brand-hover"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
