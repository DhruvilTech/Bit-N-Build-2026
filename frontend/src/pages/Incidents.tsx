import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { GlassCard } from '../components/ui/GlassCard';
import { GlowButton } from '../components/ui/GlowButton';
import {
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Flame,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IncidentSeverity, IncidentStatus } from '../types';

export const Incidents: React.FC = () => {
  const { incidents, setActiveIncidentId, escalateIncident, resolveIncident } = useEmergency();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || inc.severity === severityFilter;

    const matchesStatus =
      statusFilter === 'ALL' || inc.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-display font-bold text-white tracking-wider">
              INCIDENT MANAGEMENT SYSTEM
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            INGESTION, AI TRIAGE, PRIORITY ASSIGNMENT & ESCALATION CONTROL
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                viewMode === 'table'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                viewMode === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-center gap-3 justify-between shadow-sm dark:shadow-xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ID, title, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                severityFilter === sev
                  ? sev === 'CRITICAL'
                    ? 'bg-red-500 text-white font-bold shadow-sm'
                    : 'bg-cyan-600 dark:bg-cyan-500/20 text-white dark:text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Dropdown Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50 w-full md:w-auto"
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
        <div className="rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl overflow-hidden shadow-sm dark:shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="p-4">Incident ID</th>
                  <th className="p-4">Type & Details</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">AI Score</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredIncidents.map((incident) => {
                  return (
                    <tr
                      key={incident.id}
                      onClick={() => {
                        setActiveIncidentId(incident.id);
                        navigate(`/incidents/${incident.id}`);
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <span className="font-bold text-cyan-600 dark:text-cyan-300">#{incident.id}</span>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{incident.createdAt}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900 dark:text-white font-semibold">{incident.type}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                          {incident.title}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{incident.location.zone}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                          {incident.location.name}
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge type="severity" value={incident.severity} />
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-white">{incident.priority}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">{incident.aiConfidence}%</span>
                      </td>
                      <td className="p-4">
                        <StatusBadge type="status" value={incident.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {incident.status !== 'Resolved' && (
                            <button
                              onClick={() => resolveIncident(incident.id)}
                              title="Resolve Incident"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {incident.severity !== 'CRITICAL' && (
                            <button
                              onClick={() => escalateIncident(incident.id)}
                              title="Escalate to P1"
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveIncidentId(incident.id);
                              navigate(`/incidents/${incident.id}`);
                            }}
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
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
            <GlassCard
              key={incident.id}
              isCritical={incident.severity === 'CRITICAL'}
              onClick={() => {
                setActiveIncidentId(incident.id);
                navigate(`/incidents/${incident.id}`);
              }}
              className="p-5 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      #{incident.id}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-1">{incident.title}</h3>
                  </div>
                  <StatusBadge type="severity" value={incident.severity} />
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {incident.aiSummary}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-3 border-b border-white/5 mb-3">
                  <span>{incident.location.zone}</span>
                  <StatusBadge type="status" value={incident.status} />
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-400 font-semibold">
                    AI Confidence: {incident.aiConfidence}%
                  </span>
                  <span className="text-cyan-400 hover:underline flex items-center gap-1">
                    Details &rarr;
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
