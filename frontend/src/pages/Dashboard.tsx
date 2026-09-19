import React from 'react';
import { MetricCards } from '../components/dashboard/MetricCards';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { LiveIncidentFeed } from '../components/dashboard/LiveIncidentFeed';
import { useEmergency } from '../context/EmergencyContext';
import { GlowButton } from '../components/ui/GlowButton';
import {
  Sparkles,
  Bot,
  Radio,
  Flame,
  Volume2,
  FileText,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const {
    activeIncident,
    stats,
    setIsSimulatorModalOpen,
  } = useEmergency();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top 6 KPI Metric Cards */}
      <MetricCards />

      {/* Main Command Operations Layout: Map (Left/Center) & Live Incident Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Geospatial Intelligence Map */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white tracking-wide">
                TACTICAL GEOSPATIAL COMMAND
              </h2>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              Full Screen Map &rarr;
            </button>
          </div>

          <EmergencyMap height="540px" selectedIncidentId={activeIncident?.id} />
        </div>

        {/* Live Streaming Incident Feed */}
        <div className="lg:col-span-4 h-[580px]">
          <LiveIncidentFeed />
        </div>
      </div>

      {/* Lower Operations Section: AI Situational Summary + Quick Response Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Autonomous Response AI Summary Card */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-cyan-500/20 backdrop-blur-xl relative overflow-hidden shadow-sm dark:shadow-xl">
          <div className="pointer-events-none absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-cyan-500/5 blur-2xl" />

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  RESPONSE AI // SITUATIONAL SYNTHESIS
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                    REAL-TIME
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  AUTONOMOUS INTELLIGENCE SUMMARY & THREAT MATRIX
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/assistant')}
              className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              Consult AI &rarr;
            </button>
          </div>

          <div className="space-y-3 font-sans text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong className="text-slate-900 dark:text-white font-mono">CURRENT POSTURE:</strong> Tracking{' '}
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">{stats.totalIncidents} active incidents</span>,{' '}
              with <span className="text-red-600 dark:text-red-400 font-bold">{stats.criticalIncidents} rated CRITICAL (P1)</span>. Primary hazard vector centered on{' '}
              <span className="text-slate-900 dark:text-white font-semibold">{activeIncident?.title || 'Industrial Zone'}</span> ({activeIncident?.id || 'ER-2048'}).
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white font-mono">RESOURCE STATUS:</strong>{' '}
              <span className="text-blue-700 dark:text-blue-300">{stats.activeTeams} emergency response teams deployed</span>. Foam suppression and trauma units are active on scene. Secondary concern:{' '}
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                {stats.delayedResponses > 0
                  ? `${stats.delayedResponses} unit experiencing transit delay exceeding 6 minutes.`
                  : 'Transit routes within normal SLA.'}
              </span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <span>CONFIDENCE: <strong className="text-cyan-600 dark:text-cyan-400 font-bold">94.8%</strong></span>
              <span>•</span>
              <span>DE-DUPLICATED: <strong className="text-slate-900 dark:text-white font-bold">18 REPORTS</strong></span>
            </div>
            {activeIncident && (
              <button
                onClick={() => navigate(`/incidents/${activeIncident.id}`)}
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Inspect #{activeIncident.id} Timeline &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Quick Rapid Action Shortcuts */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-sm dark:shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
              <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">RAPID COMMAND ACTIONS</h3>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => setIsSimulatorModalOpen(true)}
                className="w-full p-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-300 font-mono text-xs flex items-center justify-between transition-all group shadow-sm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Flame className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                  Simulate Catastrophic Incident
                </span>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">&rarr;</span>
              </button>

              <button
                onClick={() => navigate('/resources')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-mono text-xs flex items-center justify-between transition-all shadow-sm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Auto-Recommend Units
                </span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={() => navigate('/alerts')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-mono text-xs flex items-center justify-between transition-all shadow-sm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Delayed Response Monitor
                </span>
                <span className="text-xs text-slate-400">&rarr;</span>
              </button>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/5 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>STATION: SEC-04</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">LATENCY: 14ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
