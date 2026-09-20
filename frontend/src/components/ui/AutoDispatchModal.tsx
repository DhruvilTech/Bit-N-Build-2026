import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  X,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Clock,
  Shield,
  Truck,
  RotateCcw,
  Compass,
  AlertOctagon,
  Radio,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { GlowButton } from './GlowButton';
import { useNavigate } from 'react-router-dom';

export const AutoDispatchModal: React.FC = () => {
  const {
    autoDispatchModalData,
    closeAutoDispatchModal,
    cancelAutoDispatch,
    triggerAutoDispatch,
  } = useEmergency();
  const navigate = useNavigate();

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!autoDispatchModalData || !autoDispatchModalData.isOpen) {
    return null;
  }

  const { incident, dispatchedResources, message, isCancelled } = autoDispatchModalData;

  const incidentId = incident?.incidentId || incident?.id || incident?._id || 'INC-LIVE';
  const incidentTitle = incident?.title || 'Emergency Incident';
  const incidentCity = incident?.city || incident?.location?.city || 'Bangalore';
  const incidentSeverity = incident?.severity || 'HIGH';
  const incidentPriority = incident?.priority || 'P1';

  const handleCancelClick = async () => {
    setIsCancelling(true);
    try {
      await cancelAutoDispatch(incidentId, cancelReason || 'Operator manual cancellation');
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Failed to cancel dispatch:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReDispatch = async () => {
    try {
      await triggerAutoDispatch(incidentId);
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Failed to re-dispatch:', err);
    }
  };

  const handleTrackOnMap = () => {
    closeAutoDispatchModal();
    navigate('/map');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAutoDispatchModal}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            isCancelled
              ? 'bg-slate-950/95 border-amber-500/40 shadow-amber-950/40'
              : 'bg-slate-950/95 border-cyan-500/40 shadow-cyan-950/50'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
                  isCancelled
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                }`}
              >
                {isCancelled ? (
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                ) : (
                  <Cpu className="w-5 h-5 animate-spin-slow" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${
                      isCancelled
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {isCancelled ? 'DISPATCH REVOKED' : 'AI AUTONOMOUS DISPATCH'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2DD4BF]" />
                    {incidentCity.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-display font-bold text-white mt-1">
                  Incident #{incidentId}: {incidentTitle}
                </h3>
              </div>
            </div>

            <button
              onClick={closeAutoDispatchModal}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
            {/* Status Notification Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isCancelled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
              }`}
            >
              {isCancelled ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              ) : (
                <Radio className="w-5 h-5 flex-shrink-0 text-cyan-400 animate-pulse mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold uppercase tracking-wider text-xs">
                  {isCancelled ? 'DISPATCH REVOKED BY OPERATOR' : 'AUTOMATIC RESOURCE ASSIGNMENT ACTIVE'}
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed font-sans">
                  {message ||
                    (isCancelled
                      ? 'All resources assigned to this incident have been recalled to their staging stations and set to AVAILABLE.'
                      : `AI has automatically matched and mobilized city-scoped resources in ${incidentCity}. Operator override is available below.`)}
                </p>
              </div>
            </div>

            {/* Dispatched Units Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#2DD4BF]" />
                  {isCancelled ? 'Recalled Units' : 'Assigned City-Scoped Units'} (
                  {dispatchedResources?.length || 0})
                </span>
                <span className="text-[10px] text-slate-500">
                  Target Radius: ~35 km • City: {incidentCity}
                </span>
              </div>

              {dispatchedResources && dispatchedResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dispatchedResources.map((res: any, idx: number) => {
                    const resId = res.resourceId || res.id || res._id || `UNIT-${idx + 1}`;
                    const resName = res.name || res.code || resId;
                    const resType = res.type || 'Emergency Unit';
                    const resEta = res.etaMinutes || res.responseTimeEta || 5;
                    const resStation = res.stationName || res.location?.address || `${incidentCity} Staging Base`;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border transition-all ${
                          isCancelled
                            ? 'bg-white/[0.02] border-white/10 text-slate-400'
                            : 'bg-cyan-950/20 border-cyan-500/25 hover:border-cyan-500/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-white truncate">{resName}</span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              isCancelled
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isCancelled ? 'RECALLED' : 'EN ROUTE'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 mb-2 truncate">
                          {resType} • {resId}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-white/5">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>ETA: {isCancelled ? 'RECALLED' : `${resEta} mins`}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 truncate">
                            <MapPin className="w-3 h-3 text-[#2DD4BF]" />
                            <span className="truncate">{resStation}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-slate-400 text-xs">
                  No specific units attached to this dispatch payload.
                </div>
              )}
            </div>

            {/* Cancel Confirmation Prompt */}
            {showCancelConfirm && !isCancelled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 space-y-2.5 text-red-200"
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  CONFIRM DISPATCH CANCELLATION
                </div>
                <p className="text-[11px] font-sans text-slate-300">
                  Are you sure you want to cancel dispatch for incident #{incidentId}? All mobilized units will immediately be recalled and returned to available staging inventory.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Optional reason (e.g., False alarm, Operator override)..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="flex-1 bg-black/40 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-sans"
                  />
                  <button
                    onClick={handleCancelClick}
                    disabled={isCancelling}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    {isCancelling ? 'RECALLING...' : 'YES, CANCEL DISPATCH'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    Back
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-mono">
              {isCancelled ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Units returned to inventory
                </span>
              ) : (
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                  Autonomous mesh dispatch active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isCancelled ? (
                <>
                  {!showCancelConfirm && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 hover:text-red-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <AlertOctagon className="w-4 h-4 text-red-400" />
                      CANCEL DISPATCH
                    </button>
                  )}

                  <GlowButton
                    variant="primary"
                    size="sm"
                    onClick={handleTrackOnMap}
                    icon={<Compass className="w-4 h-4" />}
                  >
                    TRACK ON MAP
                  </GlowButton>
                </>
              ) : (
                <>
                  <button
                    onClick={handleReDispatch}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    RE-DISPATCH VIA AI
                  </button>
                  <button
                    onClick={closeAutoDispatchModal}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors"
                  >
                    CLOSE PROTOCOL
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
