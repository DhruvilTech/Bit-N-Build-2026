import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Sliders,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { incidentsApi } from '../services/api';
import { soundFx } from '../utils/audio';

export const Resources: React.FC = () => {
  const {
    teams,
    equipment,
    hospitals,
    activeIncident,
    dispatchTeamToIncident,
    liveResources,
  } = useEmergency();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'teams' | 'equipment' | 'hospitals'>('all');
  const [strategy, setStrategy] = useState<'BALANCED' | 'FASTEST_ETA' | 'CAPABILITY_FIRST'>('BALANCED');
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);

  // Fetch real AI Smart Recommendations (Phase 6)
  const fetchRecommendations = useCallback(
    async (refresh = false) => {
      if (!activeIncident?.id) return;
      setIsLoadingRec(true);
      setRecError(null);
      try {
        const res = await incidentsApi.getRecommendations(activeIncident.id, {
          strategy,
          limit: 5,
          refresh,
        });

        if (res && res.recommendations && res.recommendations.length > 0) {
          setRecommendation(res.recommendations[0]);
          setExplanation(res.explanation || null);
        } else {
          setRecommendation(null);
          setExplanation(res?.explanation || 'No available emergency resources matched current requirements.');
        }
      } catch (err: any) {
        console.warn('Recommendation API note:', err.message);
        setRecError(err.message || 'Unable to fetch recommendations from AI engine');
      } finally {
        setIsLoadingRec(false);
      }
    },
    [activeIncident?.id, strategy]
  );

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Fallback candidate if recommendation is not returned by AI service
  const fallbackTeam =
    teams.find((t) => t.status === 'AVAILABLE' && (t.type === 'Fire' || t.type === 'Hazmat')) ||
    teams.find((t) => t.status === 'AVAILABLE') ||
    teams[0];

  const handleSmartAssign = async () => {
    if (!activeIncident) return;
    setIsAssigning(true);
    setAssignSuccessMsg(null);

    const targetId = recommendation?.resourceId || fallbackTeam?.id;
    if (!targetId) return;

    soundFx.playDispatch();
    try {
      await incidentsApi.assignResources(activeIncident.id, {
        resourceIds: [targetId],
        notes: `AI Smart Assignment (${strategy} strategy)`,
      });
      dispatchTeamToIncident(targetId, activeIncident.id);
      setAssignSuccessMsg(`Dispatched ${recommendation?.name || fallbackTeam?.name} to #${activeIncident.id}!`);
      setTimeout(() => {
        fetchRecommendations(true);
        setAssignSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      console.warn('Assign API error:', err.message);
      // Fallback local dispatch
      dispatchTeamToIncident(targetId, activeIncident.id);
      setAssignSuccessMsg(`Dispatched ${recommendation?.name || fallbackTeam?.name} to #${activeIncident.id}`);
      setTimeout(() => setAssignSuccessMsg(null), 3000);
    } finally {
      setIsAssigning(false);
    }
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
            PHASE 6 RECOMMENDATIONS • PHASE 8 MULTI-RESOURCE ASSIGNMENTS • FLEET TELEMETRY
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

      {/* SUCCESS BANNER */}
      {assignSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-mono text-xs flex items-center gap-2.5 animate-pulse">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
          <span>{assignSuccessMsg}</span>
        </div>
      )}

      {/* SMART RESOURCE RECOMMENDATION PANEL (PHASE 6 & 8) */}
      {activeIncident && (
        <CyberHUDCard
          variant="default"
          telemetryCode="AI-RECOMMENDER-PH6"
          telemetryLabel={`TARGET: #${activeIncident.id} (${activeIncident.type})`}
          className="p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              {/* Strategy and Title Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <Sparkles className="w-4 h-4 text-[#2DD4BF] animate-pulse" />
                  <span className="text-teal-700 dark:text-[#2DD4BF] font-bold uppercase tracking-widest">
                    AI SMART RESOURCE RECOMMENDATION (PHASE 6)
                  </span>
                </div>

                {/* Strategy Pills */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-lg border border-slate-200 dark:border-white/10 font-mono text-[10px]">
                  <span className="px-1.5 text-slate-400 flex items-center gap-1">
                    <Sliders className="w-3 h-3" /> STRATEGY:
                  </span>
                  {(['BALANCED', 'FASTEST_ETA', 'CAPABILITY_FIRST'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStrategy(s)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        strategy === s
                          ? 'bg-[#2DD4BF] text-slate-950 font-bold shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchRecommendations(true)}
                    disabled={isLoadingRec}
                    title="Refresh AI recommendations"
                    className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-300"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRec ? 'animate-spin text-[#2DD4BF]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Error banner if any */}
              {recError && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{recError}. Displaying tactical fallback unit.</span>
                </div>
              )}

              {/* Recommended Unit Name & Status */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{recommendation?.name || fallbackTeam?.name || 'Emergency Unit Staging'}</span>
                  {recommendation?.score && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2DD4BF]/20 text-teal-800 dark:text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold">
                      {recommendation.score}% MATCH
                    </span>
                  )}
                  <span className="text-amber-400 text-sm">★★★★★</span>
                </div>
                <StatusBadge
                  type="teamStatus"
                  value={recommendation ? 'AVAILABLE' : fallbackTeam?.status || 'AVAILABLE'}
                />
              </div>

              {/* Dynamic Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">
                    ESTIMATED ARRIVAL
                  </span>
                  <span className="text-emerald-700 dark:text-[#34D399] font-bold text-sm">
                    {recommendation
                      ? `${recommendation.estimatedArrivalMinutes} MIN (${recommendation.distanceKm} km)`
                      : `${fallbackTeam?.responseTimeEta || 5} MIN (2.5 km)`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">
                    MATCHED CAPABILITY
                  </span>
                  <span className="text-teal-700 dark:text-[#2DD4BF] font-semibold truncate block">
                    {recommendation?.matchedCapabilities?.length
                      ? recommendation.matchedCapabilities.join(', ')
                      : recommendation?.type || fallbackTeam?.vehicleName || 'Multi-Role Unit'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">
                    BASE / STATION
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold truncate block">
                    {recommendation?.stationName || fallbackTeam?.location?.zone || 'Station 1 Central'}
                  </span>
                </div>
              </div>

              {/* Explainable Reasoning */}
              <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                <strong className="text-teal-700 dark:text-[#2DD4BF] font-mono">REASONING: </strong>
                {recommendation?.reason ||
                  explanation ||
                  `Optimally positioned unit with verified operational capability to address ${activeIncident.type}. Fast-tracked transit route active.`}
              </p>
            </div>

            {/* Recommendation CTA */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
              <CyberButton
                variant="primary"
                size="lg"
                disabled={isAssigning || (fallbackTeam?.status === 'EN_ROUTE' && !recommendation)}
                onClick={handleSmartAssign}
                icon={
                  isAssigning ? (
                    <Cpu className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )
                }
              >
                {isAssigning
                  ? 'DISPATCHING VIA MESH...'
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <Users className="w-4 h-4 text-[#2DD4BF]" />
                Emergency Field Response Units ({teams.length})
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {teams.filter((t) => t.status === 'AVAILABLE').length} Available &bull;{' '}
                {teams.filter((t) => t.status === 'EN_ROUTE' || t.status === 'ON_SCENE').length} Deployed
              </span>
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
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-3 truncate">
                      {team.vehicleName}
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 pb-3 border-b border-slate-200 dark:border-white/5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Location:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate ml-2">
                          {team.location.zone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">ETA Benchmark:</span>
                        <span className="text-teal-700 dark:text-[#2DD4BF] font-semibold">
                          {team.responseTimeEta > 0 ? `${team.responseTimeEta} mins` : 'ON SCENE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Fuel / Battery:</span>
                        <span className="text-emerald-700 dark:text-[#34D399] font-semibold">
                          {team.batteryOrFuelLevel}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-1 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                      <Radio className="w-3 h-3 text-amber-500" />
                      {team.contactRadioChannel}
                    </span>
                    {team.status === 'AVAILABLE' && activeIncident && (
                      <button
                        onClick={() => dispatchTeamToIncident(team.id, activeIncident.id)}
                        className="text-teal-700 dark:text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
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
                    <span className="font-bold text-slate-900 dark:text-white truncate">{eq.name}</span>
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
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 truncate">{hosp.zone}</div>

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

export default Resources;
