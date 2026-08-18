import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, info) {
    console.error("Module error:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="page">
        <article className="mc-section">
          <h2>
            <AlertTriangle />
            {this.props.moduleName || "Modulen"} kunde inte visas
          </h2>

          <p>
            Ett JavaScript-fel uppstod i den här modulen. Resten av appen
            fortsätter fungera.
          </p>

          <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
            {this.state.error?.message || "Okänt fel"}
          </pre>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            Ladda om sidan
          </button>
        </article>
      </section>
    );
  }
}
