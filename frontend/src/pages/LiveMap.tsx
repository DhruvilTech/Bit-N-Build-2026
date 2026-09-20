import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { RoleGate } from '../components/auth/RoleGate';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Compass,
  Flame,
  Shield,
  Hospital,
  Crosshair,
  Activity,
  Search,
  Radio,
  MapPin,
  Truck,
  AlertTriangle,
  Clock,
  Wifi,
  RotateCcw,
  Eye,
  EyeOff,
  Zap,
  Navigation,
  HeartPulse,
  Users,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { incidentsApi } from '../services/api';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-[#FB4A4A] bg-red-500/15 border-red-500/40',
  HIGH: 'text-[#F5A623] bg-amber-500/15 border-amber-500/40',
  MEDIUM: 'text-[#2DD4BF] bg-teal-500/15 border-teal-500/40',
  LOW: 'text-slate-400 bg-slate-500/15 border-slate-500/40',
};

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  EN_ROUTE: 'bg-amber-500 animate-ping',
  ON_SCENE: 'bg-teal-500',
  RETURNING: 'bg-purple-500',
  MAINTENANCE: 'bg-slate-500',
};

export const LiveMap: React.FC = () => {
  const {
    incidents,
    teams,
    hospitals,
    liveResources,
    stations,
    activeIncidentId,
    setActiveIncidentId,
    setFocusLocation,
    stats,
  } = useEmergency();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'incidents' | 'teams' | 'hospitals'>('incidents');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [collapseSidebar, setCollapseSidebar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derived filtered lists
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.zone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFocus = (lat: number, lng: number, id: string) => {
    setFocusLocation({ lat, lng });
    if (id) setActiveIncidentId(id);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;
  const enRouteCount = liveResources.filter((r) => r.status === 'EN_ROUTE').length;
  const onSceneCount = liveResources.filter((r) => r.status === 'ON_SCENE').length;
  const acceptingHospitals = hospitals.filter((h) => !h.divertStatus).length;

  return (
    <div className="space-y-4">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
              <Compass className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF] animate-spin-slow" />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="GEOSPATIAL INTELLIGENCE OPERATIONS" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1.5 ml-10">
            MULTI-LAYER TACTICAL SURVEILLANCE • ROUTE TELEMETRY • PERIMETER RADAR • LIVE GPS
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Status */}
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 dark:text-[#34D399] font-bold">SATELLITE MESH: SYNCHRONIZED</span>
          </div>
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── KPI STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'CRITICAL P1',
            value: criticalCount,
            sub: 'Incidents',
            color: 'text-[#FB4A4A]',
            border: 'border-red-500/30',
            bg: 'bg-red-500/10',
            icon: <Flame className="w-4 h-4 text-[#FB4A4A]" />,
          },
          {
            label: 'UNITS EN ROUTE',
            value: enRouteCount,
            sub: 'Dispatched',
            color: 'text-[#F5A623]',
            border: 'border-amber-500/30',
            bg: 'bg-amber-500/10',
            icon: <Truck className="w-4 h-4 text-[#F5A623]" />,
          },
          {
            label: 'ON SCENE',
            value: onSceneCount,
            sub: 'Active Units',
            color: 'text-[#34D399]',
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/10',
            icon: <Shield className="w-4 h-4 text-[#34D399]" />,
          },
          {
            label: 'TRAUMA CENTERS',
            value: acceptingHospitals,
            sub: 'Accepting',
            color: 'text-[#A78BFA]',
            border: 'border-purple-500/30',
            bg: 'bg-purple-500/10',
            icon: <HeartPulse className="w-4 h-4 text-[#A78BFA]" />,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`p-4 rounded-[14px] ${kpi.bg} border ${kpi.border} backdrop-blur-sm flex items-center gap-3`}
          >
            <div className={`w-9 h-9 rounded-xl border ${kpi.border} flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <div>
              <div className={`text-xl font-display font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                {kpi.label}
              </div>
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── MAIN MAP + TELEMETRY PANEL ─── */}
      <div className={`grid gap-4 ${collapseSidebar ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>

        {/* MAP (full width or 8/12) */}
        <div className={`${collapseSidebar ? '' : 'lg:col-span-8'} space-y-3`}>
          {/* Map component already handles tile layers, layers, zoom */}
          <EmergencyMap
            height="640px"
            selectedIncidentId={activeIncidentId}
            showAllControls={true}
          />

          {/* ─── ACTIVE RESPONSE TELEMETRY TABLE ─── */}
          <div className="rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 backdrop-blur-[18px] overflow-hidden shadow-lg dark:shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Activity className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF] animate-pulse" />
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">Live Unit Telemetry Feed</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-[#34D399] text-[10px] font-bold">
                  {liveResources.length} UNITS
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                LAST SYNC: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 text-[10px] text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-2.5 text-left">Unit ID</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Assigned To</th>
                    <th className="px-4 py-2.5 text-left">ETA</th>
                    <th className="px-4 py-2.5 text-left">GPS Position</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {liveResources.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-[11px]">
                        <Radio className="w-5 h-5 mx-auto mb-2 opacity-30 animate-pulse" />
                        Awaiting live resource telemetry...
                      </td>
                    </tr>
                  ) : (
                    liveResources.slice(0, 8).map((res) => {
                      const lat = res.currentLocation?.latitude ?? res.location?.latitude;
                      const lng = res.currentLocation?.longitude ?? res.location?.longitude;
                      const unitEmoji =
                        res.type?.includes('FIRE') ? '🚒' :
                        res.type?.includes('AMBULANCE') || res.type?.includes('MEDICAL') ? '🚑' :
                        res.type?.includes('POLICE') ? '🚓' : '🚚';

                      return (
                        <tr key={res.resourceId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-teal-700 dark:text-[#2DD4BF]">
                              {unitEmoji} {res.resourceId}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{res.type?.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              res.status === 'ON_SCENE' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' :
                              res.status === 'EN_ROUTE' ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400' :
                              res.status === 'RETURNING' ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-400' :
                              'bg-slate-500/15 border-slate-500/30 text-slate-600 dark:text-slate-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[res.status] || 'bg-slate-400'}`} />
                              {res.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {res.assignedIncidentId ? (
                              <button
                                onClick={() => res.assignedIncidentId && handleFocus(
                                  incidents.find(i => i.id === res.assignedIncidentId)?.location.lat ?? 28.625,
                                  incidents.find(i => i.id === res.assignedIncidentId)?.location.lng ?? 77.21,
                                  res.assignedIncidentId
                                )}
                                className="text-[#2DD4BF] hover:underline font-semibold"
                              >
                                #{res.assignedIncidentId}
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {res.etaMinutes !== undefined ? (
                              <span className="text-amber-600 dark:text-[#F5A623] font-bold">{res.etaMinutes}m</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-teal-600 dark:text-teal-400">
                            {lat && lng ? (
                              <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                            ) : (
                              <span className="text-slate-400">No GPS</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {lat && lng && (
                              <button
                                onClick={() => setFocusLocation({ lat, lng })}
                                className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-[#2DD4BF] hover:bg-teal-500/20 border border-teal-500/30 transition-colors"
                                title="Focus map on this unit"
                              >
                                <Crosshair className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── SIDE PANEL ─── */}
        {!collapseSidebar && (
          <div className="lg:col-span-4 flex flex-col gap-3">

            {/* Search + Filters */}
            <div className="rounded-[14px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 p-3 space-y-2 shadow-lg dark:shadow-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search incidents, units, zones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]/50 transition-colors"
                />
              </div>

              {/* Tab selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl">
                {[
                  { key: 'incidents', label: 'Incidents', count: filteredIncidents.length, icon: <Flame className="w-3 h-3" /> },
                  { key: 'teams', label: 'Units', count: filteredTeams.length, icon: <Shield className="w-3 h-3" /> },
                  { key: 'hospitals', label: 'Hospitals', count: filteredHospitals.length, icon: <Hospital className="w-3 h-3" /> },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                      activeTab === tab.key
                        ? tab.key === 'incidents' ? 'bg-red-500/20 text-red-600 dark:text-[#FB4A4A] border border-red-500/40 shadow-sm'
                        : tab.key === 'teams' ? 'bg-teal-500/20 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/40 shadow-sm'
                        : 'bg-purple-500/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/40 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className="ml-0.5 opacity-70">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Severity filter for incidents */}
              {activeTab === 'incidents' && (
                <div className="flex flex-wrap gap-1">
                  {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                        severityFilter === sev
                          ? sev === 'CRITICAL' ? 'bg-red-600 text-white font-bold' : 'bg-teal-500/20 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/40 font-bold'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List Panel */}
            <div className="flex-1 rounded-[16px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 overflow-hidden shadow-lg dark:shadow-2xl" style={{ maxHeight: '540px' }}>
              <div className="overflow-y-auto h-full p-3 space-y-2">

                {/* ── Incidents List ── */}
                {activeTab === 'incidents' && (
                  filteredIncidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 font-mono text-xs py-12">
                      <Flame className="w-8 h-8 mb-3 opacity-20" />
                      No incidents match the filter
                    </div>
                  ) : (
                    filteredIncidents.map((inc) => {
                      const isSelected = activeIncidentId === inc.id;
                      return (
                        <div
                          key={inc.id}
                          onClick={() => handleFocus(inc.location.lat, inc.location.lng, inc.id)}
                          className={`p-3 rounded-[12px] border cursor-pointer transition-all group ${
                            isSelected
                              ? 'bg-teal-500/10 border-teal-500/50 shadow-[0_0_12px_rgba(45,212,191,0.12)]'
                              : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-[#2DD4BF]">#{inc.id}</span>
                              <span className="text-[10px] font-mono text-slate-500 ml-1.5">{inc.type}</span>
                            </div>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${SEVERITY_COLOR[inc.severity] || SEVERITY_COLOR.LOW}`}>
                              {inc.severity}
                            </span>
                          </div>
                          <p className="text-xs font-sans text-slate-800 dark:text-slate-200 font-medium mb-1 truncate">{inc.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-sans">{inc.location.name}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                            <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">
                              {inc.location.lat.toFixed(4)}, {inc.location.lng.toFixed(4)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-mono text-teal-600 dark:text-[#2DD4BF] group-hover:gap-1.5 transition-all font-bold">
                              <Crosshair className="w-3 h-3" /> Focus
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* ── Units/Teams List ── */}
                {activeTab === 'teams' && (
                  filteredTeams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 font-mono text-xs py-12">
                      <Shield className="w-8 h-8 mb-3 opacity-20" />
                      No units found
                    </div>
                  ) : (
                    filteredTeams.map((t) => {
                      const liveUnit = liveResources.find((r) => r.resourceId === t.id);
                      const statusColor =
                        t.status === 'AVAILABLE' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' :
                        t.status === 'EN_ROUTE' ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400' :
                        t.status === 'ON_SCENE' ? 'bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-[#2DD4BF]' :
                        'bg-slate-500/15 border-slate-500/30 text-slate-600';

                      return (
                        <div
                          key={t.id}
                          onClick={() => t.location && setFocusLocation({ lat: t.location.lat, lng: t.location.lng })}
                          className="p-3 rounded-[12px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/15 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">{t.name}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${statusColor}`}>
                              {t.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans mb-1.5">
                            {t.vehicleName} • <span className="text-teal-600 dark:text-teal-400">{t.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-500 dark:text-slate-400">
                              <Users className="w-3 h-3 inline mr-1" />Crew: {t.membersCount}
                            </span>
                            <span className="text-teal-600 dark:text-[#2DD4BF] font-bold">
                              ETA: {liveUnit?.etaMinutes ?? t.responseTimeEta}m
                            </span>
                          </div>
                          {t.assignedIncidentId && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-white/[0.05] text-[10px] font-mono text-amber-600 dark:text-[#F5A623] font-semibold flex items-center gap-1">
                              <Navigation className="w-3 h-3" /> → #{t.assignedIncidentId}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                )}

                {/* ── Hospitals List ── */}
                {activeTab === 'hospitals' && (
                  filteredHospitals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 font-mono text-xs py-12">
                      <Hospital className="w-8 h-8 mb-3 opacity-20" />
                      No hospitals found
                    </div>
                  ) : (
                    filteredHospitals.map((h) => {
                      const saturationPct = Math.round(((h.totalBeds - h.availableIcuBeds) / Math.max(h.totalBeds, 1)) * 100);
                      return (
                        <div
                          key={h.id}
                          onClick={() => setFocusLocation({ lat: h.lat, lng: h.lng })}
                          className="p-3 rounded-[12px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/15 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate pr-2">{h.name}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${
                              h.divertStatus
                                ? 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-[#FB4A4A]'
                                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-[#34D399]'
                            }`}>
                              {h.divertStatus ? '⚠ DIVERT' : '✓ READY'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-sans">{h.zone}</div>

                          {/* Bed capacity bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-500">ICU BEDS</span>
                              <span className={saturationPct > 85 ? 'text-red-500 font-bold' : 'text-emerald-600 dark:text-[#34D399] font-bold'}>
                                {h.availableIcuBeds} avail / {h.totalBeds} total
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  saturationPct > 85 ? 'bg-red-500' : saturationPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${saturationPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 text-[10px] font-mono">
                            <span className="text-purple-600 dark:text-[#A78BFA] font-semibold">
                              <HeartPulse className="w-3 h-3 inline mr-1" />O₂: {h.oxygenReservesPct}%
                            </span>
                            <span className="flex items-center gap-1 text-teal-600 dark:text-[#2DD4BF] font-bold">
                              <Crosshair className="w-3 h-3" /> Focus
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>

            {/* ─── ZONE INTELLIGENCE CARD ─── */}
            <div className="rounded-[14px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 p-4 shadow-lg dark:shadow-2xl space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900 dark:text-white">
                <Zap className="w-4 h-4 text-amber-500" />
                ZONE INTELLIGENCE
              </div>
              <div className="space-y-2">
                {[
                  { zone: 'Sector 2 — North Industrial', level: 'CRITICAL', incidents: incidents.filter(i => i.location.zone?.includes('Sector 2')).length, color: 'text-red-600 dark:text-[#FB4A4A]', dot: 'bg-[#FB4A4A] animate-pulse' },
                  { zone: 'Central Command Zone', level: 'HIGH', incidents: incidents.filter(i => i.location.zone?.includes('Central')).length, color: 'text-amber-600 dark:text-[#F5A623]', dot: 'bg-[#F5A623]' },
                  { zone: 'Yamuna Riverbank Sector', level: 'MEDIUM', incidents: incidents.filter(i => i.location.zone?.includes('Yamuna') || i.location.zone?.includes('River')).length, color: 'text-teal-600 dark:text-[#2DD4BF]', dot: 'bg-[#2DD4BF]' },
                  { zone: 'South Business District', level: 'LOW', incidents: incidents.filter(i => i.location.zone?.includes('South')).length, color: 'text-slate-500', dot: 'bg-slate-400' },
                ].map((zone) => (
                  <div key={zone.zone} className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${zone.dot}`} />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{zone.zone}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-bold ${zone.color}`}>{zone.incidents}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                        zone.level === 'CRITICAL' ? 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400' :
                        zone.level === 'HIGH' ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400' :
                        zone.level === 'MEDIUM' ? 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400' :
                        'bg-slate-500/15 border-slate-500/30 text-slate-500'
                      }`}>
                        {zone.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Station Readiness */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Station Readiness</div>
                {stations.slice(0, 4).map((s) => (
                  <div key={s.stationId} className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{s.stationId}</span>
                    </div>
                    <span className="text-emerald-600 dark:text-[#34D399] font-bold text-[10px]">
                      {s.type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {stations.length === 0 && (
                  <p className="text-[11px] text-slate-400 font-mono">No stations in database</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
