import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Brand } from './Brand';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[BajetBN] A page could not be shown.', error, info);
  }

  private reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('__bajetbn_reload', String(Date.now()));
    window.location.replace(url.toString());
  };

  private goHome = () => {
    window.location.assign(`/?__bajetbn_reload=${Date.now()}`);
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="center-screen app-error-screen">
        <section className="panel app-error-card" role="alert">
          <Brand />
          <div className="app-error-icon" aria-hidden="true">!</div>
          <h1>This page could not open</h1>
          <p>Your saved money information has not been changed. Reload the page and try again.</p>
          <div className="button-row">
            <button type="button" className="button primary" onClick={this.reload}>Reload page</button>
            <button type="button" className="button secondary" onClick={this.goHome}>Go to Overview</button>
          </div>
        </section>
      </main>
    );
  }
}
