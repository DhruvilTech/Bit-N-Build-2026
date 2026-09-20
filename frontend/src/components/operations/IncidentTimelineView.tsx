import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ArrowDownUp,
  RefreshCw,
  Cpu,
  Flame,
  Users,
  Send,
  Navigation,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  UserCheck,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { incidentsApi } from '../../services/api';

interface TimelineEventItem {
  eventId: string;
  incidentId: string;
  eventType: string;
  timestamp: string | Date;
  actor: string;
  actorRole: string;
  title: string;
  description: string;
  metadata?: any;
  source?: string;
}

interface IncidentTimelineViewProps {
  incidentId: string;
  initialEvents?: any[];
}

export const IncidentTimelineView: React.FC<IncidentTimelineViewProps> = ({
  incidentId,
  initialEvents = [],
}) => {
  const [events, setEvents] = useState<TimelineEventItem[]>(initialEvents);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default: oldest → newest
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalEvents, setTotalEvents] = useState<number>(0);

  const fetchTimeline = useCallback(async () => {
    if (!incidentId) return;
    setLoading(true);
    try {
      const res: any = await incidentsApi.getTimeline(incidentId, {
        sort: sortOrder,
        page,
        limit: 50,
      });

      const eventList = res.events || res.timeline || (Array.isArray(res) ? res : []);
      setEvents(eventList);
      setTotalPages(res.totalPages || 1);
      setTotalEvents(res.total || eventList.length);
    } catch (err) {
      console.warn('[Timeline] Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [incidentId, sortOrder, page]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Real-time live timeline updates without page reload (Phase 34 & Phase 35)
  useEffect(() => {
    const handleTimelineUpdated = (event: CustomEvent) => {
      const incoming = event.detail?.event;
      const targetId = event.detail?.incidentId;

      if (incoming && (!targetId || targetId === incidentId)) {
        setEvents((prev) => {
          // Deduplicate by eventId
          if (prev.some((e) => e.eventId === incoming.eventId)) {
            return prev;
          }
          if (sortOrder === 'asc') {
            return [...prev, incoming];
          } else {
            return [incoming, ...prev];
          }
        });
        setTotalEvents((c) => c + 1);
      }
    };

    window.addEventListener('ps9:timelineUpdated' as any, handleTimelineUpdated);
    return () => {
      window.removeEventListener('ps9:timelineUpdated' as any, handleTimelineUpdated);
    };
  }, [incidentId, sortOrder]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'INCIDENT_CREATED':
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'AI_ANALYSIS_STARTED':
      case 'AI_ANALYSIS_COMPLETED':
        return <Cpu className="w-3.5 h-3.5 text-purple-500" />;
      case 'AI_FAILED':
      case 'AI_FALLBACK':
        return <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />;
      case 'HUMAN_REVIEW_REQUIRED':
        return <UserCheck className="w-3.5 h-3.5 text-amber-500" />;
      case 'TEAM_ASSIGNED':
        return <Users className="w-3.5 h-3.5 text-cyan-500" />;
      case 'DISPATCHED':
        return <Send className="w-3.5 h-3.5 text-blue-500" />;
      case 'EN_ROUTE':
        return <Navigation className="w-3.5 h-3.5 text-indigo-500" />;
      case 'ETA_UPDATED':
        return <Clock className="w-3.5 h-3.5 text-sky-500" />;
      case 'RESPONSE_DELAYED':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      case 'TEAM_ARRIVED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'ALERT_CREATED':
      case 'ALERT_ACKNOWLEDGED':
        return <Bell className="w-3.5 h-3.5 text-amber-400" />;
      case 'ALERT_RESOLVED':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'OPERATOR_OVERRIDE':
        return <Sliders className="w-3.5 h-3.5 text-amber-500" />;
      case 'INCIDENT_RESOLVED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatEventTime = (timestamp: string | Date) => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatEventDate = (timestamp: string | Date) => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.85)] border border-slate-200 dark:border-white/10 backdrop-blur-[20px] shadow-lg dark:shadow-[0_12px_45px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                UNIFIED INCIDENT TIMELINE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                {totalEvents} EVENTS
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              AUDIT-GRADE CHRONOLOGICAL ACTIVITY FEED • SERVER TIMESTAMP AUTHORITY
            </p>
          </div>
        </div>

        {/* Controls: Sorting and Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder((cur) => (cur === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            title="Toggle chronological order"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>{sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}</span>
          </button>

          <button
            onClick={fetchTimeline}
            disabled={loading}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            title="Refresh timeline feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Timeline Events Feed */}
      {loading && events.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Synchronizing chronological incident timeline...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
          No timeline events recorded yet for this incident.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-purple-500 before:to-slate-700">
          <AnimatePresence initial={false}>
            {events.map((ev, index) => (
              <motion.div
                key={ev.eventId || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                {/* Timeline Dot Node */}
                <div className="absolute -left-[27px] top-1.5 w-5 h-5 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  {getEventIcon(ev.eventType)}
                </div>

                {/* Event Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {ev.title || ev.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {ev.eventType}
                      </span>
                    </div>

                    {/* Server Timestamp */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>{formatEventDate(ev.timestamp)}</span>
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">
                        {formatEventTime(ev.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                    {ev.description}
                  </p>

                  {/* Footer: Actor & Source */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-white/5">
                    <span>
                      Actor: <strong className="text-slate-700 dark:text-slate-300">{ev.actor}</strong> ({ev.actorRole})
                    </span>
                    {ev.source && (
                      <span className="text-slate-400">
                        Source: {ev.source}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
