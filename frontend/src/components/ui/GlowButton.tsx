import React from 'react';
import { motion } from 'framer-motion';
import { soundFx } from '../../utils/audio';

interface GlowButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'critical' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  pulse?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  onClick,
  className = '',
  disabled = false,
  pulse = false,
  type = 'button',
}) => {
  const handleClick = () => {
    if (disabled) return;
    if (variant === 'critical') {
      soundFx.playEmergencyAlert();
    } else {
      soundFx.playClick();
    }
    onClick?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:border-red-300';
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(0,212,255,0.15)] hover:border-cyan-400/60';
      case 'outline':
        return 'bg-transparent text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/15 hover:border-cyan-500 dark:hover:border-cyan-400/50 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/5';
      case 'ghost':
        return 'bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border-transparent';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-600 text-white dark:text-slate-950 font-semibold border-cyan-300/60 shadow-md dark:shadow-[0_0_20px_rgba(0,212,255,0.35)] hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] hover:border-cyan-200';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-base gap-3 font-semibold';
      case 'md':
      default:
        return 'px-4 py-2 text-sm gap-2';
    }
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      data-cursor={variant === 'critical' ? 'critical' : 'pointer'}
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`relative inline-flex items-center justify-center rounded-lg border font-mono tracking-wide transition-all duration-150 backdrop-blur-md overflow-hidden ${getVariantStyles()} ${getSizeStyles()} ${
        pulse ? 'animate-pulse' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'} ${className}`}
    >
      {/* Light sweep reflection */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
