import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      return toast.error("Please fill in all fields");
    }

    setLoading(true);
    try {
      await register(email, password, fullName);
      toast.success("Registration successful! Please login.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-xl border border-gray-700">
        <h2 className="mb-6 text-center text-3xl font-bold text-white">
          Create Account
        </h2>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                minLength={8}
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
                Register <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-400">Already have an account? </span>
            <Link to="/login" className="text-blue-500 hover:text-blue-400 hover:underline">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}