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
          bg: 'bg-[rgba(251,74,74,0.12)]',
          border: 'border-[rgba(251,74,74,0.4)]',
          text: 'text-[#FB4A4A]',
          dot: 'bg-[#FB4A4A]',
          glow: 'shadow-[0_0_12px_rgba(251,74,74,0.35)]',
        };
      case 'HIGH':
      case 'P2':
      case 'EN_ROUTE':
      case 'RESPONSE DELAY':
        return {
          bg: 'bg-[rgba(245,166,35,0.12)]',
          border: 'border-[rgba(245,166,35,0.4)]',
          text: 'text-[#F5A623]',
          dot: 'bg-[#F5A623]',
          glow: 'shadow-[0_0_10px_rgba(245,166,35,0.3)]',
        };
      case 'MEDIUM':
      case 'P3':
      case 'Assigned':
      case 'Responding':
        return {
          bg: 'bg-[rgba(45,212,191,0.12)]',
          border: 'border-[rgba(45,212,191,0.35)]',
          text: 'text-[#2DD4BF]',
          dot: 'bg-[#2DD4BF]',
          glow: 'shadow-[0_0_10px_rgba(45,212,191,0.25)]',
        };
      case 'LOW':
      case 'P4':
      case 'AVAILABLE':
      case 'Resolved':
        return {
          bg: 'bg-[rgba(52,211,153,0.12)]',
          border: 'border-[rgba(52,211,153,0.35)]',
          text: 'text-[#34D399]',
          dot: 'bg-[#34D399]',
          glow: 'shadow-[0_0_8px_rgba(52,211,153,0.25)]',
        };
      case 'New':
      case 'Analyzing':
      case 'RESOURCE SHORTAGE':
        return {
          bg: 'bg-[rgba(124,92,252,0.12)]',
          border: 'border-[rgba(124,92,252,0.35)]',
          text: 'text-[#A78BFA]',
          dot: 'bg-[#7C5CFC]',
          glow: 'shadow-[0_0_8px_rgba(124,92,252,0.25)]',
        };
      case 'ON_SCENE':
      case 'BUSY':
        return {
          bg: 'bg-[rgba(59,130,246,0.12)]',
          border: 'border-[rgba(59,130,246,0.35)]',
          text: 'text-[#60A5FA]',
          dot: 'bg-[#3B82F6]',
          glow: 'shadow-[0_0_8px_rgba(59,130,246,0.25)]',
        };
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-white/[0.04]',
          border: 'border-white/10',
          text: 'text-slate-400',
          dot: 'bg-slate-500',
          glow: '',
        };
    }
  };

  const style = getColors();
  const shouldPulse =
    pulse ||
    value === 'CRITICAL' ||
    value === 'Escalated' ||
    value === 'EN_ROUTE' ||
    value === 'Analyzing';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold border tracking-wider ${style.bg} ${style.border} ${style.text} ${style.glow} ${className}`}
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
