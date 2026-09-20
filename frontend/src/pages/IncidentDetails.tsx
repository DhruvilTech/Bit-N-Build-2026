import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmergency } from '../context/EmergencyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CyberButton } from '../components/ui/CyberButton';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { ActiveResponsePanel } from '../components/operations/ActiveResponsePanel';
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
  Thermometer,
  User,
  PhoneCall,
  Shield,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Zap,
  Sliders,
  GitMerge,
  ShieldCheck,
  FileText,
  AlertOctagon,
  Check,
  TrendingUp,
} from 'lucide-react';

import { soundFx } from '../utils/audio';
import { aiApi, AiSummaryResult, escalationsApi, EscalationItem, incidentsApi } from '../services/api';
import { AiOverrideModal } from '../components/operations/AiOverrideModal';
import { AddReportModal } from '../components/operations/AddReportModal';
import { AiExplainabilityCard } from '../components/operations/AiExplainabilityCard';
import { IncidentTimelineView } from '../components/operations/IncidentTimelineView';

export const IncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    incidents,
    teams,
    escalateIncident,
    resolveIncident,
    dispatchTeamToIncident,
    updateIncidentStatus,
    triggerAiAnalysis,
    reviewIncident,
    overrideIncident,
    addIncidentReport,
    mergeIncidents,
    getRelatedIncidents,
    escalations,
    acknowledgeEscalation,
    resolveEscalation,
  } = useEmergency();

  const incident = incidents.find((inc) => inc.id === id) || incidents[0];

  const assignedTeams = teams.filter((t) => incident.assignedTeamIds.includes(t.id));
  const availableTeams = teams.filter((t) => t.status === 'AVAILABLE');

  const [selectedStatus, setSelectedStatus] = useState<string>(incident.rawStatus || incident.status || 'NEW');
  const [statusReason, setStatusReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Phase 3 & 4 Modal & Review State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  // Phase 5 Related & Fusion State
  const [relatedData, setRelatedData] = useState<any>(null);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeFeedback, setMergeFeedback] = useState<string | null>(null);

  // Phase 19: AI Emergency Summary State
  const [summaryData, setSummaryData] = useState<AiSummaryResult | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Phase 16: Escalation State
  const [incidentEscalations, setIncidentEscalations] = useState<EscalationItem[]>([]);
  const [isActingOnEscalation, setIsActingOnEscalation] = useState<boolean>(false);

  // Phase 37: Real-time Incident Timeline State
  const [timelineEvents, setTimelineEvents] = useState<any[]>(incident?.timeline || []);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(false);

  useEffect(() => {
    if (!incident?.id) return;
    setIsLoadingTimeline(true);
    incidentsApi
      .getTimeline(incident.id)
      .then((tl: any) => {
        if (Array.isArray(tl) && tl.length > 0) {
          setTimelineEvents(
            tl.map((item: any, idx: number) => ({
              id: item.timelineId || `TL-${idx + 1}`,
              time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString().slice(0, 8) : 'Just now',
              title: item.event ? item.event.replace(/_/g, ' ') : item.newStatus || 'Status Milestone',
              description: item.description || item.reason || 'Event logged in operational timeline.',
              completed: true,
              event: item.event,
              reason: item.reason,
            }))
          );
        } else if (incident.timeline && incident.timeline.length > 0) {
          setTimelineEvents(incident.timeline);
        }
      })
      .catch(() => {
        if (incident.timeline) setTimelineEvents(incident.timeline);
      })
      .finally(() => setIsLoadingTimeline(false));
  }, [incident?.id, incident?.timeline]);

  const formatConfidence = (val?: number | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '85%';
    if (val > 1) return `${Math.round(val)}%`;
    return `${Math.round(val * 100)}%`;
  };

  const handleGenerateSummary = async () => {
    if (!incident?.id) return;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await aiApi.getIncidentSummary(incident.id);
      setSummaryData(res);
      soundFx.playDispatch();
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to generate summary');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const renderBoldText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  };

  const handleAcknowledge = async (escId: string) => {
    setIsActingOnEscalation(true);
    try {
      await acknowledgeEscalation(escId);
      const updated = await escalationsApi.getByIncident(incident.id);
      setIncidentEscalations(updated);
    } catch (e: any) {
      console.warn('Acknowledge error:', e.message);
    } finally {
      setIsActingOnEscalation(false);
    }
  };

  const handleResolve = async (escId: string) => {
    setIsActingOnEscalation(true);
    try {
      await resolveEscalation(escId, 'Resolved via Incident Command Console');
      const updated = await escalationsApi.getByIncident(incident.id);
      setIncidentEscalations(updated);
    } catch (e: any) {
      console.warn('Resolve error:', e.message);
    } finally {
      setIsActingOnEscalation(false);
    }
  };

  // Fetch escalations for this incident
  useEffect(() => {
    if (incident?.id) {
      escalationsApi.getByIncident(incident.id).then(setIncidentEscalations).catch(() => {});
    }
  }, [incident?.id, escalations]);

  const handleTriggerAi = async () => {
    setIsAnalyzingAi(true);
    setAiError(null);
    try {
      await triggerAiAnalysis(incident.id);
    } catch (err: any) {
      setAiError(err.message || 'AI analysis request failed');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleReviewConfirm = async () => {
    setIsReviewing(true);
    setReviewFeedback(null);
    try {
      await reviewIncident(
        incident.id,
        'CONFIRM',
        'Operator verified AI classification and severity rating via field and sensor telemetry'
      );
      setReviewFeedback('AI analysis confirmed and verified.');
      soundFx.playSuccess();
      setTimeout(() => setReviewFeedback(null), 3000);
    } catch (err: any) {
      setReviewFeedback(err.message || 'Review confirmation failed.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleMergeDuplicate = async (duplicateId: string) => {
    setIsMerging(true);
    setMergeFeedback(null);
    try {
      await mergeIncidents(
        incident.id,
        [duplicateId],
        `Operator consolidated duplicate incident #${duplicateId} into canonical incident #${incident.id}`
      );
      setMergeFeedback(`Duplicate #${duplicateId} consolidated successfully.`);
      soundFx.playSuccess();
      setTimeout(() => setMergeFeedback(null), 4000);
      // Refresh related data
      getRelatedIncidents(incident.id).then(setRelatedData).catch(() => {});
    } catch (err: any) {
      setMergeFeedback(err.message || 'Consolidation failed.');
    } finally {
      setIsMerging(false);
    }
  };

  // Fetch related & duplicate candidates
  useEffect(() => {
    if (incident?.id) {
      getRelatedIncidents(incident.id)
        .then((res: any) => {
          if (res) setRelatedData(res);
        })
        .catch(() => {});
    }
  }, [incident?.id, getRelatedIncidents]);

  useEffect(() => {
    if (incident) {
      setSelectedStatus(incident.rawStatus || incident.status || 'NEW');
    }
  }, [incident]);

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsUpdatingStatus(true);
    setStatusFeedback(null);
    try {
      await updateIncidentStatus(incident.id, selectedStatus, statusReason.trim() || undefined);
      setStatusFeedback(`Status successfully updated to ${selectedStatus}`);
      setStatusReason('');
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err: any) {
      setStatusFeedback(err.message || 'Transition rejected');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getSourceIcon = (src?: string) => {
    const s = src?.toUpperCase() || '';
    if (s === 'SENSOR') return <Thermometer className="w-3.5 h-3.5 text-[#A78BFA]" />;
    if (s === 'CITIZEN') return <User className="w-3.5 h-3.5 text-[#60A5FA]" />;
    if (s === 'FIELD_TEAM') return <Radio className="w-3.5 h-3.5 text-[#F5A623]" />;
    return <PhoneCall className="w-3.5 h-3.5 text-[#2DD4BF]" />;
  };

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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                {getSourceIcon(incident.source)}
                <span>{incident.source || 'EMERGENCY_CALL'}</span>
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
          {/* Status Lifecycle Transition Control */}
          <div className="p-5 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-teal-500/30 dark:border-teal-500/30 backdrop-blur-[18px] shadow-md dark:shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-3 font-mono text-xs">
              <div className="flex items-center gap-2 font-bold text-teal-700 dark:text-[#2DD4BF]">
                <Shield className="w-4 h-4" />
                <span>OPERATIONAL STATUS LIFECYCLE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">CURRENT STATE:</span>
                <StatusBadge type="status" value={incident.status} />
              </div>
            </div>

            <form onSubmit={handleStatusTransition} className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-slate-500 block mb-1">TRANSITION TARGET:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="NEW">NEW (Unacknowledged)</option>
                    <option value="ACKNOWLEDGED">ACKNOWLEDGED (Verified)</option>
                    <option value="ASSIGNED">ASSIGNED (Units Allocated)</option>
                    <option value="RESPONDING">RESPONDING (En Route)</option>
                    <option value="ON_SCENE">ON_SCENE (Tactical Action)</option>
                    <option value="RESOLVED">RESOLVED (Threat Contained)</option>
                    <option value="CANCELLED">CANCELLED (Standdown)</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label className="text-[10px] text-slate-500 block mb-1">REASON / OPERATOR LOG ENTRY:</label>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="e.g. Fire extinguished; overhaul underway"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-2 flex sm:items-end pt-5 sm:pt-0">
                  <CyberButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="w-full justify-center"
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {isUpdatingStatus ? 'UPDATING...' : 'TRANSITION'}
                  </CyberButton>
                </div>
              </div>

              {statusFeedback && (
                <div className="text-[11px] text-teal-700 dark:text-[#2DD4BF] font-mono mt-1">
                  ✓ {statusFeedback}
                </div>
              )}
            </form>
          </div>

          {/* Phase 32 & 33 & 35.2 & 35.3: AI Explainability Card */}
          <AiExplainabilityCard
            incident={incident}
            onTriggerAi={handleTriggerAi}
            isAnalyzing={isAnalyzingAi || incident.aiAnalysis?.status === 'PROCESSING'}
            onOpenOverride={() => setIsOverrideModalOpen(true)}
            onConfirmReview={handleReviewConfirm}
            isReviewing={isReviewing}
          />

          {/* Phase 19: AI Operational Emergency Summary Panel */}
          <div className="p-5 sm:p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-purple-500/40 dark:border-[rgba(124,92,252,0.4)] backdrop-blur-[18px] shadow-lg dark:shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-[#A78BFA]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    AI EMERGENCY SUMMARY
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-[#A78BFA] font-bold border border-purple-500/30">
                      DECISION SUPPORT
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500">
                    MISTRAL AI SYNTHESIZED • SCOPED TELEMETRY • ZERO SENSITIVE LEAKS
                  </p>
                </div>
              </div>

              <CyberButton
                variant="ai"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isLoadingSummary}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />}
              >
                {isLoadingSummary ? 'Generating...' : summaryData ? 'Refresh' : 'Generate'}
              </CyberButton>
            </div>

            {summaryError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{summaryError}</span>
              </div>
            )}

            {!summaryData && !isLoadingSummary && !summaryError && (
              <div className="py-6 text-center font-mono text-xs text-slate-500 space-y-2">
                <p>Click "Generate" to synthesize a real-time 6-factor emergency briefing via Mistral AI.</p>
                <button
                  onClick={handleGenerateSummary}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/30 font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesize Briefing Now</span>
                </button>
              </div>
            )}

            {isLoadingSummary && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 font-mono text-xs text-purple-700 dark:text-[#A78BFA]">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                <span>Extracting live telemetry and prompting Mistral Neural Commander...</span>
              </div>
            )}

            {summaryData && !isLoadingSummary && (
              <div className="space-y-4 font-mono text-xs">
                {/* 1. SITUATION */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                    SITUATION:
                  </span>
                  <p className="font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {renderBoldText(summaryData.situation)}
                  </p>
                </div>

                {/* 2. CURRENT RESPONSE & DELAYS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/30">
                    <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 block uppercase mb-1">
                      CURRENT RESPONSE:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 font-sans">
                      {summaryData.currentResponse.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{renderBoldText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block uppercase mb-1">
                      DELAYS & BOTTLENECK:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 font-sans">
                      {summaryData.delays.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{renderBoldText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. RESOURCE STATUS & RISKS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 block uppercase mb-1">
                      RESOURCE STATUS:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 font-sans">
                      {summaryData.resourceStatus.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{renderBoldText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block uppercase mb-1">
                      KEY RISKS:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 font-sans">
                      {summaryData.risks.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{renderBoldText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. RECOMMENDED ACTIONS */}
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-[#A78BFA] block uppercase tracking-wider mb-1.5">
                    RECOMMENDED ACTIONS:
                  </span>
                  <div className="space-y-1.5 font-sans text-xs">
                    {summaryData.recommendedActions.map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-[#A78BFA] flex-shrink-0" />
                        <span>{renderBoldText(action)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>SOURCE: SCOPED MONGO CONTEXT &bull; STRICT CONTRACT</span>
                  <span>GENERATED: {new Date(summaryData.generatedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Phase 16: Active Escalation Engine & History */}
          <div className="p-5 sm:p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-amber-500/30 dark:border-amber-500/30 backdrop-blur-[18px] shadow-lg dark:shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-[#F5A623]">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    ESCALATION ENGINE
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-[#F5A623] font-bold border border-amber-500/30">
                      LEVEL 1 &bull; 2 &bull; 3
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500">
                    AUTOMATED TIMEOUT & TACTICAL OVERSIGHT
                  </p>
                </div>
              </div>
            </div>

            {incidentEscalations.length === 0 ? (
              <div className="py-4 text-center font-mono text-xs text-slate-500">
                No active escalations triggered for this incident. All response thresholds normal.
              </div>
            ) : (
              <div className="space-y-3">
                {incidentEscalations.map((esc) => (
                  <div
                    key={esc.escalationId}
                    className={`p-3.5 rounded-xl border font-mono text-xs space-y-2 transition-all ${
                      esc.status === 'PENDING'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                        : esc.status === 'ACKNOWLEDGED'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-900 dark:text-blue-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            esc.level === 3
                              ? 'bg-red-500 animate-ping'
                              : esc.level === 2
                              ? 'bg-amber-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                        LEVEL {esc.level} &bull; TARGET: {esc.targetRole}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/20 uppercase">
                        {esc.status}
                      </span>
                    </div>

                    <p className="font-sans text-xs">{esc.reason}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10 text-[10px]">
                      <span>Triggered: {new Date(esc.triggeredAt).toLocaleTimeString()}</span>

                      <div className="flex items-center gap-2">
                        {esc.status === 'PENDING' && (
                          <button
                            onClick={() => handleAcknowledge(esc.escalationId)}
                            disabled={isActingOnEscalation}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        {esc.status === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => handleResolve(esc.escalationId)}
                            disabled={isActingOnEscalation}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                        {esc.status === 'RESOLVED' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <ActiveResponsePanel />
          </div>

          {/* Aggregated Multi-Source Intelligence Stream */}
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            {/* Merged Duplicate Notice if this incident was consolidated */}
            {incident.duplicateOf && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-mono flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-amber-500" />
                  <span>
                    CONSOLIDATED: Incident was merged into Primary #{incident.duplicateOf}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/incidents/${incident.duplicateOf}`)}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  View Primary &rarr;
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    MULTI-SOURCE EVIDENCE STREAM ({incident.reports.length})
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    Total Corroborating Sources: {incident.sourceCount || incident.reports.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddReportModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-700 dark:text-[#2DD4BF] transition-all cursor-pointer"
                >
                  <FileText className="w-3 h-3" />
                  <span>+ Ingest Evidence</span>
                </button>
              </div>
            </div>

            {/* Candidate Duplicate & Fusion Alerts (Phase 5) */}
            {(incident.aiAnalysis?.duplicate?.isDuplicate || (relatedData?.candidateMatches && relatedData.candidateMatches.length > 0)) && (
              <div className="mb-4 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-purple-500" />
                    <span className="font-bold">
                      POTENTIAL DUPLICATE INCIDENTS IDENTIFIED
                    </span>
                  </div>
                  <span className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                    {incident.aiAnalysis?.duplicate?.similarity
                      ? `${Math.round(incident.aiAnalysis.duplicate.similarity * 100)}% SIMILARITY`
                      : 'CANDIDATE CLUSTER'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans">
                  AI detected high semantic and geospatial convergence with concurrent incident reports. You can consolidate evidence into this canonical incident.
                </p>
                {relatedData?.candidateMatches && relatedData.candidateMatches.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {relatedData.candidateMatches.map((cand: any) => (
                      <div key={cand.incidentId} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px]">
                        <span>#{cand.incidentId} - {cand.title} ({Math.round((cand.similarityScore || 0.8) * 100)}% match)</span>
                        <button
                          onClick={() => handleMergeDuplicate(cand.incidentId)}
                          disabled={isMerging}
                          className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                        >
                          {isMerging ? 'Merging...' : 'Merge into This'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {mergeFeedback && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ {mergeFeedback}
                  </div>
                )}
              </div>
            )}

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

          {/* Phase 34 & 35.4: Unified Chronological Incident Timeline */}
          <IncidentTimelineView incidentId={incident.id} />
        </div>
      </div>

      {/* AI Decision Override Modal (Phase 4) */}
      <AiOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        incident={incident}
        onOverride={(overrides, reason) => overrideIncident(incident.id, overrides, reason)}
      />

      {/* Attach Evidence Report Modal (Phase 5) */}
      <AddReportModal
        isOpen={isAddReportModalOpen}
        onClose={() => setIsAddReportModalOpen(false)}
        incidentId={incident.id}
        onAddReport={(rep) => addIncidentReport(incident.id, rep)}
      />
    </div>
  );
};

export default IncidentDetails;
