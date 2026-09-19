import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { CyberButton } from '../components/ui/CyberButton';
import { TextScramble } from '../components/motion/TextScramble';
import {
  AlertTriangle,
  ShieldAlert,
  ClockAlert,
  Database,
  CheckCircle2,
  ArrowRight,
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
        return <ShieldAlert className="w-5 h-5 text-[#FB4A4A] animate-pulse" />;
      case 'RESPONSE DELAY':
        return <ClockAlert className="w-5 h-5 text-[#F5A623]" />;
      case 'RESOURCE SHORTAGE':
        return <Database className="w-5 h-5 text-[#A78BFA]" />;
      case 'WARNING':
      default:
        return <AlertTriangle className="w-5 h-5 text-[#2DD4BF]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FB4A4A] animate-pulse" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="ALERTS & ESCALATION CONTROL" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
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
                  ? 'bg-[#FB4A4A] text-white border-red-400 font-bold shadow-[0_0_12px_rgba(251,74,74,0.4)]'
                  : 'bg-slate-100 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/20'
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
          <div className="p-12 text-center rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 text-slate-500 font-mono text-xs shadow-md dark:shadow-xl">
            No active alerts matching this filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isDelay = alert.severity === 'RESPONSE DELAY';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-[18px] border transition-all shadow-md dark:shadow-xl ${
                  isCritical
                    ? 'bg-red-50/70 dark:bg-red-950/20 border-red-400 dark:border-red-500/40 shadow-[0_0_30px_rgba(251,74,74,0.15)] animate-critical-pulse'
                    : isDelay
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-500/40 shadow-[0_0_20px_rgba(245,166,35,0.1)]'
                    : 'bg-white dark:bg-[rgba(11,14,19,0.78)] border-slate-200 dark:border-white/10'
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
                          : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {getAlertIcon(alert.severity)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isCritical
                              ? 'bg-red-500/20 text-[#FB4A4A] border-red-500/40'
                              : isDelay
                              ? 'bg-amber-500/20 text-amber-700 dark:text-[#F5A623] border-amber-500/40'
                              : 'bg-cyan-500/15 text-teal-700 dark:text-[#2DD4BF] border-teal-500/30'
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
                            className="text-xs font-mono text-teal-700 dark:text-[#2DD4BF] hover:underline font-semibold"
                          >
                            #{alert.incidentId}
                          </button>
                        )}

                        <span className="text-[11px] font-mono text-slate-500">
                          {alert.timestamp}
                        </span>

                        {alert.acknowledged && (
                          <span className="text-[10px] font-mono text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30 px-2 py-0.5 rounded font-semibold">
                            ACKNOWLEDGED
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{alert.title}</h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed max-w-3xl">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  {/* Alert Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.requiresEscalation && alert.incidentId && (
                      <CyberButton
                        variant="critical"
                        size="sm"
                        pulse={true}
                        onClick={() => escalateIncident(alert.incidentId!)}
                      >
                        AUTHORIZE ESCALATION
                      </CyberButton>
                    )}

                    {alert.incidentId && (
                      <button
                        onClick={() => {
                          setActiveIncidentId(alert.incidentId!);
                          navigate(`/incidents/${alert.incidentId}`);
                        }}
                        className="p-2 rounded-xl bg-[#2DD4BF]/10 hover:bg-[#2DD4BF]/20 text-[#2DD4BF] transition-colors"
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
