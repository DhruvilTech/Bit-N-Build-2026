import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CyberHUDCard } from '../components/ui/CyberHUDCard';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Users,
  Radio,
  MapPin,
  Flame,
  Ambulance,
  Shield,
  Biohazard,
  LifeBuoy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { soundFx } from '../utils/audio';

export const Teams: React.FC = () => {
  const { teams, activeIncident, dispatchTeamToIncident } = useEmergency();
  const navigate = useNavigate();
  const [commMessage, setCommMessage] = useState<string | null>(null);

  const getTeamIcon = (type: string) => {
    switch (type) {
      case 'Fire':
        return <Flame className="w-5 h-5 text-[#F5A623]" />;
      case 'Medical':
        return <Ambulance className="w-5 h-5 text-[#34D399]" />;
      case 'Police':
        return <Shield className="w-5 h-5 text-[#3B82F6]" />;
      case 'Hazmat':
        return <Biohazard className="w-5 h-5 text-[#A78BFA]" />;
      case 'Rescue':
      default:
        return <LifeBuoy className="w-5 h-5 text-[#2DD4BF]" />;
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
            <Users className="w-5 h-5 text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="FIELD RESPONSE TEAMS ROSTER" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            FIRST RESPONDERS • FIRE BRIGADES • EMS PARAMEDICS • TACTICAL UNITS
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 text-emerald-700 dark:text-[#34D399] font-semibold shadow-sm">
            {teams.filter((t) => t.status === 'AVAILABLE').length} UNITS AVAILABLE
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-teal-700 dark:text-[#2DD4BF] font-semibold shadow-sm">
            {teams.filter((t) => t.status === 'EN_ROUTE' || t.status === 'ON_SCENE').length} ACTIVE ON MISSION
          </div>
        </div>
      </div>

      {/* Simulated Radio Comm Alert Banner */}
      {commMessage && (
        <div className="p-3.5 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/50 text-xs font-mono text-teal-800 dark:text-[#2DD4BF] flex items-center gap-3 animate-pulse shadow-sm">
          <Radio className="w-4 h-4 text-[#2DD4BF] flex-shrink-0" />
          <span>{commMessage}</span>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const isEnRoute = team.status === 'EN_ROUTE';
          const isOnScene = team.status === 'ON_SCENE';

          return (
            <CyberHUDCard
              key={team.id}
              variant={isEnRoute ? 'warning' : isOnScene ? 'info' : 'default'}
              telemetryCode={`#${team.id}`}
              telemetryLabel={team.type.toUpperCase()}
              className="p-5 flex flex-col justify-between"
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
                      <span className="text-[11px] font-mono text-teal-700 dark:text-[#2DD4BF] font-semibold">
                        {team.vehicleName}
                      </span>
                    </div>
                  </div>
                  <StatusBadge type="teamStatus" value={team.status} />
                </div>

                {/* Team Details */}
                <div className="space-y-2 py-3 border-y border-slate-200 dark:border-white/5 font-mono text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Vehicle ID:</span>
                    <span className="text-slate-900 dark:text-white font-medium">{team.vehicleId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Personnel:</span>
                    <span>{team.membersCount} Specialists</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Assigned Station:</span>
                    <span className="text-slate-700 dark:text-slate-300">{team.location.zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">SLA Response ETA:</span>
                    <span className="text-teal-700 dark:text-[#2DD4BF] font-bold">
                      {team.responseTimeEta > 0 ? `${team.responseTimeEta} MIN` : 'ON SITE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Radio Channel:</span>
                    <span className="text-amber-600 dark:text-[#F5A623] font-semibold">{team.contactRadioChannel}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => simulateRadioComm(team.name, team.contactRadioChannel)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Simulate Radio Handshake"
                >
                  <Radio className="w-3.5 h-3.5 text-teal-600 dark:text-[#2DD4BF]" />
                  <span>Radio</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/map')}
                    className="px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-xs font-mono text-teal-700 dark:text-[#2DD4BF] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Track</span>
                  </button>

                  {team.status === 'AVAILABLE' && activeIncident && (
                    <button
                      onClick={() => dispatchTeamToIncident(team.id, activeIncident.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#2DD4BF]/20 hover:bg-[#2DD4BF]/30 border border-[#2DD4BF]/40 text-xs font-mono text-teal-800 dark:text-[#2DD4BF] font-bold transition-colors shadow-sm"
                    >
                      Dispatch
                    </button>
                  )}
                </div>
              </div>
            </CyberHUDCard>
          );
        })}
      </div>
    </div>
  );
};
