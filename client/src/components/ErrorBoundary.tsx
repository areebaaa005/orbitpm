import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

interface State {
  failed: boolean;
}

/** Catches render errors so one broken page shows a message instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-space-950 px-4">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-800">
            <TriangleAlert size={22} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-space-50">Something went wrong</h1>
          <p className="mt-1 text-sm text-space-300">
            This page ran into an unexpected problem. Your data is safe. Reloading usually fixes it.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="btn-secondary" href="/">
              Go to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
