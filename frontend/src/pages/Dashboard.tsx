import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-900 p-8 text-white">
            <div className="mx-auto max-w-4xl">
                <header className="mb-8 flex items-center justify-between rounded-xl bg-gray-800 p-6 shadow-lg border border-gray-700">
                    <div>
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <p className="text-gray-400">Welcome back{user?.fullName ? `, ${user.fullName}` : '!'}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center rounded-lg bg-red-600/10 px-4 py-2 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                    >
                        <LogOut className="mr-2 h-5 w-5" />
                        Logout
                    </button>
                </header>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Placeholder cards */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl bg-gray-800 p-6 shadow border border-gray-700">
                            <div className="mb-4 h-10 w-10 rounded-lg bg-blue-600/20" />
                            <h3 className="mb-2 text-lg font-semibold">Feature {i}</h3>
                            <p className="text-gray-400">
                                This is a placeholder for dashboard content. Connect your services here.
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
