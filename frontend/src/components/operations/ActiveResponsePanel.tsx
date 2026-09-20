import React, { useState } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import {
  Navigation,
  RotateCcw,
  Crosshair,
  Radio,
  Zap,
  CheckCircle2,
  Clock,
  Shield,
  Flame,
  Truck,
  Building2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { LiveResource } from '../../types';

interface ActiveResponsePanelProps {
  className?: string;
}

export const ActiveResponsePanel: React.FC<ActiveResponsePanelProps> = ({ className = '' }) => {
  const {
    liveResources,
    stations,
    activeRoutes,
    activeIncident,
    isSimulationMode,
    toggleSimulationMode,
    setFocusLocation,
    returnResourceToStation,
    dispatchIncidentSimulation,
  } = useEmergency();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  // Filtered resources
  const filteredResources = liveResources.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') {
      return ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RETURNING'].includes(r.status);
    }
    return r.status === statusFilter;
  });

  const getStationName = (stationId?: string) => {
    if (!stationId) return 'Mobile Outpost';
    const found = stations.find((s) => s.stationId === stationId);
    return found ? found.name : stationId;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'FIRE_VEHICLE':
      case 'FIRE_TEAM':
        return <Flame className="w-4 h-4 text-red-500" />;
      case 'AMBULANCE':
      case 'MEDICAL_EQUIPMENT':
        return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'POLICE_VEHICLE':
      case 'POLICE_TEAM':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'RESCUE_EQUIPMENT':
      case 'RESCUE_TEAM':
        return <Truck className="w-4 h-4 text-amber-500" />;
      default:
        return <Truck className="w-4 h-4 text-teal-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EN_ROUTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <Radio className="w-2.5 h-2.5" /> EN ROUTE
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-2.5 h-2.5" /> ON SCENE
          </span>
        );
      case 'RETURNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <RotateCcw className="w-2.5 h-2.5" /> RETURNING
          </span>
        );
      case 'DISPATCHED':
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <Clock className="w-2.5 h-2.5" /> DISPATCHED
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            AVAILABLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-500/15 text-slate-500 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const handleFocus = (res: LiveResource) => {
    const lat = res.currentLocation?.latitude || res.location?.latitude;
    const lng = res.currentLocation?.longitude || res.location?.longitude;
    if (lat !== undefined && lng !== undefined) {
      setFocusLocation({ lat, lng });
    }
  };

  const handleAutoDispatch = async () => {
    if (!activeIncident?.id) return;
    setIsDispatching(true);
    try {
      await dispatchIncidentSimulation(activeIncident.id);
    } finally {
      setIsDispatching(false);
    }
  };

  // Metrics
  const enRouteCount = liveResources.filter((r) => r.status === 'EN_ROUTE').length;
  const onSceneCount = liveResources.filter((r) => r.status === 'ON_SCENE').length;
  const returningCount = liveResources.filter((r) => r.status === 'RETURNING').length;

  return (
    <div
      className={`rounded-2xl border border-slate-300 dark:border-white/10 bg-white/95 dark:bg-[#0B0E13]/90 backdrop-blur-md shadow-xl overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-[#2DD4BF]">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              ACTIVE GPS TRACKING & DISPATCH
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/10 text-teal-600 dark:text-[#2DD4BF] border border-teal-500/20">
                {liveResources.length} Units
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live telemetry, real-time routing, and vehicle movement
            </p>
          </div>
        </div>

        {/* Mode Toggle & Auto Dispatch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSimulationMode()}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
              isSimulationMode
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
            }`}
            title="Toggle between Real Operator Mode and Autonomous Simulation Mode"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulationMode ? 'text-amber-500 fill-amber-500' : ''}`} />
            {isSimulationMode ? 'SIMULATION MODE' : 'REAL MODE'}
          </button>

          {isSimulationMode && activeIncident && (
            <button
              onClick={handleAutoDispatch}
              disabled={isDispatching}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5" />
              {isDispatching ? 'Dispatching...' : 'Auto-Dispatch'}
            </button>
          )}
        </div>
      </div>

      {/* Metric Quick Bar */}
      <div className="grid grid-cols-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 text-center text-xs font-mono py-2">
        <div className="border-r border-slate-200 dark:border-white/10">
          <div className="text-[10px] text-slate-400">EN ROUTE</div>
          <div className="text-sm font-bold text-amber-500">{enRouteCount}</div>
        </div>
        <div className="border-r border-slate-200 dark:border-white/10">
          <div className="text-[10px] text-slate-400">ON SCENE</div>
          <div className="text-sm font-bold text-emerald-500">{onSceneCount}</div>
        </div>
        <div className="border-r border-slate-200 dark:border-white/10">
          <div className="text-[10px] text-slate-400">RETURNING</div>
          <div className="text-sm font-bold text-purple-400">{returningCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">STATIONS</div>
          <div className="text-sm font-bold text-teal-500">{stations.length}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
        {['ALL', 'ACTIVE', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'AVAILABLE'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === filter
                ? 'bg-teal-500/20 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/40 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Unit Cards List */}
      <div className="divide-y divide-slate-200 dark:divide-white/10 max-h-[420px] overflow-y-auto">
        {filteredResources.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
            No resources match the selected filter.
          </div>
        ) : (
          filteredResources.map((res) => {
            const hasRoute = Boolean(activeRoutes[res.resourceId]);
            const isEnRoute = res.status === 'EN_ROUTE';
            const isOnScene = res.status === 'ON_SCENE';
            const isReturning = res.status === 'RETURNING';

            return (
              <div
                key={res.resourceId}
                className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Unit Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mt-0.5">
                    {getResourceIcon(res.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {res.resourceId}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {res.name}
                      </span>
                      {getStatusBadge(res.status)}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {getStationName(res.stationId)}
                      </span>

                      {/* Dynamic ETA and Distance */}
                      {(isEnRoute || isReturning) && (
                        <span className="text-teal-600 dark:text-[#2DD4BF] font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {res.etaMinutes !== undefined
                            ? `${res.etaMinutes} min ETA`
                            : 'Calculating ETA...'}
                          {res.distanceKm !== undefined && ` (${res.distanceKm.toFixed(1)} km)`}
                        </span>
                      )}

                      {isOnScene && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          Arrived on scene
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleFocus(res)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                    title="Center map on unit"
                  >
                    <Crosshair className="w-3 h-3 text-teal-600 dark:text-[#2DD4BF]" />
                    Focus
                  </button>

                  {isOnScene && (
                    <button
                      onClick={() => returnResourceToStation(res.resourceId)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center gap-1 transition-all"
                      title="Command unit to return to home station"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Return Base
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
