import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CyberHUDCard } from '../components/ui/CyberHUDCard';
import { CyberButton } from '../components/ui/CyberButton';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Search,
  ShieldAlert,
  ArrowRight,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Radio,
  Thermometer,
  User,
  PhoneCall,
  Flame,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Incidents: React.FC = () => {
  const {
    incidents,
    setActiveIncidentId,
    escalateIncident,
    resolveIncident,
    updateIncidentStatus,
    setIsCreateIncidentModalOpen,
  } = useEmergency();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;

    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;

    const matchesSource =
      sourceFilter === 'ALL' ||
      (inc.source && inc.source.toUpperCase() === sourceFilter.toUpperCase());

    return matchesSearch && matchesSeverity && matchesStatus && matchesSource;
  });

  const getSourceBadge = (source?: string) => {
    const s = source?.toUpperCase() || 'EMERGENCY_CALL';
    if (s === 'SENSOR') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-[#A78BFA]">
          <Thermometer className="w-3 h-3" /> SENSOR
        </span>
      );
    }
    if (s === 'CITIZEN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-[#60A5FA]">
          <User className="w-3 h-3" /> CITIZEN
        </span>
      );
    }
    if (s === 'FIELD_TEAM') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-[#F5A623]">
          <Radio className="w-3 h-3" /> FIELD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-[#2DD4BF]">
        <PhoneCall className="w-3 h-3" /> 911 CALL
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-teal-600 dark:text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="LIVE INCIDENT OPERATIONS" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 font-medium">
            MULTI-SOURCE INGESTION • GEOSPATIAL RADAR • PROGRESSIVE TIMELINE & ESCALATION CONTROL
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CyberButton
            variant="primary"
            size="sm"
            onClick={() => setIsCreateIncidentModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            REPORT INCIDENT
          </CyberButton>

          <div className="flex items-center bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                viewMode === 'table'
                  ? 'bg-teal-500/20 text-teal-700 dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                viewMode === 'grid'
                  ? 'bg-teal-500/20 text-teal-700 dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="p-4 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 backdrop-blur-[18px] flex flex-col md:flex-row items-center gap-3 justify-between shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search ID, title, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]/50"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                severityFilter === sev
                  ? sev === 'CRITICAL'
                    ? 'bg-red-600 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'bg-teal-500/20 text-teal-700 dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF] border border-teal-500/40 dark:border-[#2DD4BF]/40 font-bold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Source Dropdown Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-300 focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]/50 w-full md:w-auto font-medium"
        >
          <option value="ALL">All Sources</option>
          <option value="CITIZEN">Citizen Report</option>
          <option value="SENSOR">IoT Sensor Grid</option>
          <option value="FIELD_TEAM">Field Team</option>
          <option value="OPERATOR">Operator Desk</option>
          <option value="EMERGENCY_CALL">Emergency 911 Call</option>
        </select>

        {/* Status Dropdown Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-300 focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]/50 w-full md:w-auto font-medium"
        >
          <option value="ALL">All Statuses</option>
          <option value="New">New</option>
          <option value="Analyzing">Analyzing</option>
          <option value="Assigned">Assigned</option>
          <option value="Responding">Responding</option>
          <option value="Resolved">Resolved</option>
          <option value="Escalated">Escalated</option>
        </select>
      </div>

      {/* Main Content: Table or Grid View */}
      {viewMode === 'table' ? (
        <div className="rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 backdrop-blur-[18px] overflow-hidden shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-widest font-semibold">
                  <th className="p-4">Incident ID</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Type & Details</th>
                  <th className="p-4">AI Triage</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredIncidents.map((incident) => {
                  const isCritical = incident.severity === 'CRITICAL';
                  const isHigh = incident.severity === 'HIGH';

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => {
                        setActiveIncidentId(incident.id);
                        navigate(`/incidents/${incident.id}`);
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                        isCritical
                          ? 'border-l-2 border-l-red-600 dark:border-l-[#FB4A4A]'
                          : isHigh
                          ? 'border-l-2 border-l-amber-500 dark:border-l-[#F5A623]'
                          : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-bold text-teal-700 dark:text-[#2DD4BF]">#{incident.id}</span>
                        <div className="text-[10px] text-slate-500">{incident.createdAt}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {getSourceBadge(incident.source)}
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900 dark:text-white font-semibold">{incident.type}</div>
                        <div className="text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-xs">
                          {incident.title}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {incident.aiAnalysis?.status === 'PROCESSING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800/60">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-500" />
                            <span>ANALYZING</span>
                          </span>
                        ) : incident.aiAnalysis?.status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60" title={incident.aiAnalysis.error || 'Failed'}>
                            <span>FAILED</span>
                          </span>
                        ) : incident.aiAnalysis?.incidentType ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                {incident.aiAnalysis.incidentType}
                              </span>
                              {incident.aiAnalysis.suggestedCorrection && (
                                <span className="text-[9px] px-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold" title="AI corrected reporting source">
                                  CORR
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-bold text-purple-600 dark:text-[#A78BFA]">
                                {Math.round((incident.aiAnalysis.confidence ?? (incident.aiConfidence / 100)) * 100)}%
                              </span>
                              {incident.aiAnalysis.isLowConfidence && (
                                <span className="text-amber-500 font-bold text-[9px]">⚠️ LOW</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-purple-600 dark:text-[#A78BFA] font-bold">
                            {incident.aiConfidence ? `${incident.aiConfidence}%` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800 dark:text-slate-300 font-medium truncate max-w-[180px]">
                          {incident.location.zone}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {incident.location.name}
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge type="severity" value={incident.severity} />
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-white">{incident.priority}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <StatusBadge type="status" value={incident.status} />
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {incident.status !== 'Resolved' && (
                            <button
                              onClick={() => resolveIncident(incident.id)}
                              title="Resolve Incident"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-[#34D399] hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {incident.severity !== 'CRITICAL' && (
                            <button
                              onClick={() => escalateIncident(incident.id)}
                              title="Escalate to P1"
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-[#FB4A4A] hover:bg-red-500/20 border border-red-500/30 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveIncidentId(incident.id);
                              navigate(`/incidents/${incident.id}`);
                            }}
                            className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-[#2DD4BF] hover:bg-teal-500/20 border border-teal-500/30 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncidents.map((incident) => (
            <CyberHUDCard
              key={incident.id}
              variant={
                incident.severity === 'CRITICAL'
                  ? 'critical'
                  : incident.severity === 'HIGH'
                  ? 'warning'
                  : 'default'
              }
              telemetryCode={`#${incident.id}`}
              telemetryLabel={incident.location.zone}
              onClick={() => {
                setActiveIncidentId(incident.id);
                navigate(`/incidents/${incident.id}`);
              }}
              className="p-5 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{incident.title}</h3>
                  <StatusBadge type="severity" value={incident.severity} />
                </div>

                <div className="mb-2">
                  {getSourceBadge(incident.source)}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4 font-sans font-medium">
                  {incident.aiSummary}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-white/5 mb-3">
                  <span>Priority: <strong className="text-slate-900 dark:text-white font-bold">{incident.priority}</strong></span>
                  <StatusBadge type="status" value={incident.status} />
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-700 dark:text-[#A78BFA] font-semibold flex items-center gap-1">
                    AI: {incident.aiAnalysis?.incidentType || incident.type} ({incident.aiAnalysis?.confidence !== undefined ? Math.round(incident.aiAnalysis.confidence * 100) : incident.aiConfidence}%)
                  </span>
                  <span className="text-teal-700 dark:text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold">
                    Command Console &rarr;
                  </span>
                </div>
              </div>
            </CyberHUDCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Incidents;
