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
    console.error("Trap Wars UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ minHeight: "100dvh", padding: "2rem 1.25rem", background: "#090b0b", color: "#f5f5f0" }}>
        <h1 style={{ color: "#e9b72f", letterSpacing: "0.08em" }}>TRAP WARS</h1>
        <p>Something went wrong loading this page.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: "12px 20px", background: "#16d879", color: "#07110b", border: 0, fontWeight: 800, cursor: "pointer" }}
        >
          Reload
        </button>
      </main>
    );
  }
}
