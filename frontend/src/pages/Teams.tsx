import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { GlassCard } from '../components/ui/GlassCard';
import { GlowButton } from '../components/ui/GlowButton';
import {
  Users,
  Radio,
  MapPin,
  Clock,
  BatteryCharging,
  PhoneCall,
  Flame,
  Ambulance,
  Shield,
  Biohazard,
  LifeBuoy,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { soundFx } from '../utils/audio';

export const Teams: React.FC = () => {
  const { teams, activeIncident, dispatchTeamToIncident, setActiveIncidentId } = useEmergency();
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [commMessage, setCommMessage] = useState<string | null>(null);

  const getTeamIcon = (type: string) => {
    switch (type) {
      case 'Fire':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'Medical':
        return <Ambulance className="w-5 h-5 text-cyan-400" />;
      case 'Police':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'Hazmat':
        return <Biohazard className="w-5 h-5 text-purple-400" />;
      case 'Rescue':
      default:
        return <LifeBuoy className="w-5 h-5 text-amber-400" />;
    }
  };

  const simulateRadioComm = (teamName: string, channel: string) => {
    soundFx.playDispatch();
    setCommMessage(`CONNECTED TO ${teamName.toUpperCase()} [${channel}]: "Affirmative Command, signal strength 100%. Standing by for orders."`);
    setTimeout(() => {
      setCommMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              FIELD RESPONSE TEAMS
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
            FIRST RESPONDERS • FIRE BRIGADES • EMS PARAMEDICS • TACTICAL UNITS
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm">
            {teams.filter((t) => t.status === 'AVAILABLE').length} UNITS AVAILABLE
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-400 font-semibold shadow-sm">
            {teams.filter((t) => t.status === 'EN_ROUTE' || t.status === 'ON_SCENE').length} ACTIVE ON MISSION
          </div>
        </div>
      </div>

      {/* Simulated Radio Comm Alert Banner */}
      {commMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/50 text-xs font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-3 animate-pulse shadow-sm dark:shadow-[0_0_20px_rgba(0,212,255,0.2)]">
          <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          <span>{commMessage}</span>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const isEnRoute = team.status === 'EN_ROUTE';
          const isOnScene = team.status === 'ON_SCENE';

          return (
            <GlassCard
              key={team.id}
              className={`p-5 flex flex-col justify-between transition-all ${
                isEnRoute
                  ? 'border-amber-400 dark:border-amber-500/40 shadow-sm dark:shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                  : isOnScene
                  ? 'border-blue-400 dark:border-blue-500/40 shadow-sm dark:shadow-[0_0_25px_rgba(59,130,246,0.15)]'
                  : ''
              }`}
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex-shrink-0">
                      {getTeamIcon(team.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{team.name}</h3>
                      <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">#{team.id}</span>
                    </div>
                  </div>
                  <StatusBadge type="teamStatus" value={team.status} />
                </div>

                {/* Team Details */}
                <div className="space-y-2 py-3 border-y border-slate-200 dark:border-white/5 font-mono text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Vehicle:</span>
                    <span className="text-slate-900 dark:text-white font-medium">{team.vehicleName} ({team.vehicleId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Personnel:</span>
                    <span>{team.membersCount} Specialists</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Assigned Station:</span>
                    <span className="text-slate-700 dark:text-slate-300">{team.location.zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">SLA Response ETA:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                      {team.responseTimeEta > 0 ? `${team.responseTimeEta} MIN` : 'ON SITE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Radio Channel:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{team.contactRadioChannel}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => simulateRadioComm(team.name, team.contactRadioChannel)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Simulate Radio Handshake"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Radio</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/map')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-cyan-700 dark:text-cyan-400 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Track</span>
                  </button>

                  {team.status === 'AVAILABLE' && activeIncident && (
                    <button
                      onClick={() => dispatchTeamToIncident(team.id, activeIncident.id)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 border border-cyan-600 dark:border-cyan-500/40 text-xs font-mono text-white dark:text-cyan-300 font-semibold transition-colors shadow-sm"
                    >
                      Dispatch
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
