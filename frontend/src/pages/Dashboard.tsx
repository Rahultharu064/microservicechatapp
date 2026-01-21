import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import type { UserProfile } from "../services/userService";
import { LogOut, User as UserIcon, Calendar, Mail, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function Dashboard() {
    const { logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await userService.getProfile();
                setProfile(data);
            } catch (error) {
                console.error("Failed to fetch profile", error);
                toast.error("Could not load profile data.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8 text-white">
            <div className="mx-auto max-w-4xl">
                <header className="mb-8 flex items-center justify-between rounded-xl bg-gray-800 p-6 shadow-lg border border-gray-700">
                    <div>
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <p className="text-gray-400">Welcome back{profile?.fullName ? `, ${profile.fullName}` : '!'}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center rounded-lg bg-red-600/10 px-4 py-2 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                    >
                        <LogOut className="mr-2 h-5 w-5" />
                        Logout
                    </button>
                </header>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Profile Card */}
                    <div className="rounded-xl bg-gray-800 p-6 shadow border border-gray-700">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
                                {profile?.fullName?.charAt(0) || <UserIcon />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{profile?.fullName}</h3>
                                <p className="text-gray-400 flex items-center text-sm">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${profile?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {profile?.status || "Unknown Status"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center text-gray-300">
                                <Mail className="mr-3 h-5 w-5 text-gray-500" />
                                {profile?.email}
                            </div>
                            <div className="flex items-center text-gray-300">
                                <Calendar className="mr-3 h-5 w-5 text-gray-500" />
                                Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                            <div className="flex items-center text-gray-300">
                                <Shield className="mr-3 h-5 w-5 text-gray-500" />
                                User ID: <span className="ml-2 font-mono text-xs text-gray-500">{profile?.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for Stats or other features */}
                    <div className="rounded-xl bg-gray-800 p-6 shadow border border-gray-700">
                        <h3 className="mb-4 text-lg font-semibold">Quick Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-700/50 p-4 rounded-lg">
                                <span className="block text-3xl font-bold text-blue-400">0</span>
                                <span className="text-sm text-gray-400">Messages Sent</span>
                            </div>
                            <div className="bg-gray-700/50 p-4 rounded-lg">
                                <span className="block text-3xl font-bold text-purple-400">0</span>
                                <span className="text-sm text-gray-400">Groups Joined</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
