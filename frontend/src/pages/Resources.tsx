import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberHUDCard } from '../components/ui/CyberHUDCard';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Truck,
  Users,
  Building2,
  Cpu,
  Sparkles,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Resources: React.FC = () => {
  const {
    teams,
    equipment,
    hospitals,
    activeIncident,
    dispatchTeamToIncident,
  } = useEmergency();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'teams' | 'equipment' | 'hospitals'>('all');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Recommended candidate for active incident
  const recommendedTeam =
    teams.find((t) => t.status === 'AVAILABLE' && (t.type === 'Fire' || t.type === 'Hazmat')) ||
    teams.find((t) => t.status === 'AVAILABLE') ||
    teams[0];

  const handleSmartAssign = () => {
    if (!activeIncident || !recommendedTeam) return;
    setIsScanning(true);
    setTimeout(() => {
      dispatchTeamToIncident(recommendedTeam.id, activeIncident.id);
      setIsScanning(false);
    }, 750);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="RESOURCE COORDINATION COMMAND" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            FIELD UNITS • VEHICULAR FLEET • SPECIALIZED EQUIPMENT • HOSPITAL BEDS
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-slate-100 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-xl p-1 font-mono text-xs shadow-sm">
          {(['all', 'teams', 'equipment', 'hospitals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'bg-[#2DD4BF]/20 text-teal-700 dark:text-[#2DD4BF] font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Operations Imagery Banner */}
      <div className="rounded-[18px] overflow-hidden border border-white/10 relative shadow-2xl group">
        <div className="relative aspect-[21/9] sm:aspect-[24/7] w-full overflow-hidden bg-slate-950">
          <img
            src="/assets/emergency_fleet_ops.jpg"
            alt="Emergency Fleet Apparatus Staging Area"
            className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
          <div className="absolute inset-0 p-6 flex flex-col justify-center max-w-xl text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#2DD4BF] font-bold mb-1">
              FIELD APPARATUS STAGING // REGIONAL SECTOR 4
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold tracking-tight mb-2">
              Rapid Deployment Fleet Matrix
            </h2>
            <p className="text-xs text-slate-300 font-sans leading-relaxed hidden sm:block">
              Continuous GPS tracking, fuel telemetry, and specialized capability verification for instant mutual-aid dispatch.
            </p>
          </div>
        </div>
      </div>

      {/* SMART RESOURCE RECOMMENDATION PANEL */}
      {activeIncident && (
        <CyberHUDCard
          variant="default"
          telemetryCode="AI-RECOMMENDER"
          telemetryLabel={`TARGET: #${activeIncident.id} (${activeIncident.type})`}
          className="p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Sparkles className="w-4 h-4 text-[#2DD4BF] animate-pulse" />
                <span className="text-teal-700 dark:text-[#2DD4BF] font-bold uppercase tracking-widest">
                  AI SMART RESOURCE RECOMMENDATION
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{recommendedTeam.name}</span>
                  <span className="text-amber-400 text-sm">★★★★★</span>
                </div>
                <StatusBadge type="teamStatus" value={recommendedTeam.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">ESTIMATED ARRIVAL</span>
                  <span className="text-emerald-700 dark:text-[#34D399] font-bold text-sm">06 MIN (2.4 km)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">MATCHED CAPABILITY</span>
                  <span className="text-teal-700 dark:text-[#2DD4BF] font-semibold">{recommendedTeam.vehicleName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">CREW & READINESS</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{recommendedTeam.membersCount} Crew • 98% Ready</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                <strong className="text-teal-700 dark:text-[#2DD4BF] font-mono">REASONING:</strong> Closest high-capacity unit with immediate foam/chemical suppression capability. Fast-tracked route via Northern Bypass clears estimated transit bottleneck.
              </p>
            </div>

            {/* Recommendation CTA */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
              <CyberButton
                variant="primary"
                size="lg"
                disabled={isScanning || recommendedTeam.status === 'EN_ROUTE'}
                onClick={handleSmartAssign}
                icon={
                  isScanning ? (
                    <Cpu className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )
                }
              >
                {recommendedTeam.status === 'EN_ROUTE'
                  ? 'UNIT ALREADY EN ROUTE'
                  : isScanning
                  ? 'DISPATCHING UNIT...'
                  : 'ASSIGN RECOMMENDED TEAM'}
              </CyberButton>

              <button
                onClick={() => navigate('/map')}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono text-teal-700 dark:text-[#2DD4BF] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Compass className="w-3.5 h-3.5" />
                View Projected Route &rarr;
              </button>
            </div>
          </div>
        </CyberHUDCard>
      )}

      {/* Main Resource Catalog Grid */}
      <div className="space-y-6">
        {/* Teams & Vehicles Section */}
        {(activeTab === 'all' || activeTab === 'teams') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Users className="w-4 h-4 text-[#2DD4BF]" />
              Emergency Field Response Units ({teams.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-4 rounded-xl bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 hover:border-[#2DD4BF]/40 transition-all font-mono text-xs flex flex-col justify-between shadow-md dark:shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{team.name}</span>
                      <StatusBadge type="teamStatus" value={team.status} />
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-3">{team.vehicleName}</div>

                    <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 pb-3 border-b border-slate-200 dark:border-white/5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Location:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{team.location.zone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">ETA Benchmark:</span>
                        <span className="text-teal-700 dark:text-[#2DD4BF] font-semibold">{team.responseTimeEta} mins</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Fuel / Battery:</span>
                        <span className="text-emerald-700 dark:text-[#34D399] font-semibold">{team.batteryOrFuelLevel}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-1 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px]">{team.contactRadioChannel}</span>
                    {team.status === 'AVAILABLE' && activeIncident && (
                      <button
                        onClick={() => dispatchTeamToIncident(team.id, activeIncident.id)}
                        className="text-teal-700 dark:text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
                      >
                        Dispatch &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specialized Equipment Section */}
        {(activeTab === 'all' || activeTab === 'equipment') && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Cpu className="w-4 h-4 text-[#A78BFA]" />
              Specialized Tactical Gear & Apparatus ({equipment.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map((eq) => (
                <div
                  key={eq.id}
                  className="p-4 rounded-xl bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all font-mono text-xs shadow-md dark:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">{eq.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        eq.status === 'Deployed'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-[#F5A623] border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-[#34D399] border-emerald-500/30'
                      }`}
                    >
                      {eq.status}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-2">{eq.category}</div>
                  <div className="text-teal-700 dark:text-[#2DD4BF] text-[11px] font-semibold">{eq.capacityMetric}</div>
                  <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Assigned: {eq.assignedZone}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Facilities Section */}
        {(activeTab === 'all' || activeTab === 'hospitals') && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Building2 className="w-4 h-4 text-[#34D399]" />
              Hospital Network & ICU Bed Saturation ({hospitals.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hospitals.map((hosp) => (
                <div
                  key={hosp.id}
                  className={`p-4 rounded-xl border transition-all font-mono text-xs shadow-md dark:shadow-lg ${
                    hosp.divertStatus
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-500/30'
                      : 'bg-white dark:bg-[rgba(11,14,19,0.78)] border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{hosp.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        hosp.divertStatus
                          ? 'bg-red-500/20 text-[#FB4A4A] border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-[#34D399] border-emerald-500/40'
                      }`}
                    >
                      {hosp.divertStatus ? 'DIVERT' : 'TRAUMA'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{hosp.zone}</div>

                  <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Available ICU:</span>
                      <span className="font-bold text-teal-700 dark:text-[#2DD4BF]">{hosp.availableIcuBeds} Beds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Burn Ward:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{hosp.burnUnitCapacity} Beds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Oxygen Reserve:</span>
                      <span className="text-emerald-700 dark:text-[#34D399] font-semibold">{hosp.oxygenReservesPct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
