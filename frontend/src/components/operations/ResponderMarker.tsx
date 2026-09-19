import React from 'react';
import { Truck, Ambulance, Shield } from 'lucide-react';

export interface ResponderMarkerProps {
  id: string;
  name: string;
  type: 'Fire' | 'Medical' | 'Police' | 'Rescue' | 'Hazmat';
  status: 'AVAILABLE' | 'EN_ROUTE' | 'ON_SCENE' | 'BUSY' | 'OFFLINE';
  eta?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ResponderMarker: React.FC<ResponderMarkerProps> = ({
  id,
  name,
  type,
  status,
  eta,
  isSelected = false,
  onClick,
}) => {
  const isEnRoute = status === 'EN_ROUTE';

  const getIcon = () => {
    switch (type) {
      case 'Fire':
        return <Truck className="w-3.5 h-3.5 text-[#F5A623]" />;
      case 'Medical':
        return <Ambulance className="w-3.5 h-3.5 text-[#34D399]" />;
      case 'Police':
      default:
        return <Shield className="w-3.5 h-3.5 text-[#3B82F6]" />;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'EN_ROUTE':
        return 'border-[#F5A623] shadow-[0_0_12px_rgba(245,166,35,0.4)]';
      case 'ON_SCENE':
        return 'border-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.4)]';
      case 'AVAILABLE':
      default:
        return 'border-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.3)]';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer group flex flex-col items-center select-none ${
        isSelected ? 'scale-110 z-30' : 'z-10'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg bg-[#0B0E13]/90 backdrop-blur-md border flex items-center justify-center ${getBorderColor()} ${
          isEnRoute ? 'animate-pulse' : ''
        }`}
      >
        {getIcon()}
      </div>

      <div className="mt-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md border border-white/10 text-[9px] font-mono text-slate-300 whitespace-nowrap shadow-lg flex items-center gap-1">
        <span>{id}</span>
        {eta !== undefined && eta > 0 && (
          <span className="text-[#2DD4BF] font-bold">{eta}m</span>
        )}
      </div>
    </div>
  );
};
