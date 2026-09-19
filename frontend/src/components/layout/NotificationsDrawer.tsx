import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCheck, AlertTriangle, Users, Database, ShieldAlert } from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { useNavigate } from 'react-router-dom';

export const NotificationsDrawer: React.FC = () => {
  const {
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveIncidentId,
  } = useEmergency();
  const navigate = useNavigate();

  if (!isNotificationsDrawerOpen) return null;

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

  const handleNotificationClick = (incidentId?: string, notifId?: string) => {
    if (notifId) markNotificationAsRead(notifId);
    if (incidentId) {
      setActiveIncidentId(incidentId);
      setIsNotificationsDrawerOpen(false);
      navigate(`/incidents/${incidentId}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Backdrop */}
        <div
          onClick={() => setIsNotificationsDrawerOpen(false)}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-screen max-w-md bg-[#080B12] border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#05070D]/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">DISPATCH ALERTS</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {notifications.filter((n) => !n.read).length} UNREAD BROADCASTS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  title="Mark all as read"
                  className="p-1.5 text-slate-400 hover:text-[#2DD4BF] rounded-lg hover:bg-white/5 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsNotificationsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono text-sm">
                  No active system alerts.
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item.incidentId, item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      !item.read
                        ? 'bg-[#0B1018] border-[#2DD4BF]/35 shadow-[0_0_15px_rgba(45,212,191,0.08)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 mt-0.5">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-xs font-semibold truncate ${
                              !item.read ? 'text-white font-bold' : 'text-slate-300'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {item.message}
                        </p>
                        {item.incidentId && (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#2DD4BF] font-semibold">
                            <span>Open #{item.incidentId}</span>
                            <span>&rarr;</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-[#05070D]/90 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">SYSTEM: ENCRYPTED MESH</span>
              <button
                onClick={() => {
                  setIsNotificationsDrawerOpen(false);
                  navigate('/notifications');
                }}
                className="text-xs font-mono text-[#2DD4BF] hover:underline font-semibold"
              >
                View Full Archive &rarr;
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
