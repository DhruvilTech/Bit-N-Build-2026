import React from 'react';
import { IncidentSeverity, IncidentPriority, IncidentStatus, TeamStatus } from '../../types';

interface StatusBadgeProps {
  type: 'severity' | 'priority' | 'status' | 'teamStatus';
  value: IncidentSeverity | IncidentPriority | IncidentStatus | TeamStatus | string;
  className?: string;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  className = '',
  pulse = false,
}) => {
  const getColors = () => {
    switch (value) {
      case 'CRITICAL':
      case 'P1':
      case 'Escalated':
        return {
          bg: 'bg-red-500/15',
          border: 'border-red-500/40',
          text: 'text-red-400',
          dot: 'bg-red-500',
          glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]',
        };
      case 'HIGH':
      case 'P2':
      case 'Analyzing':
      case 'EN_ROUTE':
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          dot: 'bg-amber-500',
          glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
        };
      case 'MEDIUM':
      case 'P3':
      case 'Assigned':
      case 'Responding':
      case 'BUSY':
        return {
          bg: 'bg-cyan-500/15',
          border: 'border-cyan-500/40',
          text: 'text-cyan-400',
          dot: 'bg-cyan-400',
          glow: 'shadow-[0_0_10px_rgba(0,217,255,0.3)]',
        };
      case 'LOW':
      case 'P4':
      case 'AVAILABLE':
      case 'ON_SCENE':
      case 'Resolved':
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
          glow: 'shadow-[0_0_8px_rgba(34,197,94,0.3)]',
        };
      case 'New':
        return {
          bg: 'bg-purple-500/15',
          border: 'border-purple-500/40',
          text: 'text-purple-400',
          dot: 'bg-purple-400',
          glow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]',
        };
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-slate-500/15',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          dot: 'bg-slate-400',
          glow: '',
        };
    }
  };

  const style = getColors();
  const shouldPulse = pulse || value === 'CRITICAL' || value === 'Escalated' || value === 'EN_ROUTE';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${style.bg} ${style.border} ${style.text} ${style.glow} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${style.dot} ${
          shouldPulse ? 'animate-pulse' : ''
        }`}
      />
      {value}
    </span>
  );
};
