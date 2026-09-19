import React from 'react';

export interface HudPanelProps {
  title: string;
  subtitle?: string;
  telemetryTag?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'critical' | 'ai';
}

export const HudPanel: React.FC<HudPanelProps> = ({
  title,
  subtitle,
  telemetryTag,
  icon,
  children,
  action,
  className = '',
  variant = 'default',
}) => {
  const getBorderColor = () => {
    switch (variant) {
      case 'critical':
        return 'border-[rgba(251,74,74,0.35)]';
      case 'ai':
        return 'border-[rgba(124,92,252,0.35)]';
      case 'default':
      default:
        return 'border-white/10';
    }
  };

  return (
    <div
      className={`relative rounded-[18px] bg-[rgba(11,14,19,0.78)] border ${getBorderColor()} backdrop-blur-[18px] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.4)] ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#2DD4BF] flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-display font-bold text-[#F5F7FA] tracking-wide">
                {title}
              </h3>
              {telemetryTag && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 font-bold">
                  {telemetryTag}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5 tracking-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action && <div>{action}</div>}
      </div>

      {/* Main Body */}
      <div>{children}</div>
    </div>
  );
};
