import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Radio,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Sun,
  Moon,
  Home,
  Sparkles,
} from 'lucide-react';
import { GlowButton } from '../components/ui/GlowButton';
import { RadarBackground } from '../components/ui/RadarBackground';
import { SplitCursor } from '../components/ui/SplitCursor';
import { soundFx } from '../utils/audio';
import { useEmergency } from '../context/EmergencyContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useEmergency();
  const [operatorId, setOperatorId] = useState<string>('OP-DELTA-9');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [role, setRole] = useState<string>('Emergency Operator');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const roles = [
    'Emergency Operator',
    'Administrator',
    'Field Coordinator',
    'Medical Coordinator',
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playDispatch();
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      navigate('/command-center');
    }, 1000);
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

            <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
              <img
                src="/assets/command_center_hero.jpg"
                alt="Command Center"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-white/90">
                <span>WAR ROOM ACTIVE // 24 TACTICAL CHANNELS</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Authorized emergency control room access only. All actions, dispatch approvals, and escalation overrides are cryptographically audited in the real-time event ledger.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <div className="text-slate-500 text-[10px]">CURRENT ACTIVE UNITS</div>
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
              <span>TLS 1.3 SECURE ENCRYPTION</span>
            </div>
            <span>•</span>
            <div>256-BIT AUTH KEY</div>
          </div>
        </motion.div>

        {/* Right Side: Glass Login Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-6"
        >
          <div className="rounded-2xl bg-white/90 dark:bg-[#080B12]/90 border border-slate-200 dark:border-white/15 p-6 sm:p-8 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(0,217,255,0.1)]">
            <div className="mb-6">
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-1">
                OPERATOR AUTHENTICATION
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                SELECT ASSIGNED STATION & VERIFY CREDENTIALS
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
                  OPERATIONAL ROLE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setRole(r);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-mono text-left transition-all border ${
                        role === r
                          ? 'bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-500/50 shadow-sm font-semibold'
                          : 'bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operator ID Field */}
              <div>
                <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                  OPERATOR BADGE ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Security Key */}
              <div>
                <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                  SECURITY CLEARANCE KEY
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Quick Demo Credentials Autofill */}
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">DEMO CREDENTIALS:</span>
                <button
                  type="button"
                  onClick={() => {
                    setOperatorId('OP-DELTA-9');
                    setPassword('admin-verified-2026');
                    setRole('Administrator');
                  }}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  Autofill Admin
                </button>
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
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
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
