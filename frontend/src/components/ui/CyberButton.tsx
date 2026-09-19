import React from 'react';
import { motion } from 'framer-motion';
import { soundFx } from '../../utils/audio';

export interface CyberButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'critical' | 'ai' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  pulse?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const CyberButton: React.FC<CyberButtonProps> = ({
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
        return 'bg-gradient-to-r from-[#FB4A4A] to-[#DC2626] text-white border-[rgba(251,74,74,0.5)] shadow-[0_0_20px_rgba(251,74,74,0.35)] hover:shadow-[0_0_30px_rgba(251,74,74,0.6)] hover:border-red-300';
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-teal-500 shadow-sm dark:bg-[rgba(18,22,29,0.85)] dark:hover:bg-[rgba(28,34,44,0.95)] dark:text-[#F5F7FA] dark:border-white/10 dark:hover:border-[#2DD4BF]/50 dark:hover:shadow-[0_0_15px_rgba(45,212,191,0.15)]';
      case 'ai':
        return 'bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] text-white border-purple-400/50 shadow-[0_0_20px_rgba(124,92,252,0.35)] hover:shadow-[0_0_30px_rgba(124,92,252,0.6)]';
      case 'ghost':
        return 'bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border-transparent';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-[#2DD4BF] to-[#2563EB] text-[#05070A] font-bold border-[#5EEAD4]/60 shadow-[0_0_20px_rgba(45,212,191,0.35)] hover:shadow-[0_0_30px_rgba(45,212,191,0.6)] hover:border-teal-200';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-sm gap-3 font-semibold';
      case 'md':
      default:
        return 'px-4 py-2 text-xs gap-2 font-semibold';
    }
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`relative inline-flex items-center justify-center rounded-xl border font-mono tracking-wider uppercase transition-all duration-200 backdrop-blur-md overflow-hidden laser-sheen ${getVariantStyles()} ${getSizeStyles()} ${
        pulse ? 'animate-pulse' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
