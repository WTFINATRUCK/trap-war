import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Trap War crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            background: "#07060c",
            color: "#f5f2fa",
            padding: "2rem 1.25rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ color: "#a855f7", letterSpacing: "0.12em" }}>TRAP WAR</h1>
          <p style={{ color: "#ef4444", fontWeight: 700 }}>Something crashed the UI.</p>
          <pre
            style={{
              background: "#12101a",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: 12,
              padding: "1rem",
              overflow: "auto",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: "12px 20px",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => {
              try {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("trapwar_"))
                  .forEach((k) => localStorage.removeItem(k));
              } catch {
                /* ignore */
              }
              window.location.href = "/?tg=12345";
            }}
          >
            Clear save & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
