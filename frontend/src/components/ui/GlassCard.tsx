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

    const rotX = ((y - centerY) / centerY) * -3;
    const rotY = ((x - centerX) / centerX) * 3;

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
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`cyber-card relative rounded-[18px] backdrop-blur-[18px] transition-all duration-200 border ${
        isCritical
          ? 'cyber-card-critical border-[rgba(251,74,74,0.35)] hover:border-[rgba(251,74,74,0.85)] shadow-[0_10px_35px_rgba(251,74,74,0.15)]'
          : 'border-white/10 hover:border-[#2DD4BF]/40 shadow-[0_10px_40px_rgba(0,0,0,0.4)]'
      } ${hudCorners ? 'hud-brackets' : ''} ${className}`}
    >
      {/* Dynamic Cursor-following Glow Effect */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-[18px] opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${glowPos.x}% ${glowPos.y}%, ${
              isCritical
                ? 'rgba(251, 74, 74, 0.12)'
                : 'rgba(45, 212, 191, 0.1)'
            }, transparent 80%)`,
          }}
        />
      )}

      {/* Top subtle highlight shimmer border */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 w-full h-full text-slate-100">{children}</div>
    </motion.div>
  );
};
