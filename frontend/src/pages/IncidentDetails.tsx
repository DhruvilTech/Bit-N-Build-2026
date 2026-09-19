import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CyberButton } from '../components/ui/CyberButton';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { TextScramble } from '../components/motion/TextScramble';
import {
  ArrowLeft,
  Cpu,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Radio,
  AlertTriangle,
  Crosshair,
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
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
            aria-label="Back to incidents"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-700 dark:text-[#2DD4BF]">
                INCIDENT #{incident.id}
              </span>
              <StatusBadge type="severity" value={incident.severity} />
              <StatusBadge type="priority" value={incident.priority} />
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
              <TextScramble text={incident.title} duration={350} />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {incident.status !== 'Resolved' && (
            <CyberButton
              variant="secondary"
              size="sm"
              onClick={() => resolveIncident(incident.id)}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />}
            >
              Resolve Incident
            </CyberButton>
          )}

          {incident.severity !== 'CRITICAL' && (
            <CyberButton
              variant="critical"
              size="sm"
              pulse={true}
              onClick={() => escalateIncident(incident.id)}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Escalate to P1
            </CyberButton>
          )}
        </div>
      </div>

      {/* Main Grid: Details (Left 8 cols) & AI/Timeline (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* AI Classification & Risk Matrix Panel */}
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-[rgba(124,92,252,0.35)] backdrop-blur-[18px] relative overflow-hidden shadow-md dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[rgba(124,92,252,0.1)] blur-3xl" />

            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/35 flex items-center justify-center text-[#7C5CFC] dark:text-[#A78BFA]">
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
                <span className="text-sm font-mono font-bold text-purple-700 dark:text-[#A78BFA]">
                  {incident.aiConfidence}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed mb-4">
              {incident.aiSummary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">CLASSIFICATION</span>
                <span className="text-slate-900 dark:text-white font-semibold">{incident.type}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">THREAT PRIORITY</span>
                <span className="text-[#FB4A4A] font-bold">{incident.priority} LEVEL</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">DE-DUPLICATED</span>
                <span className="text-teal-700 dark:text-[#2DD4BF] font-semibold">{incident.duplicateReportsCount} Reports</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">HAZARD RADIUS</span>
                <span className="text-amber-600 dark:text-[#F5A623] font-semibold">750 METERS</span>
              </div>
            </div>
          </div>

          {/* Aerial Drone Thermal FLIR Telemetry Box */}
          <div className="rounded-[18px] overflow-hidden border border-white/10 bg-slate-950 shadow-2xl relative group">
            <div className="relative aspect-[16/9] w-full">
              <img
                src="/assets/drone_thermal_feed.jpg"
                alt="Search & Rescue Drone FLIR Thermal Camera"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/40 pointer-events-none" />

              {/* HUD Header Bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-[#2DD4BF]/40 text-white font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FB4A4A] animate-ping" />
                  <span className="text-[#2DD4BF] font-bold">DRONE 03 // LIVE THERMAL FEED</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-[#FB4A4A]" /> TARGET LOCK
                  </span>
                  <span>ALT: 85m AGL</span>
                </div>
              </div>

              {/* Bottom Telemetry Metrics */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 text-white font-mono text-xs">
                <div className="flex items-center gap-4">
                  <span>CORE TEMP: <strong className="text-[#FB4A4A]">+485°C</strong></span>
                  <span className="hidden sm:inline">VAPOR DETECT: <strong className="text-[#F5A623]">HYDROCARBON</strong></span>
                </div>
                <span className="text-[#34D399] font-bold">FLIR TELEMETRY 100%</span>
              </div>
            </div>
          </div>

          {/* Incident Geospatial Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-white font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#FB4A4A]" />
                {incident.location.name} ({incident.location.zone})
              </span>
              <span>LAT: {incident.location.lat.toFixed(4)} | LNG: {incident.location.lng.toFixed(4)}</span>
            </div>
            <EmergencyMap height="340px" selectedIncidentId={incident.id} showAllControls={false} />
          </div>

          {/* Aggregated Multi-Source Intelligence Stream */}
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  MULTI-SOURCE AGGREGATED REPORTS ({incident.reports.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30 px-2 py-0.5 rounded font-semibold">
                DE-DUPLICATED & CLUSTERED
              </span>
            </div>

            <div className="space-y-3">
              {incident.reports.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">
                  Automated sensor telemetry incoming...
                </div>
              ) : (
                incident.reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-teal-700 dark:text-[#2DD4BF]">
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
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  ASSIGNED UNITS ({assignedTeams.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {assignedTeams.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">
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
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
                  Dispatch Additional Unit:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {availableTeams.slice(0, 3).map((team) => (
                    <button
                      key={team.id}
                      onClick={() => dispatchTeamToIncident(team.id, incident.id)}
                      className="w-full p-2 rounded-xl bg-[#2DD4BF]/10 hover:bg-[#2DD4BF]/20 border border-[#2DD4BF]/30 text-teal-700 dark:text-[#2DD4BF] font-mono text-xs flex items-center justify-between transition-colors shadow-sm"
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
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
              <Clock className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                RESPONSE TIMELINE
              </h3>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-300 dark:before:bg-white/10 font-mono text-xs">
              {incident.timeline.map((event) => (
                <div key={event.id} className="relative group">
                  <div
                    className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                      event.completed
                        ? 'bg-[#2DD4BF] border-[#5EEAD4] shadow-[0_0_8px_#2DD4BF]'
                        : 'bg-slate-100 dark:bg-[#0B0E13] border-slate-400 dark:border-slate-600'
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white">{event.title}</span>
                    <span className="text-teal-700 dark:text-[#2DD4BF] font-bold">{event.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
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
