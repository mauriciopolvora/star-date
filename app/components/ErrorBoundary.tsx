"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary to catch and display Three.js rendering errors
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Three.js Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-black text-white p-8">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Rendering Error
            </h1>
            <p className="text-zinc-400 mb-4">
              Failed to render the 3D scene. This might be due to:
            </p>
            <ul className="text-left text-zinc-400 text-sm mb-6 space-y-2">
              <li>• Your browser doesn't support WebGL</li>
              <li>• GPU or graphics driver issues</li>
              <li>• Missing star data files</li>
            </ul>
            {this.state.error && (
              <details className="text-left text-xs text-zinc-500 bg-zinc-900 p-4 rounded-md">
                <summary className="cursor-pointer mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
