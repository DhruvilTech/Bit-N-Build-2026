import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { GlowButton } from '../components/ui/GlowButton';
import { EmergencyMap } from '../components/map/EmergencyMap';
import {
  ArrowLeft,
  Flame,
  Cpu,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Radio,
  AlertTriangle,
  Crosshair,
  Wifi,
} from 'lucide-react';

export const IncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    incidents,
    teams,
    escalateIncident,
    resolveIncident,
    dispatchTeamToIncident,
  } = useEmergency();

  const incident = incidents.find((inc) => inc.id === id) || incidents[0];

  const assignedTeams = teams.filter((t) => incident.assignedTeamIds.includes(t.id));
  const availableTeams = teams.filter((t) => t.status === 'AVAILABLE');

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/incidents')}
            className="p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 shadow-sm transition-colors"
            aria-label="Back to incidents"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                INCIDENT #{incident.id}
              </span>
              <StatusBadge type="severity" value={incident.severity} />
              <StatusBadge type="priority" value={incident.priority} />
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
              {incident.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {incident.status !== 'Resolved' && (
            <GlowButton
              variant="secondary"
              size="sm"
              onClick={() => resolveIncident(incident.id)}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            >
              Resolve Incident
            </GlowButton>
          )}

          {incident.severity !== 'CRITICAL' && (
            <GlowButton
              variant="critical"
              size="sm"
              pulse={true}
              onClick={() => escalateIncident(incident.id)}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Escalate to P1
            </GlowButton>
          )}
        </div>
      </div>

      {/* Main Grid: Details (Left 8 cols) & AI/Timeline (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* AI Classification & Risk Matrix Panel */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-purple-500/30 backdrop-blur-xl relative overflow-hidden shadow-sm dark:shadow-xl">
            <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-500/10 blur-2xl" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    AUTONOMOUS AI CLASSIFICATION & TRIAGE
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    DEEP NLP + SENSOR CROSS-CORRELATION ENGINE
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">CONFIDENCE:</span>
                <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-300">
                  {incident.aiConfidence}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed mb-4">
              {incident.aiSummary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">CLASSIFICATION</span>
                <span className="text-slate-900 dark:text-white font-semibold">{incident.type}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">THREAT PRIORITY</span>
                <span className="text-red-600 dark:text-red-400 font-bold">{incident.priority} LEVEL</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">DE-DUPLICATED</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{incident.duplicateReportsCount} Reports</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold">HAZARD RADIUS</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">750 METERS</span>
              </div>
            </div>
          </div>

          {/* Aerial Drone Thermal FLIR Telemetry Box */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 shadow-md relative group">
            <div className="relative aspect-[16/9] w-full">
              <img
                src="/assets/drone_thermal_feed.jpg"
                alt="Search & Rescue Drone FLIR Thermal Camera"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

              {/* HUD Header Bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 text-white font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-cyan-300 font-bold">DRONE 03 // LIVE THERMAL FEED</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-red-400" /> TARGET LOCK
                  </span>
                  <span>ALT: 85m AGL</span>
                </div>
              </div>

              {/* Bottom Telemetry Metrics */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-950/85 backdrop-blur-md border border-white/10 text-white font-mono text-xs">
                <div className="flex items-center gap-4">
                  <span>CORE TEMP: <strong className="text-red-400">+485°C</strong></span>
                  <span className="hidden sm:inline">VAPOR DETECT: <strong className="text-amber-400">HYDROCARBON</strong></span>
                </div>
                <span className="text-emerald-400 font-bold">FLIR TELEMETRY 100%</span>
              </div>
            </div>
          </div>

          {/* Incident Geospatial Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-white font-semibold">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {incident.location.name} ({incident.location.zone})
              </span>
              <span>LAT: {incident.location.lat.toFixed(4)} | LNG: {incident.location.lng.toFixed(4)}</span>
            </div>
            <EmergencyMap height="340px" selectedIncidentId={incident.id} showAllControls={false} />
          </div>

          {/* Aggregated Multi-Source Intelligence Stream */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  MULTI-SOURCE AGGREGATED REPORTS ({incident.reports.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                DE-DUPLICATED & CLUSTERED
              </span>
            </div>

            <div className="space-y-3">
              {incident.reports.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 font-mono text-xs">
                  Automated sensor telemetry incoming...
                </div>
              ) : (
                incident.reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {rep.source}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span>Reliability: {rep.reliability}%</span>
                        <span>•</span>
                        <span>{rep.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                      {rep.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Assigned Resources & Progressive Response Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Assigned Emergency Units Roster */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  ASSIGNED UNITS ({assignedTeams.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {assignedTeams.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 font-mono text-xs">
                  No units currently assigned.
                </div>
              ) : (
                assignedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{team.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {team.vehicleName} • ETA: {team.responseTimeEta}m
                      </div>
                    </div>
                    <StatusBadge type="teamStatus" value={team.status} />
                  </div>
                ))
              )}
            </div>

            {/* Quick Dispatch Additional Unit */}
            {availableTeams.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
                  Dispatch Additional Unit:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {availableTeams.slice(0, 3).map((team) => (
                    <button
                      key={team.id}
                      onClick={() => dispatchTeamToIncident(team.id, incident.id)}
                      className="w-full p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-mono text-xs flex items-center justify-between transition-colors shadow-sm"
                    >
                      <span className="truncate">{team.name}</span>
                      <span className="text-[10px] font-bold">&rarr; Dispatch</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Response Timeline */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                RESPONSE TIMELINE
              </h3>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-white/10 font-mono text-xs">
              {incident.timeline.map((event) => (
                <div key={event.id} className="relative group">
                  <div
                    className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                      event.completed
                        ? 'bg-cyan-500 border-cyan-200 dark:bg-cyan-400 dark:border-cyan-200 shadow-sm dark:shadow-[0_0_8px_#00D9FF]'
                        : 'bg-slate-200 dark:bg-[#080B12] border-slate-400 dark:border-slate-600'
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white">{event.title}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">{event.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                    {event.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
