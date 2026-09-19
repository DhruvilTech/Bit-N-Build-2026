import React from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Bell,
  ShieldAlert,
  Flame,
  Menu,
  LogOut,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GlowButton } from '../ui/GlowButton';
import { motion } from 'framer-motion';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    currentTime,
    currentDate,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    setIsSimulatorModalOpen,
    setIsNotificationsDrawerOpen,
    notifications,
    stats,
  } = useEmergency();

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#060911]/90 backdrop-blur-xl px-4 lg:px-6 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-colors duration-200">
      {/* Left: Brand & Live indicator */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold tracking-wider text-sm lg:text-base text-slate-900 dark:text-white">
                PS-9 COMMAND
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE OPS
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-tight hidden md:block">
              INTELLIGENT EMERGENCY RESPONSE & RESOURCE COORDINATION
            </p>
          </div>
        </div>
      </div>

      {/* Center: Live Digital Clock & Operational Metrics */}
      <div className="hidden xl:flex items-center gap-6 px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
          <span>{currentDate}</span>
          <span className="text-slate-900 dark:text-white font-semibold text-sm tracking-widest">{currentTime}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="font-bold">{stats.criticalIncidents}</span> CRITICAL
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-cyan-700 dark:text-cyan-400 font-medium">{stats.activeTeams} ACTIVE TEAMS</span>
        </div>
      </div>

      {/* Right: Actions, Simulator trigger & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SIMULATE EMERGENCY CTA BUTTON */}
        <GlowButton
          variant="critical"
          size="sm"
          pulse={true}
          onClick={() => setIsSimulatorModalOpen(true)}
          icon={<Flame className="w-3.5 h-3.5" />}
          className="text-xs uppercase tracking-wider font-bold shadow-sm"
        >
          <span className="hidden sm:inline">SIMULATE</span> EMERGENCY
        </GlowButton>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Interface Audio' : 'Enable Tactical Audio'}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to White Theme' : 'Switch to Dark Command Theme'}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-200"
          aria-label="Toggle theme"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </motion.div>
        </button>

        {/* Notifications Trigger */}
        <button
          onClick={() => setIsNotificationsDrawerOpen(true)}
          title="Open Dispatch Alerts"
          className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold font-mono text-white flex items-center justify-center animate-pulse shadow-[0_0_8px_#EF4444]">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Operator Profile & Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/50 flex items-center justify-center text-white font-bold text-xs font-mono shadow-sm">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="text-left font-mono hidden md:block">
            <div className="text-xs font-semibold text-slate-900 dark:text-white leading-none truncate max-w-[120px]">
              {user?.name || 'COMMANDER'}
            </div>
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 leading-none mt-1 font-bold">
              {user?.role || 'OPERATOR'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Terminate Session / Logout"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-white/10 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
