import React from 'react';

export interface RoutePathProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  className?: string;
}

export const RoutePath: React.FC<RoutePathProps> = ({
  startX,
  startY,
  endX,
  endY,
  color = '#2DD4BF',
  className = '',
}) => {
  // Compute quadratic bezier control point for slight realistic arc
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - 20;

  const pathData = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}>
      {/* Route Base Glow Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      {/* Animated Route Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="6, 6"
        className="animate-route-particle"
      />
    </svg>
  );
};
