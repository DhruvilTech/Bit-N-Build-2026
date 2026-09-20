/**
 * RoleBanner — Contextual role identity and mission scope banner
 * Shown at the top of the Command Center dashboard.
 * Each role gets a unique colour, label, mission text, and visible permissions summary.
 */
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Radio,
  Stethoscope,
  Eye,
  UserCheck,
  Flame,
} from 'lucide-react';

interface RoleConfig {
  label: string;
  missionText: string;
  scopeItems: string[];
  color: string;
  borderColor: string;
  bgColor: string;
  Icon: React.FC<{ className?: string }>;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  ADMIN: {
    label: 'EOC DIRECTOR',
    missionText: 'Full command authority — platform administration, simulation oversight, and audit governance.',
    scopeItems: ['All incidents', 'All resources', 'User management', 'Simulation engine', 'Cryptographic audit trail'],
    color: 'text-red-700 dark:text-[#FB4A4A]',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10 dark:bg-red-950/30',
    Icon: ShieldCheck,
  },
  OPERATOR: {
    label: 'DISPATCH SUPERVISOR',
    missionText: 'Incident creation, resource dispatch, escalation management, and simulation control.',
    scopeItems: ['Create & resolve incidents', 'Dispatch teams & resources', 'Trigger escalations', 'Run simulations', 'Audit access'],
    color: 'text-orange-700 dark:text-[#F5A623]',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10 dark:bg-orange-950/30',
    Icon: Flame,
  },
  FIELD_COORDINATOR: {
    label: 'FIELD INCIDENT COMMANDER',
    missionText: 'Tactical situational awareness — update on-scene status, track assigned resources, request backup.',
    scopeItems: ['View all incidents', 'Update incident status', 'Track resources', 'Read escalations', 'Read-only analytics'],
    color: 'text-teal-700 dark:text-[#2DD4BF]',
    borderColor: 'border-teal-500/30',
    bgColor: 'bg-teal-500/10 dark:bg-teal-950/30',
    Icon: Radio,
  },
  MEDICAL_COORDINATOR: {
    label: 'MEDICAL LIAISON OFFICER',
    missionText: 'Hospital capacity oversight, trauma routing, and medical resource coordination.',
    scopeItems: ['View incidents', 'Hospital capacity', 'Medical resource routing', 'Facility updates', 'Read notifications'],
    color: 'text-pink-700 dark:text-[#F472B6]',
    borderColor: 'border-pink-500/30',
    bgColor: 'bg-pink-500/10 dark:bg-pink-950/30',
    Icon: Stethoscope,
  },
  RESPONDER: {
    label: 'FIELD RESPONDER',
    missionText: 'Field operative — view assigned incidents, update own unit status and location.',
    scopeItems: ['View assigned incidents', 'Update own status', 'View team roster', 'Read notifications'],
    color: 'text-blue-700 dark:text-[#60A5FA]',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10 dark:bg-blue-950/30',
    Icon: UserCheck,
  },
  VIEWER: {
    label: 'READ-ONLY OBSERVER',
    missionText: 'Monitoring access only — view analytics, incident map, and operational metrics.',
    scopeItems: ['View incidents (no mutations)', 'Analytics dashboard', 'Incident map', 'Notifications (read-only)'],
    color: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-400/30',
    bgColor: 'bg-slate-100/50 dark:bg-slate-800/30',
    Icon: Eye,
  },
};

export const RoleBanner: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const cfg = ROLE_CONFIGS[user.role] ?? ROLE_CONFIGS['VIEWER'];
  const { Icon } = cfg;

  return (
    <div className={`w-full rounded-[14px] border ${cfg.borderColor} ${cfg.bgColor} px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm`}>
      {/* Left: Role identity */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl border ${cfg.borderColor} flex items-center justify-center flex-shrink-0 ${cfg.bgColor}`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono font-bold tracking-widest uppercase ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cfg.borderColor} ${cfg.bgColor} ${cfg.color} font-bold`}>
              {user.role}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 leading-snug max-w-xl">
            {cfg.missionText}
          </p>
        </div>
      </div>

      {/* Right: Scope summary */}
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {cfg.scopeItems.map((item) => (
          <span
            key={item}
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${cfg.borderColor} ${cfg.color} ${cfg.bgColor} whitespace-nowrap`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RoleBanner;
