import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { useEmergency } from '../../context/EmergencyContext';
import {
  Flame,
  ShieldAlert,
  Users,
  Truck,
  Building2,
  ClockAlert,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MetricCards: React.FC = () => {
  const { stats } = useEmergency();
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'ACTIVE INCIDENTS',
      value: String(stats.totalIncidents).padStart(2, '0'),
      change: '+12% from last shift',
      trend: 'up',
      icon: Flame,
      color: 'text-cyan-400',
      accent: 'border-cyan-500/30',
      route: '/incidents',
    },
    {
      title: 'CRITICAL INCIDENTS',
      value: String(stats.criticalIncidents).padStart(2, '0'),
      change: 'Priority P1 active',
      trend: 'critical',
      icon: ShieldAlert,
      color: 'text-red-400',
      accent: 'border-red-500/40',
      isCritical: true,
      route: '/alerts',
    },
    {
      title: 'RESPONSE TEAMS',
      value: String(stats.activeTeams).padStart(2, '0'),
      change: 'Field units deployed',
      trend: 'neutral',
      icon: Users,
      color: 'text-blue-400',
      accent: 'border-blue-500/30',
      route: '/teams',
    },
    {
      title: 'AVAILABLE VEHICLES',
      value: String(stats.availableVehicles).padStart(2, '0'),
      change: 'Ready for dispatch',
      trend: 'neutral',
      icon: Truck,
      color: 'text-emerald-400',
      accent: 'border-emerald-500/30',
      route: '/resources',
    },
    {
      title: 'HOSPITALS ACTIVE',
      value: String(stats.hospitalsAvailable).padStart(2, '0'),
      change: 'Trauma & ICU ready',
      trend: 'neutral',
      icon: Building2,
      color: 'text-purple-400',
      accent: 'border-purple-500/30',
      route: '/resources',
    },
    {
      title: 'DELAYED RESPONSES',
      value: String(stats.delayedResponses).padStart(2, '0'),
      change: 'Exceeding SLA threshold',
      trend: 'warning',
      icon: ClockAlert,
      color: 'text-amber-400',
      accent: 'border-amber-500/40',
      route: '/alerts',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {metrics.map((item, index) => (
        <GlassCard
          key={index}
          isCritical={item.isCritical}
          onClick={() => navigate(item.route)}
          className="p-3.5 sm:p-4 cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-mono tracking-wider text-slate-500 dark:text-slate-400 truncate font-semibold">
              {item.title}
            </span>
            <div
              className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 ${item.color} group-hover:scale-110 transition-transform`}
            >
              <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
              {item.value}
            </span>
            {item.trend === 'up' && (
              <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                12%
              </span>
            )}
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate flex items-center gap-1">
            {item.isCritical && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            )}
            {item.trend === 'warning' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            )}
            <span className="truncate">{item.change}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};
