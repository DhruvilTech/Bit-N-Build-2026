import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Shield,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Flame,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { incidentsApi } from '../../services/api';

interface AiExplainabilityCardProps {
  incident: any;
  onReanalyze?: () => void;
  onTriggerAi?: () => void;
  onOverride?: () => void;
  onOpenOverride?: () => void;
  onConfirmReview?: () => void;
  isAnalyzing?: boolean;
  isReviewing?: boolean;
}

export const AiExplainabilityCard: React.FC<AiExplainabilityCardProps> = ({
  incident,
  onReanalyze,
  onTriggerAi,
  onOverride,
  onOpenOverride,
  onConfirmReview,
  isAnalyzing = false,
  isReviewing = false,
}) => {
  const triggerReanalyze = onReanalyze || onTriggerAi;
  const triggerOverride = onOverride || onOpenOverride;
  const [explainability, setExplainability] = useState<any>(null);
  const [loadingExplainability, setLoadingExplainability] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const ai = incident.aiAnalysis || {};
  const isFallback = Boolean(ai.fallbackUsed || ai.status === 'FALLBACK');
  const isFailed = ai.status === 'FAILED';
  const isHumanReviewRequired = Boolean(ai.requiresHumanReview || ai.status === 'HUMAN_REVIEW');
  const isProcessing = Boolean(isAnalyzing || ai.status === 'PROCESSING');
  const isRetrying = Boolean(ai.attempt && ai.attempt > 1 && isProcessing);

  useEffect(() => {
    if (incident?.id) {
      setLoadingExplainability(true);
      incidentsApi
        .getAiAnalysis(incident.id)
        .then((res: any) => {
          if (res?.explainability) {
            setExplainability(res.explainability);
          } else if (res?.aiAnalysis?.explainability) {
            setExplainability(res.aiAnalysis.explainability);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingExplainability(false));
    }
  }, [incident?.id, incident.aiAnalysis?.status, isAnalyzing]);

  // Determine current display state for Phase 35.2
  let statusBadge = {
    label: 'COMPLETED',
    color: 'bg-emerald-500/15 text-emerald-700 dark:text-[#34D399] border-emerald-500/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  };

  if (isProcessing) {
    if (isRetrying) {
      statusBadge = {
        label: `RETRYING (ATTEMPT ${ai.attempt || 2})`,
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      };
    } else {
      statusBadge = {
        label: 'ANALYZING...',
        color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      };
    }
  } else if (isFallback) {
    statusBadge = {
      label: 'FALLBACK ACTIVATED',
      color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    };
  } else if (isFailed) {
    statusBadge = {
      label: 'AI UNAVAILABLE',
      color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };
  } else if (isHumanReviewRequired) {
    statusBadge = {
      label: 'HUMAN REVIEW REQUIRED',
      color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      icon: <UserCheck className="w-3.5 h-3.5" />,
    };
  }

  // Raw predicted values vs Final operational values
  const rawClass = explainability?.classification?.predicted || ai.original?.classification || ai.classification?.type || (isFallback ? 'UNCLASSIFIED' : incident.type);
  const rawSev = explainability?.severity?.predicted || ai.original?.severity || ai.severityRating?.level || incident.severity;
  const rawPri = explainability?.priority?.predicted || ai.original?.priority || ai.priorityRating?.level || incident.priority;

  const finalClass = explainability?.classification?.final || ai.final?.classification || incident.type;
  const finalSev = explainability?.severity?.final || ai.final?.severity || incident.severity;
  const finalPri = explainability?.priority?.final || ai.final?.priority || incident.priority;

  const confidenceScore = Math.round((explainability?.overallConfidence ?? (ai.confidence || 0.85)) * 100);
  const keyFactors = explainability?.keyFactors || ai.signals || [];
  const rulesTriggered = explainability?.rulesTriggered || [];
  const safetyOverrides = explainability?.safetyOverrides || ai.safetyOverrides || {};
  const hasOverride = Boolean(safetyOverrides.overrideApplied || (ai.overrides && ai.overrides.length > 0) || isFallback);

  return (
    <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.85)] border border-purple-500/30 dark:border-[rgba(124,92,252,0.4)] backdrop-blur-[20px] relative overflow-hidden shadow-lg dark:shadow-[0_12px_45px_rgba(0,0,0,0.5)]">
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[rgba(124,92,252,0.12)] blur-3xl" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-600 dark:text-[#A78BFA] shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                AI TRIAGE & EXPLAINABILITY ENGINE
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60">
                {ai.model || 'emergency-pipeline-v1'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              EXPLAINABLE REASONING • DETERMINISTIC SAFETY OVERRIDES • CONFIDENCE CALIBRATION
            </p>
          </div>
        </div>

        {/* Status Badge & Action Controls */}
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${statusBadge.color}`}>
            {statusBadge.icon}
            {statusBadge.label}
          </span>

          <button
            onClick={triggerReanalyze}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-900/50 text-white shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? (isRetrying ? 'Retrying...' : 'Analyzing...') : 'Re-analyze'}</span>
          </button>

          <button
            onClick={triggerOverride}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-sm transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Override</span>
          </button>
        </div>
      </div>

      {/* PHASE 35.2: AI Failure / Retry / Fallback Alert Banners */}
      {isRetrying && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
          <div>
            <span className="font-bold">AI analysis retrying...</span>
            <span className="text-slate-600 dark:text-slate-400 ml-1">
              Transient connection failure detected. Attempt {ai.attempt || 2} with exponential backoff.
            </span>
          </div>
        </div>
      )}

      {isFallback && (
        <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-mono flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">AI fallback activated</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              AI service unavailable ({ai.errorCode || 'TIMEOUT'}). Emergency workflow preserved with safe baseline defaults. Zero fabricated classifications generated.
            </p>
          </div>
        </div>
      )}

      {isFailed && !isFallback && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">AI analysis unavailable</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Human review required. Operational workflow continues with reported triage attributes.
            </p>
          </div>
        </div>
      )}

      {isHumanReviewRequired && !isProcessing && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <span className="font-bold">Operator Review Flagged</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {ai.reviewReason || 'Calibrated confidence below review threshold.'}
              </p>
            </div>
          </div>
          <button
            onClick={onOverride}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
          >
            Review Now
          </button>
        </div>
      )}

      {/* PHASE 35.3: Core Explainability Metrics (What, Why, How Confident) */}
      <div className="space-y-4">
        {/* Split Grid: Raw AI Prediction vs Final System Decision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. RAW AI PREDICTION */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                RAW AI PREDICTION
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                MODEL OUTPUT
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5">
                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">TYPE</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {rawClass}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5">
                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">SEVERITY</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {rawSev}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5">
                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">PRIORITY</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {rawPri}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-slate-500 dark:text-slate-400">Calibrated Confidence:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{confidenceScore}%</span>
            </div>
          </div>

          {/* 2. FINAL OPERATIONAL DECISION */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-cyan-500/20 dark:border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
                FINAL SYSTEM DECISION
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                ACTIVE DISPATCH
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-cyan-500/20">
                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">TYPE</span>
                <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                  {finalClass}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-cyan-500/20">
                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">SEVERITY</span>
                <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                  {finalSev}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-cyan-500/20">
                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">PRIORITY</span>
                <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                  {finalPri}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-slate-500 dark:text-slate-400">Override Applied:</span>
              <span className={`font-bold ${hasOverride ? 'text-amber-500' : 'text-emerald-500'}`}>
                {hasOverride ? 'YES (OVERRIDDEN)' : 'NO (ORIGINAL)'}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Overrides Card (When active) */}
        {hasOverride && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
              <Sliders className="w-4 h-4" />
              <span>SAFETY OVERRIDE AUDIT LOG</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-[11px]">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Reason: </span>
              {safetyOverrides.overrideReason || (ai.overrides && ai.overrides[0]?.reason) || 'Safety rule / operator intervention'}
            </p>
          </div>
        )}

        {/* Explanation Narrative */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            OPERATOR-SAFE EXPLANATION
          </span>
          <p className="font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            {explainability?.explanation?.why ||
              ai.reasoning?.incidentType ||
              ai.reasoning?.severity ||
              ai.reasoning?.priority ||
              `Predicted based on keyword evidence and tactical triage indicators.`}
          </p>
        </div>

        {/* Key Tactical Factors / Signals */}
        {keyFactors.length > 0 && (
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              KEY INFLUENCING FACTORS & EVIDENCE
            </span>
            <div className="flex flex-wrap gap-1.5">
              {keyFactors.map((factor: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                >
                  #{factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Technical Details (Rules, Latency, Attempts) */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/5">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>{showTechnicalDetails ? 'Hide' : 'Show'} Advanced Auditing Details</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showTechnicalDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 space-y-2 text-xs font-mono text-slate-600 dark:text-slate-400"
              >
                {rulesTriggered.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Triggered Operational Invariants:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {rulesTriggered.map((rule: string, i: number) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400 block">ATTEMPTS</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{ai.attempt || 1}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400 block">LATENCY</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{ai.latencyMs || 0}ms</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400 block">ERROR CODE</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{ai.errorCode || 'NONE'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400 block">DUPLICATE MATCH</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {ai.duplicate?.isDuplicate ? `#${ai.duplicate.relatedIncidentId}` : 'NONE'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
