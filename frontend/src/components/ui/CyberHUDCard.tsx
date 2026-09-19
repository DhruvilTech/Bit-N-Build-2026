import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export interface CyberHUDCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'critical' | 'warning' | 'ai' | 'info';
  telemetryCode?: string;
  telemetryLabel?: string;
  onClick?: () => void;
  showLaserSweep?: boolean;
}

export const CyberHUDCard: React.FC<CyberHUDCardProps> = ({
  children,
  className = '',
  variant = 'default',
  telemetryCode,
  telemetryLabel,
  onClick,
  showLaserSweep = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setMousePos({ x, y });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return {
          cardBorder: 'border-red-300 dark:border-[rgba(251,74,74,0.35)] hover:border-red-500 dark:hover:border-[rgba(251,74,74,0.85)]',
          bracketClass: 'hud-brackets-critical',
          spotlightColor: 'rgba(251, 74, 74, 0.12)',
          tagBg: 'bg-red-500/10 dark:bg-[rgba(251,74,74,0.15)] text-red-600 dark:text-[#FB4A4A] border-red-500/30',
        };
      case 'warning':
        return {
          cardBorder: 'border-amber-300 dark:border-[rgba(245,166,35,0.35)] hover:border-amber-500 dark:hover:border-[rgba(245,166,35,0.85)]',
          bracketClass: 'hud-brackets',
          spotlightColor: 'rgba(245, 166, 35, 0.12)',
          tagBg: 'bg-amber-500/10 dark:bg-[rgba(245,166,35,0.15)] text-amber-600 dark:text-[#F5A623] border-amber-500/30',
        };
      case 'ai':
        return {
          cardBorder: 'border-purple-300 dark:border-[rgba(124,92,252,0.35)] hover:border-purple-500 dark:hover:border-[rgba(124,92,252,0.85)]',
          bracketClass: 'hud-brackets-ai',
          spotlightColor: 'rgba(124, 92, 252, 0.15)',
          tagBg: 'bg-purple-500/10 dark:bg-[rgba(124,92,252,0.15)] text-purple-600 dark:text-[#A78BFA] border-purple-500/30',
        };
      case 'info':
        return {
          cardBorder: 'border-blue-300 dark:border-[rgba(59,130,246,0.35)] hover:border-blue-500 dark:hover:border-[rgba(59,130,246,0.85)]',
          bracketClass: 'hud-brackets',
          spotlightColor: 'rgba(59, 130, 246, 0.12)',
          tagBg: 'bg-blue-500/10 dark:bg-[rgba(59,130,246,0.15)] text-blue-600 dark:text-[#60A5FA] border-blue-500/30',
        };
      case 'default':
      default:
        return {
          cardBorder: 'border-slate-300 dark:border-[rgba(255,255,255,0.08)] hover:border-teal-500 dark:hover:border-[rgba(45,212,191,0.4)]',
          bracketClass: 'hud-brackets',
          spotlightColor: 'rgba(45, 212, 191, 0.12)',
          tagBg: 'bg-teal-500/10 text-teal-700 dark:text-[#2DD4BF] border-teal-500/30 dark:border-[rgba(45,212,191,0.25)]',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`cyber-card hud-brackets ${style.bracketClass} ${showLaserSweep ? 'laser-sheen' : ''} ${
        style.cardBorder
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Interactive Cursor Spotlight */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-[18px] opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(420px circle at ${mousePos.x}% ${mousePos.y}%, ${style.spotlightColor}, transparent 75%)`,
          }}
        />
      )}

      {/* Top Telemetry Header (Optional) */}
      {(telemetryCode || telemetryLabel) && (
        <div className="relative z-10 flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/5 font-mono text-[10px] tracking-wider">
          <span className={`px-1.5 py-0.5 rounded border font-semibold ${style.tagBg}`}>
            {telemetryCode}
          </span>
          {telemetryLabel && (
            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px]">
              {telemetryLabel}
            </span>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
