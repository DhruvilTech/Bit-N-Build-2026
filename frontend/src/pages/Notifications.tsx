import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import {
  Bell,
  ShieldAlert,
  Users,
  Database,
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Notifications: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveIncidentId,
  } = useEmergency();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered = notifications.filter(
    (n) => activeCategory === 'All' || n.category === activeCategory
  );

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Critical':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'Teams':
        return <Users className="w-4 h-4 text-cyan-400" />;
      case 'Resources':
        return <Database className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              NOTIFICATION & EVENT DISPATCH ARCHIVE
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            TIMESTAMPED AUDIT TRAIL • MULTI-AGENCY BROADCAST LOGS
          </p>
        </div>

        <button
          onClick={markAllNotificationsAsRead}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto pb-1">
        {['All', 'Critical', 'Teams', 'Resources', 'System'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeCategory === cat
                ? 'bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#080B12]/80 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-mono text-xs">
            No notifications in this category.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                markNotificationAsRead(item.id);
                if (item.incidentId) {
                  setActiveIncidentId(item.incidentId);
                  navigate(`/incidents/${item.incidentId}`);
                }
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                !item.read
                  ? 'bg-cyan-500/5 dark:bg-[#0B1018] border-cyan-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(0,217,255,0.06)]'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex-shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold ${
                          !item.read
                            ? 'text-slate-900 dark:text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono text-slate-500">
                    {item.timestamp}
                  </span>
                  {item.incidentId && (
                    <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-semibold">
                      Open #{item.incidentId} <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
