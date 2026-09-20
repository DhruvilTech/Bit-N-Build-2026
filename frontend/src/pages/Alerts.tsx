import React, { useState, useMemo } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { AlertItem } from '../types';
import { CyberButton } from '../components/ui/CyberButton';
import { TextScramble } from '../components/motion/TextScramble';
import {
  AlertTriangle,
  ShieldAlert,
  ClockAlert,
  Database,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Layers,
  Filter,
  Flame,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Alerts: React.FC = () => {
  const { alerts, acknowledgeAlert, escalateIncident, setActiveIncidentId } = useEmergency();
  const navigate = useNavigate();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [hideAcknowledged, setHideAcknowledged] = useState<boolean>(false);
  const [deduplicateByIncident, setDeduplicateByIncident] = useState<boolean>(true);
  const [authorizingIds, setAuthorizingIds] = useState<Record<string, boolean>>({});
  const [escalatedIds, setEscalatedIds] = useState<Record<string, boolean>>({});

  // Summary Metrics
  const activeAlertsCount = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);
  const acknowledgedCount = useMemo(() => alerts.filter((a) => a.acknowledged).length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length, [alerts]);
  const delayCount = useMemo(() => alerts.filter((a) => a.severity === 'RESPONSE DELAY' && !a.acknowledged).length, [alerts]);

  // Processed Alert Stream
  const processedAlerts = useMemo(() => {
    let list = alerts.filter((a) => filterSeverity === 'ALL' || a.severity === filterSeverity);

    if (hideAcknowledged) {
      list = list.filter((a) => !a.acknowledged);
    }

    if (deduplicateByIncident) {
      // Keep only the most recent / highest priority alert per incident
      const seenIncidents = new Map<string, AlertItem>();
      const nonIncidentAlerts: AlertItem[] = [];

      for (const alert of list) {
        if (!alert.incidentId) {
          nonIncidentAlerts.push(alert);
          continue;
        }

        const existing = seenIncidents.get(alert.incidentId);
        if (!existing) {
          seenIncidents.set(alert.incidentId, alert);
        } else {
          // If existing alert is acknowledged but new one is unacknowledged or requires escalation, prefer actionable one
          if (existing.acknowledged && !alert.acknowledged) {
            seenIncidents.set(alert.incidentId, alert);
          } else if (!existing.requiresEscalation && alert.requiresEscalation) {
            seenIncidents.set(alert.incidentId, alert);
          }
        }
      }

      return [...Array.from(seenIncidents.values()), ...nonIncidentAlerts];
    }

    return list;
  }, [alerts, filterSeverity, hideAcknowledged, deduplicateByIncident]);

  const handleAuthorizeEscalation = async (alert: AlertItem) => {
    if (!alert.incidentId || authorizingIds[alert.id]) return;

    setAuthorizingIds((prev) => ({ ...prev, [alert.id]: true }));
    try {
      await escalateIncident(alert.incidentId, alert.id);
      setEscalatedIds((prev) => ({ ...prev, [alert.id]: true }));
    } catch (err) {
      console.error('Escalation authorization failed:', err);
    } finally {
      setAuthorizingIds((prev) => ({ ...prev, [alert.id]: false }));
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

        {/* Action Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setHideAcknowledged(!hideAcknowledged)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
              hideAcknowledged
                ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-teal-300 border-teal-500/50'
                : 'bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{hideAcknowledged ? 'Active Only' : 'All Alerts'}</span>
          </button>

          <button
            onClick={() => setDeduplicateByIncident(!deduplicateByIncident)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
              deduplicateByIncident
                ? 'bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] border-teal-500/40 font-semibold'
                : 'bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{deduplicateByIncident ? 'Deduplicated' : 'Raw Stream'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[16px] bg-white dark:bg-[rgba(15,23,42,0.6)] border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">ACTIVE ALERTS</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
            {activeAlertsCount}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">Require resolution</p>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white dark:bg-[rgba(15,23,42,0.6)] border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">CRITICAL P1</span>
            <Flame className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-display font-bold text-red-500 mt-1">
            {criticalCount}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">High priority active</p>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white dark:bg-[rgba(15,23,42,0.6)] border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">RESPONSE DELAYS</span>
            <ClockAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-display font-bold text-amber-500 mt-1">
            {delayCount}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">SLA breaches</p>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white dark:bg-[rgba(15,23,42,0.6)] border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">ACKNOWLEDGED</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-display font-bold text-emerald-500 mt-1">
            {acknowledgedCount}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">Processed by command</p>
        </div>
      </div>

      {/* Severity Filter Tabs */}
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

      {/* Alerts Stream List */}
      <div className="space-y-4">
        {processedAlerts.length === 0 ? (
          <div className="p-12 text-center rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 text-slate-500 font-mono text-xs shadow-md dark:shadow-xl">
            No alerts matching current filter parameters.
          </div>
        ) : (
          processedAlerts.map((alert, idx) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isDelay = alert.severity === 'RESPONSE DELAY';
            const isAuthorizing = authorizingIds[alert.id];
            const isEscalated = escalatedIds[alert.id];

            return (
              <div
                key={`${alert.id}-${idx}`}
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

                        {(alert.acknowledged || isEscalated) && (
                          <span className="text-[10px] font-mono text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" />
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
                    {!alert.acknowledged && !isEscalated && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.requiresEscalation && alert.incidentId && (
                      isEscalated ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          ESCALATED
                        </span>
                      ) : (
                        <CyberButton
                          variant="critical"
                          size="sm"
                          pulse={!isAuthorizing}
                          disabled={isAuthorizing}
                          onClick={() => handleAuthorizeEscalation(alert)}
                        >
                          {isAuthorizing ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              AUTHORIZING...
                            </span>
                          ) : (
                            'AUTHORIZE ESCALATION'
                          )}
                        </CyberButton>
                      )
                    )}

                    {alert.incidentId && (
                      <button
                        onClick={() => {
                          setActiveIncidentId(alert.incidentId!);
                          navigate(`/incidents/${alert.incidentId}`);
                        }}
                        className="p-2 rounded-xl bg-[#2DD4BF]/10 hover:bg-[#2DD4BF]/20 text-[#2DD4BF] transition-colors"
                        title="View Incident Details"
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
