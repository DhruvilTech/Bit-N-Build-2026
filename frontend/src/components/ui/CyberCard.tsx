import React from 'react';
import { motion } from 'framer-motion';

export interface CyberCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'critical' | 'warning' | 'ai' | 'ghost';
  interactive?: boolean;
  onClick?: () => void;
}

export const CyberCard: React.FC<CyberCardProps> = ({
  children,
  className = '',
  variant = 'default',
  interactive = true,
  onClick,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'critical':
        return 'cyber-card-critical border-red-300 hover:border-red-500 shadow-sm dark:border-[rgba(251,74,74,0.35)] dark:hover:border-[rgba(251,74,74,0.8)] dark:shadow-[0_10px_35px_rgba(251,74,74,0.15)]';
      case 'warning':
        return 'border-amber-300 hover:border-amber-500 shadow-sm dark:border-[rgba(245,166,35,0.35)] dark:hover:border-[rgba(245,166,35,0.8)] dark:shadow-[0_10px_35px_rgba(245,166,35,0.12)]';
      case 'ai':
        return 'cyber-card-ai border-purple-300 hover:border-purple-500 shadow-sm dark:border-[rgba(124,92,252,0.35)] dark:hover:border-[rgba(124,92,252,0.8)] dark:shadow-[0_10px_35px_rgba(124,92,252,0.15)]';
      case 'ghost':
        return 'bg-transparent border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15';
      case 'default':
      default:
        return 'border-slate-300 hover:border-teal-500 shadow-sm dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(45,212,191,0.35)]';
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`cyber-card relative rounded-[18px] p-5 backdrop-blur-[18px] transition-colors duration-250 ${getVariantClasses()} ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
