import React, { useState } from 'react';
import { CyberButton } from '../ui/CyberButton';
import { X, Radio, AlertCircle, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  onAddReport: (report: { source: string; text: string; reliability: number }) => Promise<any>;
}

export const AddReportModal: React.FC<AddReportModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  onAddReport,
}) => {
  const [source, setSource] = useState<string>('FIELD_TEAM');
  const [text, setText] = useState<string>('');
  const [reliability, setReliability] = useState<number>(85);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 3) {
      setError('Report narrative must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddReport({
        source,
        text: text.trim(),
        reliability: Number(reliability),
      });
      soundFx.playSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to attach report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0B0E13] border border-teal-500/40 dark:border-[#2DD4BF]/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-600 dark:text-[#2DD4BF]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white tracking-wide">
                ATTACH EVIDENCE REPORT
              </h3>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                MULTI-SOURCE FUSION • CORROBORATING FIELD INTEL FOR #{incidentId}
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
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Selection */}
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">
              INTELLIGENCE SOURCE
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            >
              <option value="FIELD_TEAM">FIELD_TEAM (Tactical Responder Unit)</option>
              <option value="CITIZEN">CITIZEN (Witness Call)</option>
              <option value="SENSOR">SENSOR (IoT Telemetry / Heat / Gas)</option>
              <option value="EMERGENCY_CALL">EMERGENCY_CALL (911 Dispatch)</option>
              <option value="OPERATOR">OPERATOR (Command Desk Intel)</option>
            </select>
          </div>

          {/* Narrative Text */}
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">
              OBSERVATION NARRATIVE *
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Unit 4 arrived on scene: heavy smoke observed venting from roof."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-sans"
              required
            />
          </div>

          {/* Reliability Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-bold">
                CONFIDENCE & RELIABILITY: {reliability}%
              </label>
              <span className={`text-[10px] font-bold ${reliability >= 80 ? 'text-emerald-500' : reliability >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                {reliability >= 80 ? 'HIGH FIDELITY' : reliability >= 60 ? 'MODERATE' : 'UNCONFIRMED'}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={reliability}
              onChange={(e) => setReliability(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
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
              {isSubmitting ? 'ATTACHING EVIDENCE...' : 'SUBMIT REPORT'}
            </CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
};
