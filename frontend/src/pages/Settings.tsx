import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { GlowButton } from '../components/ui/GlowButton';
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ShieldAlert,
  Cpu,
  Map,
  Bell,
  User,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const Settings: React.FC = () => {
  const {
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    isSimulating,
    toggleSimulationTimer,
  } = useEmergency();

  const [operatorName, setOperatorName] = useState<string>('Commander Alex Vance');
  const [deskStation, setDeskStation] = useState<string>('Command Desk Alpha-04');
  const [delayThreshold, setDelayThreshold] = useState<number>(8);
  const [aiConfidenceCutoff, setAiConfidenceCutoff] = useState<number>(90);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playDispatch();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              SYSTEM SETTINGS & THRESHOLDS
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            ALGORITHM POLICIES • SENSITIVITY CALIBRATION • INTERFACE PREFERENCES
          </p>
        </div>

        {savedMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono text-xs flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Parameters Synchronized</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Operator Profile */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <User className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">OPERATOR IDENTIFICATION</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">OPERATOR NAME</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">ASSIGNED DESK / CONSOLE</label>
              <input
                type="text"
                value={deskStation}
                onChange={(e) => setDeskStation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Emergency Response Thresholds */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">EMERGENCY THRESHOLDS & SLA</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-2">
                <span>Response Delay Cutoff Flag:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{delayThreshold} Minutes</span>
              </div>
              <input
                type="range"
                min="4"
                max="20"
                value={delayThreshold}
                onChange={(e) => setDelayThreshold(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Units taking longer than this benchmark automatically trigger high-priority delay escalations.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-2">
                <span>AI Auto-Triage Confidence Gate:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{aiConfidenceCutoff}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                value={aiConfidenceCutoff}
                onChange={(e) => setAiConfidenceCutoff(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Confidence threshold required for autonomous resource allocation recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Interface & Tactical Preferences */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <Activity className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">INTERFACE & TACTICAL AUDIO</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Audio Toggle */}
            <div
              onClick={toggleSound}
              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-slate-900 dark:text-white font-semibold block">Tactical Audio FX</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sonars, alert warbles</span>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </div>
            </div>

            {/* Theme Toggle */}
            <div
              onClick={toggleTheme}
              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-slate-900 dark:text-white font-semibold block">Color Theme</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Command Dark' : 'Operations Light'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
            </div>

            {/* Live Simulation Clock Toggle */}
            <div
              onClick={toggleSimulationTimer}
              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-slate-900 dark:text-white font-semibold block">Live Simulation Tick</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isSimulating ? 'Active (5s drift)' : 'Paused'}
                </span>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  isSimulating ? 'bg-emerald-500 animate-ping' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <GlowButton variant="primary" size="lg" type="submit">
            SAVE OPERATIONAL PREFERENCES
          </GlowButton>
        </div>
      </form>
    </div>
  );
};
