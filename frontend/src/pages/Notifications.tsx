import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Bell,
  ShieldAlert,
  Users,
  Database,
  AlertTriangle,
  CheckCheck,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '../types';

export const Notifications: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    setActiveIncidentId,
  } = useEmergency();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered = notifications.filter((n) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Unread') return !n.read;
    return n.category === activeCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Critical':
        return <ShieldAlert className="w-4 h-4 text-[#FB4A4A]" />;
      case 'Teams':
        return <Users className="w-4 h-4 text-[#2DD4BF]" />;
      case 'Resources':
        return <Database className="w-4 h-4 text-[#F5A623]" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    if (item.incidentId) {
      setActiveIncidentId(item.incidentId);
      navigate(`/incidents/${item.incidentId}`);
    } else if (item.alertId) {
      navigate('/alerts');
    } else if (item.resourceId) {
      navigate('/resources');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="NOTIFICATION & BROADCAST ARCHIVE" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            TIMESTAMPED AUDIT TRAIL • MULTI-AGENCY BROADCAST LOGS ({unreadCount} UNREAD)
          </p>
        </div>

        <button
          onClick={markAllNotificationsAsRead}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-mono text-teal-700 dark:text-[#2DD4BF] flex items-center gap-1.5 self-start sm:self-auto transition-colors shadow-sm"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto pb-1">
        {['All', 'Unread', 'Critical', 'Teams', 'Resources', 'System'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeCategory === cat
                ? 'bg-[#2DD4BF]/20 text-teal-700 dark:text-[#2DD4BF] border-[#2DD4BF]/40 font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/20'
            }`}
          >
            {cat} {cat === 'Unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-16 text-center rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 text-slate-500 font-mono text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600 opacity-40" />
            No notifications in this category.<br />
            <span className="text-[11px] text-slate-400">You're all caught up.</span>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`group p-4 rounded-[18px] border transition-all cursor-pointer ${
                !item.read
                  ? 'bg-teal-50/60 dark:bg-[#0B1018] border-teal-500/40 dark:border-[#2DD4BF]/35 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.08)]'
                  : 'bg-white dark:bg-[rgba(11,14,19,0.78)] border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/15'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex-shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-xs font-semibold ${
                          !item.read
                            ? 'text-slate-900 dark:text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        {item.category}
                      </span>
                      {item.severity && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            item.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                              : item.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-slate-500/20 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.severity}
                        </span>
                      )}
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
                  <div className="flex items-center gap-2">
                    {item.incidentId && (
                      <span className="text-xs font-mono text-teal-700 dark:text-[#2DD4BF] flex items-center gap-1 font-semibold">
                        Open #{item.incidentId} <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

