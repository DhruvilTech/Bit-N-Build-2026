import React from 'react';

export interface TelemetryLabelProps {
  label: string;
  value: string | number;
  status?: 'active' | 'critical' | 'warning' | 'ai' | 'neutral';
  pulse?: boolean;
  className?: string;
}

export const TelemetryLabel: React.FC<TelemetryLabelProps> = ({
  label,
  value,
  status = 'neutral',
  pulse = false,
  className = '',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'text-[#2DD4BF] border-[#2DD4BF]/30 bg-[#2DD4BF]/10';
      case 'critical':
        return 'text-[#FB4A4A] border-[#FB4A4A]/30 bg-[#FB4A4A]/10';
      case 'warning':
        return 'text-[#F5A623] border-[#F5A623]/30 bg-[#F5A623]/10';
      case 'ai':
        return 'text-[#A78BFA] border-[#7C5CFC]/30 bg-[#7C5CFC]/10';
      case 'neutral':
      default:
        return 'text-slate-300 border-white/10 bg-white/[0.03]';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'active':
        return 'bg-[#2DD4BF]';
      case 'critical':
        return 'bg-[#FB4A4A]';
      case 'warning':
        return 'bg-[#F5A623]';
      case 'ai':
        return 'bg-[#7C5CFC]';
      case 'neutral':
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border font-mono text-[11px] tracking-wider ${getStatusColor()} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${getDotColor()} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <span className="text-slate-500 uppercase tracking-widest text-[9px] font-semibold">
        {label}:
      </span>
      <span className="font-bold">{value}</span>
    </div>
  );
};
