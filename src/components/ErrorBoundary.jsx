import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

/**
 * Catches rendering errors so one broken panel does not take down the whole app.
 *
 * variant="app":   full-screen fallback with Reload and Reset buttons (outermost boundary).
 * variant="panel": inline fallback that fills the panel's space, with "Try again"
 *                  and, when `onClose` is given, a Close button.
 *
 * Changing `resetKey` clears the error, so a panel recovers on its own when its input changes.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.name || 'App'}] crashed:`, error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { variant = 'panel', name = 'This panel', onClose, className = '' } = this.props;

    if (variant === 'app') {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-900 text-white p-6">
          <div className="bg-slate-800 border border-red-500 rounded-lg p-6 max-w-lg shadow-xl text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-300 mb-4">{error.message || 'An unexpected rendering error occurred.'}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-sm transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  try { localStorage.clear(); } catch (e) {}
                  window.location.reload();
                }}
                title="Clears saved settings and the autosaved layout, then reloads"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 font-semibold rounded text-sm transition-colors"
              >
                Reset & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-2 p-4 text-center bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 ${className}`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle size={16} />
          <span>{name} hit an error</span>
        </div>
        <p className="text-xs opacity-80 max-w-md break-words">{error.message || 'Unexpected rendering error.'}</p>
        <p className="text-[11px] opacity-70">The rest of the app still works. Your layout is unchanged.</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={this.reset}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded"
          >
            <RotateCcw size={12} /> Try again
          </button>
          {onClose && (
            <button
              onClick={() => { this.reset(); onClose(); }}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold border border-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
            >
              <X size={12} /> Close
            </button>
          )}
        </div>
      </div>
    );
  }
}
