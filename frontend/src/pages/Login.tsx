import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio,
  Lock,
  Mail,
  KeyRound,
  Cpu,
  ArrowRight,
  Sun,
  Moon,
  Home,
  AlertCircle,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { GlowButton } from '../components/ui/GlowButton';
import { RadarBackground } from '../components/ui/RadarBackground';
import { SplitCursor } from '../components/ui/SplitCursor';
import { soundFx } from '../utils/audio';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useEmergency();
  const { login, user } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to intended destination or /command-center
  useEffect(() => {
    if (user) {
      const destination = (location.state as any)?.from?.pathname || '/command-center';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playDispatch();
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      await login({ email: email.trim(), password });
      soundFx.playClick();
      const destination = (location.state as any)?.from?.pathname || '/command-center';
      navigate(destination, { replace: true });
    } catch (err: any) {
      soundFx.playEmergencyAlert();
      setErrorMessage(err.message || 'Authentication rejected. Verify email and clearance key.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#05070D] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-hidden transition-colors duration-500">
      <SplitCursor />
      <RadarBackground opacity={theme === 'dark' ? 0.35 : 0.2} />

      {/* Top Floating Utility Bar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 backdrop-blur-md shadow-sm transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-amber-400 hover:scale-105 backdrop-blur-md shadow-sm transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative z-20 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Command Center Telemetry & Visual */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-6 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shadow-[0_0_20px_rgba(0,217,255,0.25)]">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-display font-extrabold text-2xl tracking-wider text-slate-900 dark:text-white">
                PS-9 INTELLIGENT OPS
              </span>
              <span className="block text-xs font-mono text-cyan-600 dark:text-cyan-400 tracking-tight">
                AUTONOMOUS COMMAND & RESOURCE COORDINATION
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/80 dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                SYSTEM STATUS: ONLINE
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">NODE: APEX-METRO-01</div>
            </div>

            <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
              <img
                src="/assets/command_center_hero.jpg"
                alt="Command Center"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-white/90">
                <span>WAR ROOM ACTIVE // AUTOMATIC ROLE & CLEARANCE RECOGNITION</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Authorized emergency command access only. All dispatches, resource allocations, and triage actions are cryptographically verified and audited in the immutable event ledger.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <div className="text-slate-500 text-[10px]">ACTIVE RESPONDERS</div>
                <div className="text-base font-bold text-cyan-600 dark:text-cyan-300 mt-1">18 FIELD TEAMS</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <div className="text-slate-500 text-[10px]">AI ENGINE STATUS</div>
                <div className="text-base font-bold text-purple-600 dark:text-purple-300 mt-1">94.8% ACCURACY</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <Lock className="w-3.5 h-3.5" />
              <span>TLS 1.3 ENCRYPTION</span>
            </div>
            <span>•</span>
            <div>256-BIT JWT SECURE MESH</div>
          </div>
        </motion.div>

        {/* Right Side: Signin Form Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-6"
        >
          <div className="rounded-2xl bg-white/90 dark:bg-[#080B12]/90 border border-slate-200 dark:border-white/15 p-6 sm:p-8 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(0,217,255,0.1)]">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3 h-3" />
                OFFICIAL CONSOLE LOGIN
              </div>
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-1">
                OPERATOR AUTHENTICATION
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                ENTER REGISTERED CADET EMAIL AND SECURITY CLEARANCE KEY
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300 font-mono text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Cadet Email Field */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  OFFICIAL CADET EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin123@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Security Key / Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    SECURITY CLEARANCE KEY
                  </label>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                <span>Clearance role is automatically recognized from your verified cadet account.</span>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <GlowButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isAuthenticating}
                  className="w-full"
                  icon={
                    isAuthenticating ? (
                      <Cpu className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                >
                  {isAuthenticating ? 'VERIFYING BIOMETRICS...' : 'ACCESS COMMAND CENTER'}
                </GlowButton>
              </div>

              {/* Enlist / Register Navigation Link */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-center">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  New emergency personnel?{' '}
                  <Link
                    to="/signup"
                    onClick={() => soundFx.playClick()}
                    className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1 ml-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 inline" />
                    <span>Register Cadet Clearance</span>
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
