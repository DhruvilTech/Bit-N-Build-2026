import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { soundFx } from '../../utils/audio';
import { LineSidebar, LineSidebarItemObject } from '../ui/LineSidebar';

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
  const { stats, alerts, theme } = useEmergency();
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  const handleLogout = async () => {
    soundFx.playClick();
    await logout();
    navigate('/login');
  };

  // Full nav item list — each item declares what permission is required to see it.
  // Items without requiredPermission are always shown (e.g. Command Center is universal).
  const allNavItems = [
    {
      label: 'Command Center',
      icon: LayoutDashboard,
      path: '/command-center',
      requiredPermission: 'INCIDENT_READ', // all authenticated roles have INCIDENT_READ
    },
    {
      label: 'Live Incidents',
      icon: ShieldAlert,
      path: '/incidents',
      badge: stats.totalIncidents,
      badgeColor: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30',
      requiredPermission: 'INCIDENT_READ',
    },
    {
      label: 'GIS Operations',
      icon: MapPin,
      path: '/map',
      requiredPermission: 'INCIDENT_READ',
    },
    {
      label: 'Resources',
      icon: Truck,
      path: '/resources',
      requiredPermission: 'RESOURCE_READ',
    },
    {
      label: 'Response Teams',
      icon: Users,
      path: '/teams',
      badge: stats.activeTeams,
      badgeColor: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30',
      requiredPermission: 'TEAM_READ',
    },
    {
      label: 'Alerts & Escalation',
      icon: AlertTriangle,
      path: '/alerts',
      badge: activeAlertsCount,
      badgeColor: 'bg-[#FB4A4A]/15 text-[#FB4A4A] border-[#FB4A4A]/30',
      requiredPermission: 'ESCALATION_READ',
    },
    {
      label: 'AI Response Copilot',
      icon: Bot,
      path: '/assistant',
      requiredPermission: 'AI_CHAT',
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      requiredPermission: 'ANALYTICS_READ',
    },
    {
      label: 'Notifications',
      icon: Bell,
      path: '/notifications',
      requiredPermission: 'NOTIFICATION_READ',
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      requiredPermission: 'INCIDENT_READ', // everyone can see settings (their profile)
    },
    {
      label: 'Component Library',
      icon: Component,
      path: '/components',
      requiredPermission: 'SYSTEM_MANAGE', // ADMIN only
    },
  ];

  // Filter nav items to only those the current user has permission for
  const navItems = allNavItems.filter((item) =>
    !item.requiredPermission || hasPermission(item.requiredPermission)
  );

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
          isCollapsed ? 'w-20' : 'w-72'
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

          {/* Active Route Index */}
          {!isCollapsed ? (
            <LineSidebar
              items={navItems}
              activeIndex={navItems.findIndex((item) => item.path === location.pathname)}
              accentColor="#2DD4BF"
              textColor={theme === 'dark' ? '#9CA5B4' : '#475569'}
              markerColor={theme === 'dark' ? 'rgba(45, 212, 191, 0.35)' : 'rgba(13, 148, 136, 0.45)'}
              showIndex={true}
              showMarker={true}
              proximityRadius={65}
              maxShift={6}
              falloff="smooth"
              markerLength={16}
              markerGap={6}
              scaleTick={false}
              itemGap={4}
              fontSize={0.8}
              smoothing={80}
              onItemClick={(_index, item) => {
                soundFx.playClick();
                if (typeof item === 'object' && item.path) {
                  navigate(item.path);
                }
                setMobileOpen(false);
              }}
            />
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  soundFx.playClick();
                  setMobileOpen(false);
                }}
                className={({ isActive }) =>
                  `relative flex items-center justify-center p-3 rounded-xl font-mono text-xs transition-all group ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/30 dark:border-[#2DD4BF]/30 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />

                {/* Collapsed Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-300 dark:border-[#2DD4BF]/30 text-slate-900 dark:text-white text-xs font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-50">
                  {item.label}
                  {item.badge !== undefined && ` (${item.badge})`}
                </div>
              </NavLink>
            ))
          )}
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
