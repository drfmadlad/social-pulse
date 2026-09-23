import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

/**
 * The last resort above the whole app, for a render error the route tree's `errorElement` can't
 * catch: one thrown by `App` or `RouterProvider` themselves. It's deliberately independent of the
 * router (a plain fallback with a reload button, no `Link`), since anything that needs router
 * context would fail in the same place. A class, because React has no hook for error boundaries.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Social Pulse caught an error outside its screens", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="home-feed">
        <section className="home-section">
          <h1 className="home-section__heading">Something went wrong</h1>
          <p className="home-section__placeholder">
            Social Pulse couldn't load. Anything you'd already finished is still saved in History.
          </p>
          <button type="button" className="button-primary route-error__action" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      </div>
    );
  }
}
