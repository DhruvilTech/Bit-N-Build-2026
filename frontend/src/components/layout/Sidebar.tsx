import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  MapPin,
  Truck,
  Users,
  AlertTriangle,
  Bot,
  BarChart3,
  Bell,
  Settings,
  Globe,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Component,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { soundFx } from '../../utils/audio';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { stats } = useEmergency();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    soundFx.playClick();
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Command Center', icon: LayoutDashboard, path: '/command-center' },
    {
      label: 'Live Incidents',
      icon: ShieldAlert,
      path: '/incidents',
      badge: stats.totalIncidents,
      badgeColor: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30',
    },
    { label: 'GIS Operations', icon: MapPin, path: '/map' },
    { label: 'Resources', icon: Truck, path: '/resources' },
    {
      label: 'Response Teams',
      icon: Users,
      path: '/teams',
      badge: stats.activeTeams,
      badgeColor: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30',
    },
    {
      label: 'Alerts & Escalation',
      icon: AlertTriangle,
      path: '/alerts',
      badge: stats.criticalIncidents,
      badgeColor: 'bg-[#FB4A4A]/15 text-[#FB4A4A] border-[#FB4A4A]/30',
    },
    { label: 'AI Response Copilot', icon: Bot, path: '/assistant' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Settings', icon: Settings, path: '/settings' },
    { label: 'Component Library', icon: Component, path: '/components' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 bg-white/95 dark:bg-[#060911]/95 border-r border-slate-200 dark:border-white/10 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Navigation items */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-between font-semibold">
            {!isCollapsed && (
              <>
                <span>Operations Mesh</span>
                {user && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-[#2DD4BF] font-bold text-[9px]">
                    {user.role}
                  </span>
                )}
              </>
            )}
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                soundFx.playClick();
                setMobileOpen(false);
              }}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-xs transition-all group ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/30 dark:border-[#2DD4BF]/30 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Collapsed Tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-300 dark:border-[#2DD4BF]/30 text-slate-900 dark:text-white text-xs font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-50">
                  {item.label}
                  {item.badge !== undefined && ` (${item.badge})`}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom utility links & collapse button */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-1 bg-slate-50/60 dark:bg-[#060911]/60">
          <NavLink
            to="/"
            onClick={() => soundFx.playClick()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
          >
            <Globe className="w-4 h-4 flex-shrink-0 text-teal-600 dark:text-[#2DD4BF]" />
            {!isCollapsed && <span>Public Landing</span>}
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-[#FB4A4A]" />
            {!isCollapsed && <span>Switch Station</span>}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => {
              soundFx.playClick();
              setIsCollapsed(!isCollapsed);
            }}
            className="hidden lg:flex items-center justify-center w-full py-2 mt-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
