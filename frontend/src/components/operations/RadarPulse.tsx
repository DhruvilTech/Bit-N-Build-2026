import React from 'react';

interface RadarPulseProps {
  size?: number;
  color?: string;
  className?: string;
}

export const RadarPulse: React.FC<RadarPulseProps> = ({
  size = 40,
  color = '#2DD4BF',
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full animate-signal-pulse"
        style={{ backgroundColor: `${color}33`, borderColor: color, borderWidth: 1 }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.5,
          height: size * 0.5,
          backgroundColor: `${color}66`,
        }}
      />
      <div
        className="w-2 h-2 rounded-full z-10"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      />
    </div>
  );
};
