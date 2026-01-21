import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-center">
                    <div className="rounded-2xl bg-gray-800 p-8 shadow-xl border border-gray-700 max-w-md w-full">
                        <div className="mb-6 flex justify-center">
                            <div className="rounded-full bg-red-500/10 p-4">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                        </div>
                        <h1 className="mb-2 text-2xl font-bold text-white">Something went wrong</h1>
                        <p className="mb-6 text-gray-400">
                            We encountered an unexpected error. Please try reloading the page.
                        </p>
                        {this.state.error && (
                            <div className="mb-6 overflow-auto rounded-lg bg-gray-950 p-4 text-left text-xs text-red-400 max-h-40 font-mono">
                                {this.state.error.toString()}
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="group flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 transition-all focus:outline-none focus:ring-4 focus:ring-blue-800"
                        >
                            <RefreshCw className="mr-2 h-5 w-5 group-hover:rotate-180 transition-transform" />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
