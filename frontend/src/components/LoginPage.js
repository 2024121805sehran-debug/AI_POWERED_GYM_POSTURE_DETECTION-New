import { useState } from "react";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  Dumbbell,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  User,
} from "lucide-react";

function LoginPage({ onLoginSuccess, onSwitchToRegister, onContinueAsGuest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setIsEmailValid(validateEmail(value));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (error) {
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email");
          break;
        case "auth/wrong-password":
          setError("Incorrect password");
          break;
        case "auth/invalid-email":
          setError("Invalid email address");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later");
          break;
        default:
          setError("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 mb-4">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Gym Coach</h1>
          <p className="text-slate-400">Sign in to continue your fitness journey</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Welcome Back</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                onClick={() => {/* TODO: Implement forgot password */}}
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !isEmailValid}
              className="w-full btn-success flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Quick Guest Access Button */}
            {onContinueAsGuest && (
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full mt-3 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>Continue as Guest (Instant Access)</span>
              </button>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-slate-700"></div>
            <span className="px-4 text-sm text-slate-500">or</span>
            <div className="flex-1 border-t border-slate-700"></div>
          </div>

          {/* Register Link */}
          <p className="text-center text-slate-400 text-sm">
            Don't have an account?{" "}
            <button
              onClick={onSwitchToRegister}
              className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              Create Account
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          AI Gym Coach - Secure Authentication
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
