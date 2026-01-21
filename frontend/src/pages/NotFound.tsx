import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-center">
            <div className="rounded-full bg-gray-800 p-6 mb-6 ring-1 ring-gray-700">
                <FileQuestion className="h-16 w-16 text-blue-500" />
            </div>
            <h1 className="mb-2 text-4xl font-bold text-white tracking-tight">Page not found</h1>
            <p className="mb-8 text-lg text-gray-400 max-w-sm mx-auto">
                Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
            </p>
            <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-white font-medium hover:bg-gray-700 transition-colors border border-gray-700"
            >
                <ArrowLeft className="h-5 w-5" />
                Go back home
            </button>
        </div>
    );
}
