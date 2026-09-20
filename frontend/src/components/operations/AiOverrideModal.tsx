import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CyberButton } from '../ui/CyberButton';
import { Incident, IncidentSeverity, IncidentPriority } from '../../types';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Flame,
  Activity,
  Layers,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface AiOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident;
  onOverride: (overrides: any, reason: string) => Promise<any>;
}

export const AiOverrideModal: React.FC<AiOverrideModalProps> = ({
  isOpen,
  onClose,
  incident,
  onOverride,
}) => {
  const { user } = useAuth();
  const userRole = user?.role || 'OPERATOR';

  // RBAC permissions matrix
  const canOverrideClassification = userRole === 'ADMIN' || userRole === 'OPERATOR' || userRole === 'FIELD_COORDINATOR';
  const canOverrideSeverity = userRole === 'ADMIN' || userRole === 'OPERATOR' || userRole === 'MEDICAL_COORDINATOR';
  const canOverridePriority = true; // All roles can adjust priority

  const currentClassification = incident.aiAnalysis?.incidentType || incident.rawType || incident.type;
  const currentSeverity = incident.aiAnalysis?.severity || incident.severity;
  const currentPriority = incident.aiAnalysis?.priority || incident.priority;

  const [classification, setClassification] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('An operational justification of at least 3 characters is mandatory.');
      return;
    }

    const overrides: any = {};
    if (classification && classification !== currentClassification && canOverrideClassification) {
      overrides.classification = classification;
    }
    if (severity && severity !== currentSeverity && canOverrideSeverity) {
      overrides.severity = severity as IncidentSeverity;
    }
    if (priority && priority !== currentPriority && canOverridePriority) {
      overrides.priority = priority as IncidentPriority;
    }

    if (Object.keys(overrides).length === 0) {
      setError('Please select at least one field to change from the current AI recommendation.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onOverride(overrides, reason.trim());
      soundFx.playSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit override.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B0E13] border border-amber-500/40 dark:border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Glow Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white tracking-wide">
                OPERATIONAL AI OVERRIDE
              </h3>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                AUDITED DISPATCH INTERVENTION • PRESERVES ORIGINAL AI MODEL EVIDENCE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Role Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">OPERATOR CREDENTIAL:</span>
            <span className="font-bold text-teal-700 dark:text-[#2DD4BF]">{userRole}</span>
          </div>

          {/* Classification Override */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-purple-500" />
                CLASSIFICATION / TYPE
              </label>
              <span className="text-[10px] text-slate-500">Current: {currentClassification}</span>
            </div>
            {canOverrideClassification ? (
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Keep AI Recommendation ({currentClassification})</option>
                <option value="FIRE">FIRE</option>
                <option value="FLOOD">FLOOD</option>
                <option value="ROAD_ACCIDENT">ROAD_ACCIDENT</option>
                <option value="INDUSTRIAL_ACCIDENT">INDUSTRIAL_ACCIDENT</option>
                <option value="MEDICAL_EMERGENCY">MEDICAL_EMERGENCY</option>
                <option value="EARTHQUAKE">EARTHQUAKE</option>
                <option value="OTHER">OTHER</option>
              </select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-slate-400 text-[11px]">
                <Lock className="w-3.5 h-3.5" />
                <span>Restricted: {userRole} role cannot override Classification</span>
              </div>
            )}
          </div>

          {/* Severity Override */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                SEVERITY RATING
              </label>
              <span className="text-[10px] text-slate-500">Current: {currentSeverity}</span>
            </div>
            {canOverrideSeverity ? (
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Keep AI Recommendation ({currentSeverity})</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-slate-400 text-[11px]">
                <Lock className="w-3.5 h-3.5" />
                <span>Restricted: {userRole} role cannot override Severity</span>
              </div>
            )}
          </div>

          {/* Priority Override */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                DISPATCH PRIORITY TIER
              </label>
              <span className="text-[10px] text-slate-500">Current: {currentPriority}</span>
            </div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Keep AI Recommendation ({currentPriority})</option>
              <option value="P1">P1 - Critical Dispatch (&lt; 8 min SLA)</option>
              <option value="P2">P2 - High Priority (&lt; 15 min SLA)</option>
              <option value="P3">P3 - Standard Response (&lt; 30 min SLA)</option>
              <option value="P4">P4 - Low Urgency (&lt; 60 min SLA)</option>
            </select>
          </div>

          {/* Mandatory Operational Reason */}
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">
              OPERATIONAL JUSTIFICATION (MANDATORY AUDIT LOG) *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Live visual telemetry confirms structural collapse; upgrading from P2 to P1."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-sans"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <CyberButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'RECORDING OVERRIDE...' : 'COMMIT OVERRIDE'}
            </CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
};
