import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { systemHealthApi, SystemHealthDetailed } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface BasicHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  success: boolean;
  uptime: number;
  timestamp: string;
  aiService?: string;
  database?: string;
}

export const SystemHealthIndicator: React.FC = () => {
  const { user } = useAuth();
  const isPrivileged = user && ['ADMIN', 'OPERATOR', 'FIELD_COORDINATOR'].includes(user.role);

  const [basicHealth, setBasicHealth] = useState<BasicHealth | null>(null);
  const [detailedHealth, setDetailedHealth] = useState<SystemHealthDetailed | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const basic = await systemHealthApi.getBasic();
      setBasicHealth(basic);

      if (isPrivileged && isOpen) {
        setLoading(true);
        const detailed = await systemHealthApi.getDetailed();
        setDetailedHealth(detailed);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch health');
      setBasicHealth((prev) =>
        prev
          ? { ...prev, status: 'unhealthy' }
          : {
              status: 'unhealthy',
              success: false,
              uptime: 0,
              timestamp: new Date().toISOString(),
            }
      );
      setLoading(false);
    }
  }, [isPrivileged, isOpen]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Listen for real-time socket health updates
  useEffect(() => {
    const handleSystemHealthEvent = (event: CustomEvent) => {
      if (event.detail) {
        setBasicHealth((prev) => ({
          status: event.detail.status || 'healthy',
          success: true,
          uptime: event.detail.uptime || prev?.uptime || 0,
          timestamp: event.detail.timestamp || new Date().toISOString(),
        }));
      }
    };

    window.addEventListener('ps9:systemHealth' as any, handleSystemHealthEvent);
    return () => {
      window.removeEventListener('ps9:systemHealth' as any, handleSystemHealthEvent);
    };
  }, []);

  const handleOpenModal = async () => {
    setIsOpen(true);
    if (isPrivileged) {
      setLoading(true);
      try {
        const detailed = await systemHealthApi.getDetailed();
        setDetailedHealth(detailed);
      } catch (err: any) {
        setError(err?.message || 'Failed to load detailed telemetry');
      } finally {
        setLoading(false);
      }
    }
  };

  const status = basicHealth?.status || 'healthy';

  const statusStyles = {
    healthy: {
      dot: 'bg-emerald-500 animate-pulse',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-[#34D399]',
      label: 'SYSTEM NORMAL',
    },
    degraded: {
      dot: 'bg-amber-500 animate-ping',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400',
      label: 'SYSTEM DEGRADED',
    },
    unhealthy: {
      dot: 'bg-rose-500 animate-ping',
      bg: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400',
      label: 'SYSTEM OFFLINE',
    },
  };

  const currentStyle = statusStyles[status] || statusStyles.healthy;

  return (
    <>
      {/* Header Pill Button */}
      <button
        onClick={handleOpenModal}
        title="View Real-Time System Health Telemetry"
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${currentStyle.bg}`}
      >
        <span className={`w-2 h-2 rounded-full ${currentStyle.dot}`} />
        <span className="tracking-wide hidden md:inline">{currentStyle.label}</span>
        <Activity className="w-3.5 h-3.5 opacity-80" />
      </button>

      {/* Detailed Telemetry Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl rounded-2xl bg-slate-900/95 border border-white/10 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      OPERATIONAL SYSTEM HEALTH
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      PS-9 TACTICAL CLOUD INFRASTRUCTURE TELEMETRY
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Refresh telemetry"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* High-Level Overview Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${currentStyle.dot}`} />
                  <div>
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
                      CORE STATUS: {status.toUpperCase()}
                    </span>
                    <p className="text-[10px] font-mono text-slate-400">
                      Checked: {new Date(basicHealth?.timestamp || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">
                    UPTIME: {Math.floor((basicHealth?.uptime || 0) / 60)}m {(basicHealth?.uptime || 0) % 60}s
                  </span>
                </div>
              </div>

              {/* Role-Gated Telemetry Breakdown */}
              {isPrivileged ? (
                <div className="space-y-3">
                  {loading && !detailedHealth ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs font-mono text-cyan-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Loading real-time microservice telemetry...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* API Gateway */}
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Server className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-xs font-mono font-semibold block text-slate-200">REST API</span>
                            <span className="text-[10px] font-mono text-slate-400">Node / Express</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          HEALTHY
                        </span>
                      </div>

                      {/* Database */}
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="text-xs font-mono font-semibold block text-slate-200">DATABASE</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              MongoDB {detailedHealth?.components?.DATABASE?.latencyMs ? `(${detailedHealth.components.DATABASE.latencyMs}ms)` : ''}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            detailedHealth?.components?.DATABASE?.status === 'healthy'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {(detailedHealth?.components?.DATABASE?.status || 'HEALTHY').toUpperCase()}
                        </span>
                      </div>

                      {/* AI Microservice */}
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Cpu className="w-4 h-4 text-purple-400" />
                          <div>
                            <span className="text-xs font-mono font-semibold block text-slate-200">AI ENGINE</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              FastAPI {detailedHealth?.components?.AI?.latencyMs ? `(${detailedHealth.components.AI.latencyMs}ms)` : ''}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            detailedHealth?.components?.AI?.status === 'healthy'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : detailedHealth?.components?.AI?.status === 'degraded'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {(detailedHealth?.components?.AI?.status || 'HEALTHY').toUpperCase()}
                        </span>
                      </div>

                      {/* Socket.IO Real-time */}
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Radio className="w-4 h-4 text-blue-400" />
                          <div>
                            <span className="text-xs font-mono font-semibold block text-slate-200">SOCKET.IO</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {detailedHealth?.components?.SOCKET?.connectedClients ?? 1} Connected
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      </div>

                      {/* Background Schedulers */}
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between sm:col-span-2">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="text-xs font-mono font-semibold block text-slate-200">SCHEDULER ENGINE</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              SLA & Alert Automation (Runs: {detailedHealth?.components?.SCHEDULER?.details?.runCount ?? 0})
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          RUNNING
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Non-privileged viewer view */
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                  <Shield className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-mono text-slate-300">
                    High-level operational systems are functioning within normal parameters.
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Detailed component latency and infrastructure telemetry are restricted to Command Staff.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
