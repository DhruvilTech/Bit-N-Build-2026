import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { GlowButton } from '../components/ui/GlowButton';
import {
  AlertTriangle,
  ShieldAlert,
  ClockAlert,
  Database,
  CheckCircle2,
  ArrowRight,
  Filter,
  Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Alerts: React.FC = () => {
  const { alerts, acknowledgeAlert, escalateIncident, setActiveIncidentId } = useEmergency();
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter(
    (a) => filterSeverity === 'ALL' || a.severity === filterSeverity
  );

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />;
      case 'RESPONSE DELAY':
        return <ClockAlert className="w-5 h-5 text-amber-400" />;
      case 'RESOURCE SHORTAGE':
        return <Database className="w-5 h-5 text-purple-400" />;
      case 'WARNING':
      default:
        return <AlertTriangle className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              ALERTS & ESCALATION CENTER
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
            CRITICAL THREATS • LATENCY DELAY DETECTION • MUTUAL AID NOTIFICATIONS
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto pb-1">
          {['ALL', 'CRITICAL', 'RESPONSE DELAY', 'RESOURCE SHORTAGE', 'WARNING'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                filterSeverity === sev
                  ? 'bg-red-500 text-white border-red-400 font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-mono text-xs shadow-sm">
            No active alerts matching this filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isDelay = alert.severity === 'RESPONSE DELAY';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all shadow-sm ${
                  isCritical
                    ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-500/40 shadow-sm dark:shadow-[0_0_30px_rgba(239,68,68,0.15)]'
                    : isDelay
                    ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/40 shadow-sm dark:shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                    : 'bg-white dark:bg-[#080B12]/80 border-slate-200 dark:border-white/10'
                } ${alert.acknowledged ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl border flex-shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-red-500/10 border-red-500/30'
                          : isDelay
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {getAlertIcon(alert.severity)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isCritical
                              ? 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40'
                              : isDelay
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/40'
                          }`}
                        >
                          {alert.severity}
                        </span>

                        {alert.incidentId && (
                          <button
                            onClick={() => {
                              setActiveIncidentId(alert.incidentId!);
                              navigate(`/incidents/${alert.incidentId}`);
                            }}
                            className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                          >
                            #{alert.incidentId}
                          </button>
                        )}

                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {alert.timestamp}
                        </span>

                        {alert.acknowledged && (
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.2 rounded font-semibold">
                            ACKNOWLEDGED
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{alert.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed max-w-3xl">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  {/* Alert Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.requiresEscalation && alert.incidentId && (
                      <GlowButton
                        variant="critical"
                        size="sm"
                        pulse={true}
                        onClick={() => escalateIncident(alert.incidentId!)}
                      >
                        AUTHORIZE ESCALATION
                      </GlowButton>
                    )}

                    {alert.incidentId && (
                      <button
                        onClick={() => {
                          setActiveIncidentId(alert.incidentId!);
                          navigate(`/incidents/${alert.incidentId}`);
                        }}
                        className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
