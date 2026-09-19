import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Lock, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlowButton } from '../components/ui/GlowButton';
import { RadarBackground } from '../components/ui/RadarBackground';
import { soundFx } from '../utils/audio';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const requiredRoles = (location.state as any)?.requiredRoles as string[] | undefined;

  const handleBack = () => {
    soundFx.playClick();
    navigate('/command-center');
  };

  const handleSwitchAccount = async () => {
    soundFx.playClick();
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#05070D] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-hidden transition-colors duration-500">
      <RadarBackground opacity={0.25} />

      <div className="relative z-20 w-full max-w-lg">
        <div className="rounded-2xl bg-white/95 dark:bg-[#080B12]/95 border border-red-500/40 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(239,68,68,0.2)] text-center space-y-6">
          {/* Glowing Warning Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" />
              SECURITY LEVEL EXCEEDED
            </span>
            <h1 className="text-2xl font-display font-extrabold tracking-wide text-slate-900 dark:text-white">
              ACCESS RESTRICTED
            </h1>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
              Your security badge clearance does not have authorization to view or dispatch operations on this tactical console.
            </p>
          </div>

          {/* User & Role Telemetry */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 font-mono text-xs text-left space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span>ACTIVE USER:</span>
              <span className="text-slate-900 dark:text-white font-semibold">{user?.name || 'UNKNOWN'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>CURRENT ROLE:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold">
                {user?.role || 'NONE'}
              </span>
            </div>
            {requiredRoles && requiredRoles.length > 0 && (
              <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200 dark:border-white/5">
                <span>REQUIRED CLEARANCE:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {requiredRoles.join(' / ')}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-500">
              <span>BADGE ID:</span>
              <span className="text-slate-600 dark:text-slate-400">{user?.badgeNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <GlowButton
              variant="primary"
              size="md"
              onClick={handleBack}
              icon={<ArrowLeft className="w-4 h-4" />}
              className="flex-1"
            >
              COMMAND CENTER
            </GlowButton>
            <GlowButton
              variant="outline"
              size="md"
              onClick={handleSwitchAccount}
              icon={<LogOut className="w-4 h-4" />}
              className="flex-1"
            >
              SWITCH STATION
            </GlowButton>
          </div>

          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 pt-2">
            <Radio className="w-3 h-3 text-cyan-500" />
            <span>INCIDENT LOGGED TO IMMUTABLE AUDIT TRAIL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
