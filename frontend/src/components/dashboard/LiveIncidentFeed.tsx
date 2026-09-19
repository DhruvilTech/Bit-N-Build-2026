import React from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { StatusBadge } from '../ui/StatusBadge';
import { Radio, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LiveIncidentFeed: React.FC = () => {
  const { incidents, activeIncidentId, setActiveIncidentId } = useEmergency();
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col rounded-2xl bg-white dark:bg-[#080B12]/90 border border-slate-200 dark:border-white/10 backdrop-blur-xl overflow-hidden shadow-sm dark:shadow-2xl">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-[#05070D]/80">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
          <h3 className="font-display font-bold text-sm tracking-wider text-slate-900 dark:text-white">
            LIVE INCIDENT FEED
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/60 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-400 font-semibold">
          {incidents.length} MONITORED
        </span>
      </div>

      {/* Incident Stream List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {incidents.map((incident) => {
          const isSelected = activeIncidentId === incident.id;
          const isCritical = incident.severity === 'CRITICAL';

          return (
            <div
              key={incident.id}
              onClick={() => setActiveIncidentId(incident.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-400 dark:border-cyan-500/60 shadow-sm dark:shadow-[0_0_15px_rgba(0,212,255,0.15)]'
                  : isCritical
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-500/30 hover:border-red-500/50'
                  : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    {incident.createdAt}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px]">
                    {incident.type}
                  </span>
                </div>
                <StatusBadge type="severity" value={incident.severity} />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span className="truncate max-w-[160px]">{incident.location.zone}</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">{incident.priority}</span>
              </div>

              {/* Action row on hover / selected */}
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 dark:text-slate-500">#{incident.id}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIncidentId(incident.id);
                    navigate(`/incidents/${incident.id}`);
                  }}
                  className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors font-semibold"
                >
                  Inspect Command <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer view all link */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#05070D]/80 text-center">
        <button
          onClick={() => navigate('/incidents')}
          className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center justify-center gap-1 w-full"
        >
          View All Triage Records &rarr;
        </button>
      </div>
    </div>
  );
};
