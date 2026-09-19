import React from 'react';
import { CyberCard } from '../ui/CyberCard';
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
      color: 'text-[#2DD4BF]',
      variant: 'default' as const,
      route: '/incidents',
    },
    {
      title: 'CRITICAL (P1)',
      value: String(stats.criticalIncidents).padStart(2, '0'),
      change: 'Immediate threat vector',
      trend: 'critical',
      icon: ShieldAlert,
      color: 'text-[#FB4A4A]',
      variant: 'critical' as const,
      route: '/alerts',
    },
    {
      title: 'DEPLOYED TEAMS',
      value: String(stats.activeTeams).padStart(2, '0'),
      change: 'Mobilized field units',
      trend: 'neutral',
      icon: Users,
      color: 'text-[#3B82F6]',
      variant: 'default' as const,
      route: '/teams',
    },
    {
      title: 'AVAILABLE FLEET',
      value: String(stats.availableVehicles).padStart(2, '0'),
      change: 'Ready for dispatch',
      trend: 'neutral',
      icon: Truck,
      color: 'text-[#34D399]',
      variant: 'default' as const,
      route: '/resources',
    },
    {
      title: 'TRAUMA HOSPITALS',
      value: String(stats.hospitalsAvailable).padStart(2, '0'),
      change: 'ICU capacity ready',
      trend: 'neutral',
      icon: Building2,
      color: 'text-[#A78BFA]',
      variant: 'ai' as const,
      route: '/resources',
    },
    {
      title: 'TRANSIT DELAYS',
      value: String(stats.delayedResponses).padStart(2, '0'),
      change: 'Exceeding SLA limit',
      trend: 'warning',
      icon: ClockAlert,
      color: 'text-[#F5A623]',
      variant: 'warning' as const,
      route: '/alerts',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {metrics.map((item, index) => (
        <CyberCard
          key={index}
          variant={item.variant}
          onClick={() => navigate(item.route)}
          className="p-3.5 sm:p-4 cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-slate-600 dark:text-slate-400 truncate font-semibold">
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
              <span className="text-[10px] font-mono text-teal-600 dark:text-[#2DD4BF] flex items-center font-bold">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                12%
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate flex items-center gap-1.5">
            {item.variant === 'critical' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-[#FB4A4A] animate-pulse flex-shrink-0" />
            )}
            {item.variant === 'warning' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-[#F5A623] flex-shrink-0" />
            )}
            <span className="truncate font-medium">{item.change}</span>
          </div>
        </CyberCard>
      ))}
    </div>
  );
};
