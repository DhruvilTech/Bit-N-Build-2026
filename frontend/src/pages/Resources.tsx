import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { GlowButton } from '../components/ui/GlowButton';
import {
  Truck,
  Users,
  Building2,
  Cpu,
  Sparkles,
  MapPin,
  CheckCircle2,
  Radio,
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
  const [, setDispatchedTeamId] = useState<string | null>(null);

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
      setDispatchedTeamId(recommendedTeam.id);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              RESOURCE COORDINATION COMMAND
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
            FIELD UNITS • VEHICULAR FLEET • SPECIALIZED EQUIPMENT • HOSPITAL BEDS
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-1 font-mono text-xs shadow-sm">
          {(['all', 'teams', 'equipment', 'hospitals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'bg-cyan-600 dark:bg-cyan-500/20 text-white dark:text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Operations Imagery Banner */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative shadow-sm group">
        <div className="relative aspect-[21/9] sm:aspect-[24/7] w-full overflow-hidden bg-slate-950">
          <img
            src="/assets/emergency_fleet_ops.jpg"
            alt="Emergency Fleet Apparatus Staging Area"
            className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
          <div className="absolute inset-0 p-6 flex flex-col justify-center max-w-xl text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold mb-1">
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
        <div className="p-6 rounded-2xl bg-gradient-to-r from-white via-cyan-50/50 to-white dark:from-[#080B12] dark:via-cyan-950/20 dark:to-[#080B12] border border-cyan-300 dark:border-cyan-500/40 backdrop-blur-xl relative overflow-hidden shadow-sm dark:shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
          <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <span className="text-cyan-700 dark:text-cyan-300 font-bold uppercase tracking-widest">
                  AI SMART RESOURCE RECOMMENDATION
                </span>
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <span className="text-slate-600 dark:text-slate-400">Target: #{activeIncident.id} ({activeIncident.type})</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{recommendedTeam.name}</span>
                  <span className="text-amber-500 text-sm">★★★★★</span>
                </div>
                <StatusBadge type="teamStatus" value={recommendedTeam.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">ESTIMATED ARRIVAL</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">06 MIN (2.4 km)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">MATCHED CAPABILITY</span>
                  <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{recommendedTeam.vehicleName}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">CREW & READINESS</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{recommendedTeam.membersCount} Crew • 98% Ready</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                <strong className="text-cyan-700 dark:text-cyan-400 font-mono">REASONING:</strong> Closest high-capacity unit with immediate foam/chemical suppression capability. Fast-tracked route via Northern Bypass clears estimated transit bottleneck.
              </p>
            </div>

            {/* Recommendation CTA */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
              <GlowButton
                variant="primary"
                size="lg"
                disabled={isScanning || recommendedTeam.status === 'EN_ROUTE'}
                onClick={handleSmartAssign}
                icon={
                  isScanning ? (
                    <Cpu className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white dark:text-slate-950" />
                  )
                }
              >
                {recommendedTeam.status === 'EN_ROUTE'
                  ? 'UNIT ALREADY EN ROUTE'
                  : isScanning
                  ? 'DISPATCHING UNIT...'
                  : 'ASSIGN RECOMMENDED TEAM'}
              </GlowButton>

              <button
                onClick={() => navigate('/map')}
                className="px-4 py-2 rounded-lg bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-cyan-600 dark:text-cyan-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Compass className="w-3.5 h-3.5" />
                View Projected Route &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Resource Catalog Grid */}
      <div className="space-y-6">
        {/* Teams & Vehicles Section */}
        {(activeTab === 'all' || activeTab === 'teams') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Emergency Field Response Units ({teams.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all font-mono text-xs flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{team.name}</span>
                      <StatusBadge type="teamStatus" value={team.status} />
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-3">{team.vehicleName}</div>

                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-white/5">
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-slate-800 dark:text-slate-300 font-medium">{team.location.zone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ETA Benchmark:</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{team.responseTimeEta} mins</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel / Battery:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{team.batteryOrFuelLevel}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-1 flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">{team.contactRadioChannel}</span>
                    {team.status === 'AVAILABLE' && activeIncident && (
                      <button
                        onClick={() => dispatchTeamToIncident(team.id, activeIncident.id)}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
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
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Specialized Tactical Gear & Apparatus ({equipment.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map((eq) => (
                <div
                  key={eq.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-white/20 transition-all font-mono text-xs shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">{eq.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        eq.status === 'Deployed'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold'
                      }`}
                    >
                      {eq.status}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-2">{eq.category}</div>
                  <div className="text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold">{eq.capacityMetric}</div>
                  <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">Assigned: {eq.assignedZone}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Facilities Section */}
        {(activeTab === 'all' || activeTab === 'hospitals') && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Hospital Network & ICU Bed Saturation ({hospitals.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hospitals.map((hosp) => (
                <div
                  key={hosp.id}
                  className={`p-4 rounded-xl border transition-all font-mono text-xs shadow-sm ${
                    hosp.divertStatus
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-500/30'
                      : 'bg-white dark:bg-[#080B12]/80 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{hosp.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        hosp.divertStatus
                          ? 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {hosp.divertStatus ? 'DIVERT' : 'TRAUMA'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{hosp.zone}</div>

                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>Available ICU:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{hosp.availableIcuBeds} Beds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Burn Ward:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{hosp.burnUnitCapacity} Beds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Oxygen Reserve:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{hosp.oxygenReservesPct}%</span>
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
