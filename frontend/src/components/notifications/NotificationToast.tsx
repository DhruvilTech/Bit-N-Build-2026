import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, Database, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { NotificationItem } from '../../types';
import { useNavigate } from 'react-router-dom';

interface NotificationToastProps {
  notification: NotificationItem | null;
  onDismiss: () => void;
  onNavigate?: (incidentId?: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onNavigate,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.category) {
      case 'Critical':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'Teams':
        return <Users className="w-5 h-5 text-teal-400" />;
      case 'Resources':
        return <Database className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleClick = () => {
    if (notification.incidentId) {
      if (onNavigate) onNavigate(notification.incidentId);
      else navigate(`/incidents/${notification.incidentId}`);
    } else if (notification.alertId) {
      navigate('/alerts');
    } else if (notification.resourceId) {
      navigate('/resources');
    }
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed top-20 right-4 z-[99999] max-w-sm w-full cursor-pointer shadow-2xl"
        onClick={handleClick}
      >
        <div
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${
            notification.category === 'Critical'
              ? 'bg-[#0f0a0d]/95 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
              : 'bg-[#060b13]/95 border-teal-500/40 shadow-[0_0_25px_rgba(45,212,191,0.15)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-white tracking-wide truncate">
                  {notification.title}
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                  {notification.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                {notification.message}
              </p>
              {(notification.incidentId || notification.alertId || notification.resourceId) && (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-teal-400 font-semibold">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
