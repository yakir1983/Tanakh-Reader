import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props  { children: ReactNode; }
interface State  { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    // Clear potentially corrupted state and reload clean
    try {
      localStorage.removeItem('tanach_book');
      localStorage.removeItem('tanach_chapter');
      localStorage.removeItem('tanach_verse');
      localStorage.removeItem('tanach_dark');
    } catch {
      // localStorage unavailable — ignore
    }
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        dir="rtl"
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 bg-background text-foreground px-6 text-center"
        style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
      >
        <h1 className="text-3xl font-bold text-primary">אירעה שגיאה</h1>
        <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
          האפליקציה נתקלה בבעיה בלתי צפויה.
          לחץ על הכפתור להפעלה מחדש — הנתונים יאופסו לבראשית א׳:א׳.
        </p>
        <button
          onClick={this.handleReset}
          className="px-6 py-3 rounded-2xl border-2 border-primary bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          אפס והפעל מחדש
        </button>
        <details className="text-xs text-muted-foreground/60 max-w-sm text-left" dir="ltr">
          <summary className="cursor-pointer">פרטי שגיאה</summary>
          <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error.message}</pre>
        </details>
      </div>
    );
  }
}
