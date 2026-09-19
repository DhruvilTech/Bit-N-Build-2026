import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  isCritical?: boolean;
  tiltEnabled?: boolean;
  hudCorners?: boolean;
  onClick?: () => void;
  dataCursor?: 'default' | 'pointer' | 'critical' | 'crosshair';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  isCritical = false,
  tiltEnabled = true,
  hudCorners = false,
  onClick,
  dataCursor,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState<number>(0);
  const [rotateY, setRotateY] = useState<number>(0);
  const [glowPos, setGlowPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -4;
    const rotY = ((x - centerX) / centerX) * 4;

    setRotateX(rotX);
    setRotateY(rotY);

    setGlowPos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      data-cursor={dataCursor || (isCritical ? 'critical' : onClick ? 'pointer' : undefined)}
      animate={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-xl overflow-hidden backdrop-blur-xl transition-all duration-200 border ${
        isCritical
          ? 'bg-red-50/90 dark:bg-red-950/20 border-red-300 dark:border-red-500/30 hover:border-red-500/60 shadow-[0_4px_20px_-2px_rgba(239,68,68,0.15)] dark:shadow-[0_10px_30px_-5px_rgba(239,68,68,0.2)]'
          : 'bg-white/95 dark:bg-[#0B1018]/75 border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/40 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_15px_35px_-5px_rgba(0,0,0,0.5)]'
      } ${hudCorners ? 'hud-box' : ''} ${className}`}
    >
      {/* Dynamic Cursor-following Glow Effect */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${glowPos.x}% ${glowPos.y}%, ${
              isCritical
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(0, 212, 255, 0.1)'
            }, transparent 80%)`,
          }}
        />
      )}

      {/* Top subtle highlight shimmer border */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/40 dark:via-white/20 to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 w-full h-full text-slate-800 dark:text-slate-100">{children}</div>
    </motion.div>
  );
};
