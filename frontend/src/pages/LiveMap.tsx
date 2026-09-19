import React, { useState } from 'react';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Compass,
  Layers,
  Flame,
  Shield,
  Hospital,
  ArrowRight,
  Crosshair,
  Activity,
} from 'lucide-react';

export const LiveMap: React.FC = () => {
  const { incidents, teams, hospitals, activeIncidentId, setActiveIncidentId } = useEmergency();
  const [activeTab, setActiveTab] = useState<'incidents' | 'teams' | 'hospitals'>('incidents');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-500 dark:text-cyan-400 animate-spin-slow" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              FULL GEOSPATIAL INTELLIGENCE DASHBOARD
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            MULTI-LAYER TACTICAL SURVEILLANCE • ROUTE TELEMETRY • PERIMETER RADAR
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            SATELLITE MESH: SYNCHRONIZED
          </span>
        </div>
      </div>

      {/* Main Map + Side Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Full Interactive Map Container */}
        <div className="lg:col-span-8">
          <EmergencyMap height="680px" selectedIncidentId={activeIncidentId} />
        </div>

        {/* Side Tactical Telemetry & Quick Locator */}
        <div className="lg:col-span-4 h-[680px] flex flex-col rounded-2xl bg-white dark:bg-[#080B12]/90 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl dark:shadow-2xl overflow-hidden">
          {/* Tab Selector */}
          <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-1 bg-slate-50 dark:bg-[#05070D]/80">
            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'incidents'
                  ? 'bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Incidents ({incidents.length})
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'teams'
                  ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Units ({teams.length})
            </button>

            <button
              onClick={() => setActiveTab('hospitals')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'hospitals'
                  ? 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/40 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hospital className="w-3.5 h-3.5" />
              Hospitals ({hospitals.length})
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {activeTab === 'incidents' && (
              <>
                {incidents.map((inc) => {
                  const isSelected = activeIncidentId === inc.id;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setActiveIncidentId(inc.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500/60 shadow-sm dark:shadow-[0_0_15px_rgba(0,217,255,0.15)]'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          #{inc.id} • {inc.type}
                        </span>
                        <StatusBadge type="severity" value={inc.severity} />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mb-2 font-sans">
                        {inc.location.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                        <span>LAT: {inc.location.lat.toFixed(3)} LNG: {inc.location.lng.toFixed(3)}</span>
                        <span className="flex items-center gap-1 font-semibold">
                          <Crosshair className="w-3 h-3" /> Focus
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'teams' && (
              <>
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{t.name}</span>
                      <StatusBadge type="teamStatus" value={t.status} />
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      {t.vehicleName} • Crew: {t.membersCount}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-cyan-600 dark:text-cyan-400">
                      <span>Radio: {t.contactRadioChannel}</span>
                      <span className="font-semibold">ETA: {t.responseTimeEta}m</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'hospitals' && (
              <>
                {hospitals.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{h.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${
                          h.divertStatus
                            ? 'bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-500/40'
                            : 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {h.divertStatus ? 'DIVERT' : 'TRAUMA READY'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1">{h.zone}</div>
                    <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                      <span>ICU Beds: {h.availableIcuBeds} / {h.totalBeds}</span>
                      <span>O2: {h.oxygenReservesPct}%</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
