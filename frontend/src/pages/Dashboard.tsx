import React from 'react';
import { MetricCards } from '../components/dashboard/MetricCards';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { LiveIncidentFeed } from '../components/dashboard/LiveIncidentFeed';
import { RoleBanner } from '../components/dashboard/RoleBanner';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Sparkles,
  Bot,
  Radio,
  Flame,
  AlertOctagon,
  Activity,
  HeartPulse,
  MapPin,
  Truck,
  BarChart3,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const {
    activeIncident,
    stats,
    setIsSimulatorModalOpen,
  } = useEmergency();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Build role-specific quick action buttons
  const getQuickActions = () => {
    const role = user?.role ?? 'VIEWER';

    if (role === 'ADMIN' || role === 'OPERATOR') {
      return {
        title: 'RAPID COMMAND ACTIONS',
        actions: [
          {
            label: 'Simulate Catastrophic Incident',
            icon: <Flame className="w-4 h-4 text-red-600 dark:text-[#FB4A4A] group-hover:scale-110 transition-transform" />,
            onClick: () => setIsSimulatorModalOpen(true),
            className: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border-red-300 dark:border-red-500/40 text-red-900 dark:text-red-300',
          },
          {
            label: 'Auto-Recommend Units',
            icon: <Sparkles className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />,
            onClick: () => navigate('/resources'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
          {
            label: 'Delayed Response Monitor',
            icon: <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-[#F5A623]" />,
            onClick: () => navigate('/alerts'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
        ],
      };
    }

    if (role === 'FIELD_COORDINATOR') {
      return {
        title: 'FIELD COMMANDER ACTIONS',
        actions: [
          {
            label: 'View Active Incidents',
            icon: <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />,
            onClick: () => navigate('/incidents'),
            className: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-900/40 border-teal-300 dark:border-teal-500/40 text-teal-900 dark:text-teal-200',
          },
          {
            label: 'Track Field Resources',
            icon: <Truck className="w-4 h-4 text-blue-600 dark:text-[#60A5FA]" />,
            onClick: () => navigate('/resources'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
          {
            label: 'View Escalation Alerts',
            icon: <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-[#F5A623]" />,
            onClick: () => navigate('/alerts'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
        ],
      };
    }

    if (role === 'MEDICAL_COORDINATOR') {
      return {
        title: 'MEDICAL LIAISON ACTIONS',
        actions: [
          {
            label: 'Hospital Capacity Status',
            icon: <HeartPulse className="w-4 h-4 text-pink-600 dark:text-[#F472B6] group-hover:scale-110 transition-transform" />,
            onClick: () => navigate('/resources'),
            className: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-900/40 border-pink-300 dark:border-pink-500/40 text-pink-900 dark:text-pink-200',
          },
          {
            label: 'Medical Resource Fleet',
            icon: <Truck className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />,
            onClick: () => navigate('/resources'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
          {
            label: 'View Incident Reports',
            icon: <Activity className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />,
            onClick: () => navigate('/incidents'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
        ],
      };
    }

    if (role === 'RESPONDER') {
      return {
        title: 'FIELD UNIT ACTIONS',
        actions: [
          {
            label: 'My Active Assignment',
            icon: <MapPin className="w-4 h-4 text-blue-600 dark:text-[#60A5FA] group-hover:scale-110 transition-transform" />,
            onClick: () => navigate('/incidents'),
            className: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border-blue-300 dark:border-blue-500/40 text-blue-900 dark:text-blue-200',
          },
          {
            label: 'My Unit Status',
            icon: <Radio className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />,
            onClick: () => navigate('/teams'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
          {
            label: 'Tactical Map View',
            icon: <Activity className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />,
            onClick: () => navigate('/map'),
            className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
          },
        ],
      };
    }

    // VIEWER — read-only shortcuts
    return {
      title: 'OBSERVATION SHORTCUTS',
      actions: [
        {
          label: 'Live Incident Map',
          icon: <MapPin className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />,
          onClick: () => navigate('/map'),
          className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
        },
        {
          label: 'Analytics Dashboard',
          icon: <BarChart3 className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />,
          onClick: () => navigate('/analytics'),
          className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
        },
        {
          label: 'View Notifications',
          icon: <Clock className="w-4 h-4 text-amber-600 dark:text-[#F5A623]" />,
          onClick: () => navigate('/notifications'),
          className: 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200',
        },
      ],
    };
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-4">
      {/* Role Identity & Mission Context Banner */}
      <RoleBanner />

      {/* Top 6 KPI Metric Cards */}
      <MetricCards />

      {/* Main Command Operations Layout: Map (Left/Center) & Live Incident Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Geospatial Intelligence Map */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-[#2DD4BF] animate-ping" />
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-wide">
                <TextScramble text="TACTICAL GEOSPATIAL COMMAND" duration={350} />
              </h2>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="text-xs font-mono text-teal-700 dark:text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
            >
              Full Screen Map &rarr;
            </button>
          </div>

          <EmergencyMap height="540px" selectedIncidentId={activeIncident?.id} />
        </div>

        {/* Live Streaming Incident Feed */}
        <div className="lg:col-span-4 h-[580px]">
          <LiveIncidentFeed />
        </div>
      </div>

      {/* Lower Operations Section: AI Situational Summary + Role-specific Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Autonomous Response AI Summary Card */}
        <div className="lg:col-span-8 p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-purple-500/30 dark:border-[rgba(124,92,252,0.35)] backdrop-blur-[18px] relative overflow-hidden shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-purple-500/10 dark:bg-[rgba(124,92,252,0.08)] blur-3xl" />

          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-700 dark:text-[#A78BFA]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  RESPONSE AI // SITUATIONAL SYNTHESIS
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:bg-[#7C5CFC]/20 dark:text-[#A78BFA] border border-purple-500/30 dark:border-[#7C5CFC]/30 font-bold">
                    REAL-TIME
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium">
                  AUTONOMOUS INTELLIGENCE SUMMARY & THREAT MATRIX
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/assistant')}
              className="text-xs font-mono text-teal-700 dark:text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
            >
              Consult AI &rarr;
            </button>
          </div>

          <div className="space-y-3 font-sans text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              <strong className="text-slate-900 dark:text-white font-mono">CURRENT POSTURE:</strong> Tracking{' '}
              <span className="text-teal-700 dark:text-[#2DD4BF] font-bold">{stats.totalIncidents} active incidents</span>,{' '}
              with <span className="text-red-600 dark:text-[#FB4A4A] font-bold">{stats.criticalIncidents} rated CRITICAL (P1)</span>. Primary hazard vector centered on{' '}
              <span className="text-slate-900 dark:text-white font-semibold">{activeIncident?.title || 'Industrial Zone'}</span> ({activeIncident?.id || 'ER-2048'}).
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white font-mono">RESOURCE STATUS:</strong>{' '}
              <span className="text-blue-700 dark:text-[#60A5FA] font-semibold">{stats.activeTeams} emergency response teams deployed</span>. Foam suppression and trauma units are active on scene. Secondary concern:{' '}
              <span className="text-amber-700 dark:text-[#F5A623] font-semibold">
                {stats.delayedResponses > 0
                  ? `${stats.delayedResponses} unit experiencing transit delay exceeding 6 minutes.`
                  : 'Transit routes within normal SLA.'}
              </span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span>CONFIDENCE: <strong className="text-teal-700 dark:text-[#2DD4BF] font-bold">94.8%</strong></span>
              <span>•</span>
              <span>DE-DUPLICATED: <strong className="text-slate-900 dark:text-white font-bold">18 REPORTS</strong></span>
            </div>
            {activeIncident && (
              <button
                onClick={() => navigate(`/incidents/${activeIncident.id}`)}
                className="text-teal-700 dark:text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
              >
                Inspect #{activeIncident.id} Timeline &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Role-specific Quick Action Panel */}
        <div className="lg:col-span-4 p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-300 dark:border-white/10 backdrop-blur-[18px] flex flex-col justify-between shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
              <Radio className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white tracking-wide">{quickActions.title}</h3>
            </div>

            <div className="space-y-2.5">
              {quickActions.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className={`w-full p-3 rounded-xl border font-mono text-xs flex items-center justify-between transition-all group shadow-sm font-medium ${action.className}`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {action.icon}
                    {action.label}
                  </span>
                  <span className="text-xs opacity-60">&rarr;</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/5 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>STATION: SEC-04</span>
            <span className="text-emerald-600 dark:text-[#34D399] font-bold">LATENCY: 14ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
