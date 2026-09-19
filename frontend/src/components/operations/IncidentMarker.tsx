import React from 'react';

export interface IncidentMarkerProps {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({
  id,
  type,
  severity,
  priority = 'P1',
  isSelected = false,
  onClick,
}) => {
  const isCritical = severity === 'CRITICAL';

  const getColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: 'bg-[#FB4A4A]', border: 'border-[#FB4A4A]', shadow: 'shadow-[0_0_15px_#FB4A4A]' };
      case 'HIGH':
        return { bg: 'bg-[#F5A623]', border: 'border-[#F5A623]', shadow: 'shadow-[0_0_12px_#F5A623]' };
      default:
        return { bg: 'bg-[#2DD4BF]', border: 'border-[#2DD4BF]', shadow: 'shadow-[0_0_10px_#2DD4BF]' };
    }
  };

  const style = getColor();

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer group flex flex-col items-center select-none ${
        isSelected ? 'scale-110 z-30' : 'z-20'
      }`}
    >
      {/* Expanding Radar Ring */}
      <div
        className={`absolute -inset-2 rounded-full ${
          isCritical ? 'bg-red-500/25 animate-ping' : 'bg-cyan-500/20'
        }`}
      />

      {/* Target Marker Core */}
      <div
        className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 ${style.border} ${style.shadow} ${
          isCritical ? 'bg-[#180808]' : 'bg-[#061514]'
        }`}
      >
        <span className="text-[10px] font-mono font-bold text-white tracking-tighter">
          {priority}
        </span>
      </div>

      {/* Monospace Incident ID Tag */}
      <div className="mt-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white whitespace-nowrap shadow-lg">
        {id} • {type}
      </div>
    </div>
  );
};
