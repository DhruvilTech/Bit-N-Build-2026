import React, { useState } from 'react';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { ActiveResponsePanel } from '../components/operations/ActiveResponsePanel';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Compass,
  Flame,
  Shield,
  Hospital,
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
            <Compass className="w-5 h-5 text-[#2DD4BF] animate-spin-slow" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="FULL GEOSPATIAL INTELLIGENCE DASHBOARD" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            MULTI-LAYER TACTICAL SURVEILLANCE • ROUTE TELEMETRY • PERIMETER RADAR
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-teal-700 dark:text-[#2DD4BF] font-semibold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            SATELLITE MESH: SYNCHRONIZED
          </span>
        </div>
      </div>

      {/* Main Map + Side Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Full Interactive Map Container & GPS Tracking Panel */}
        <div className="lg:col-span-8 space-y-6">
          <EmergencyMap height="560px" selectedIncidentId={activeIncidentId} />
          <ActiveResponsePanel />
        </div>

        {/* Side Tactical Telemetry & Quick Locator */}
        <div className="lg:col-span-4 h-[680px] flex flex-col rounded-[20px] bg-white/95 dark:bg-[rgba(11,14,19,0.85)] border border-slate-300 dark:border-white/10 backdrop-blur-[18px] shadow-lg dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Tab Selector */}
          <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-1 bg-slate-100/90 dark:bg-[#05070D]/80">
            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'incidents'
                  ? 'bg-red-500/20 text-[#FB4A4A] border border-red-500/40 font-bold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Incidents ({incidents.length})
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'teams'
                  ? 'bg-[#2DD4BF]/20 text-teal-700 dark:text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Units ({teams.length})
            </button>

            <button
              onClick={() => setActiveTab('hospitals')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'hospitals'
                  ? 'bg-[#7C5CFC]/20 text-purple-700 dark:text-[#A78BFA] border border-[#7C5CFC]/40 font-bold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                          ? 'bg-[#2DD4BF]/10 border-[#2DD4BF]/60 shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/15'
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
                      <div className="flex items-center justify-between text-[10px] font-mono text-teal-600 dark:text-[#2DD4BF]">
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
                    <div className="flex items-center justify-between text-[10px] text-teal-600 dark:text-[#2DD4BF]">
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
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                          h.divertStatus
                            ? 'bg-red-500/20 text-[#FB4A4A] border-red-500/40'
                            : 'bg-emerald-500/20 text-[#34D399] border-emerald-500/40'
                        }`}
                      >
                        {h.divertStatus ? 'DIVERT' : 'TRAUMA READY'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1">{h.zone}</div>
                    <div className="flex items-center justify-between text-[10px] text-purple-600 dark:text-[#A78BFA] font-semibold">
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
