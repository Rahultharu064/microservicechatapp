import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, CheckCircle, ArrowRight } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1: Email, 2: OTP
    const [loading, setLoading] = useState(false);
    const { login, verifyLogin } = useAuth();
    const navigate = useNavigate();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error("Please enter your email");

        setLoading(true);
        try {
            await login(email);
            setStep(2);
            toast.success("OTP sent to your email");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) return toast.error("Please enter the OTP");

        setLoading(true);
        try {
            await verifyLogin(email, otp);
            toast.success("Logged in successfully");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-xl border border-gray-700">
                <h2 className="mb-6 text-center text-3xl font-bold text-white">
                    {step === 1 ? "Welcome Back" : "Verify OTP"}
                </h2>

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-400">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-800 disabled:opacity-50 transition-all"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    Send OTP <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        <div className="mt-4 text-center text-sm">
                            <span className="text-gray-400">Don't have an account? </span>
                            <Link to="/register" className="text-blue-500 hover:text-blue-400 hover:underline">
                                Register
                            </Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="text-center mb-4">
                            <p className="text-gray-400 text-sm">
                                Enter the 6-digit code sent to <span className="text-white font-semibold">{email}</span>
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-400">
                                One-Time Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all tracking-widest text-center text-xl"
                                    placeholder="------"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-800 disabled:opacity-50 transition-all"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    Verify & Login <CheckCircle className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm text-gray-400 hover:text-white mt-4 underline">
                            Change Email
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
