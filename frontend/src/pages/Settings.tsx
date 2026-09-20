import React, { useState, useEffect, useCallback } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { auditLogsApi, authApi, AuditLogItem, UserProfile } from '../services/api';
import { CyberButton } from '../components/ui/CyberButton';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ShieldAlert,
  User,
  CheckCircle2,
  Activity,
  ScrollText,
  Users,
  RefreshCw,
  Check,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const Settings: React.FC = () => {
  const {
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    isSimulating,
    toggleSimulationTimer,
    isLiveBackend,
  } = useEmergency();

  const { user } = useAuth();

  const [operatorName, setOperatorName] = useState<string>(user?.name || 'Commander Alex Vance');
  const [deskStation, setDeskStation] = useState<string>('Command Desk Alpha-04');
  const [delayThreshold, setDelayThreshold] = useState<number>(8);
  const [aiConfidenceCutoff, setAiConfidenceCutoff] = useState<number>(90);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Admin User Management State
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (user?.role !== 'ADMIN' && user?.role !== 'OPERATOR') return;
    setIsLoadingLogs(true);
    try {
      const logs = await auditLogsApi.getAll({ limit: 12 });
      setAuditLogs(logs);
    } catch (err: any) {
      console.warn('Could not fetch audit logs:', err.message);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [user]);

  // Fetch Users (Admin only)
  const fetchUsers = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    setIsLoadingUsers(true);
    try {
      const data = await authApi.getUsers({ limit: 20 });
      setUserList(data.users || []);
    } catch (err: any) {
      console.warn('Could not fetch users list:', err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setOperatorName(user.name);
      fetchAuditLogs();
      fetchUsers();
    }
  }, [user, fetchAuditLogs, fetchUsers]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playDispatch();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    soundFx.playClick();
    try {
      await authApi.updateUserRole(targetUserId, newRole);
      setActionSuccess(`User role updated to ${newRole}`);
      await fetchUsers();
      await fetchAuditLogs();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Role update failed:', err.message);
    }
  };

  const handleStatusToggle = async (targetUserId: string, currentStatus: boolean) => {
    soundFx.playClick();
    try {
      await authApi.updateUserStatus(targetUserId, !currentStatus);
      setActionSuccess(`User clearance ${!currentStatus ? 'activated' : 'suspended'}`);
      await fetchUsers();
      await fetchAuditLogs();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Status toggle failed:', err.message);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('ASSIGNED')) {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('LOGIN') || action.includes('ROLE')) {
      return 'bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] border-teal-500/30';
    }
    if (action.includes('RELEASED') || action.includes('LOGOUT')) {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    }
    return 'bg-purple-500/15 text-purple-700 dark:text-[#A78BFA] border-purple-500/30';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="SYSTEM SETTINGS & THRESHOLDS" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            RBAC ROLES • AUDIT TRAIL • ALGORITHM POLICIES • INTERFACE PREFERENCES
          </p>
        </div>

        {savedMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-[#34D399]/20 border border-[#34D399]/40 text-emerald-700 dark:text-[#34D399] font-mono text-xs flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Parameters Synchronized</span>
          </div>
        )}

        {actionSuccess && (
          <div className="px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-800 dark:text-[#2DD4BF] font-mono text-xs flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Section 1: Active User Security Clearance Profile */}
      <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
              AUTHENTICATED CADET CLEARANCE
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">BACKEND LINK:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isLiveBackend
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isLiveBackend ? 'LIVE CONNECTED' : 'LOCAL MESH (OFFLINE READY)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <div className="text-slate-500 text-[10px]">OPERATOR IDENTITY</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {user?.name || operatorName}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'N/A'}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <div className="text-slate-500 text-[10px]">SECURITY ROLE (RBAC)</div>
            <div className="text-sm font-bold text-teal-600 dark:text-[#2DD4BF] mt-1">
              {user?.role || 'OPERATOR'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{user?.department || 'Emergency Operations'}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <div className="text-slate-500 text-[10px]">BADGE CREDENTIAL</div>
            <div className="text-sm font-bold text-purple-600 dark:text-[#A78BFA] mt-1">
              {user?.badgeNumber || 'BADGE-DEFAULT'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Clearance Level 4</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <div className="text-slate-500 text-[10px]">LAST AUTH SESSION</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString() : 'Current Session'}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Token Active</div>
          </div>
        </div>
      </div>

      {/* Section 2: Cryptographic Audit Log Ledger (ADMIN & OPERATOR) */}
      {(user?.role === 'ADMIN' || user?.role === 'OPERATOR') && (
        <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-purple-500 dark:text-[#A78BFA]" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                IMMUTABLE AUDIT TRAIL // REAL-TIME DISPATCH LEDGER
              </h3>
            </div>
            <button
              onClick={fetchAuditLogs}
              disabled={isLoadingLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-slate-500">
              {isLoadingLogs ? 'Retrieving cryptographic ledger entries...' : 'No audit entries recorded yet in current session.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/5 text-[10px] text-slate-500 uppercase">
                    <th className="py-2 px-3">TIMESTAMP</th>
                    <th className="py-2 px-3">ACTOR</th>
                    <th className="py-2 px-3">ACTION</th>
                    <th className="py-2 px-3">ENTITY</th>
                    <th className="py-2 px-3">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white">{log.userName}</span>
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-teal-700 dark:text-[#2DD4BF] font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{log.entityType} {log.entityId ? `#${log.entityId.slice(-6)}` : ''}</span>
                          {log.simulationId && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              SIM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                        {log.newValue
                          ? `New: ${JSON.stringify(log.newValue)}`
                          : log.metadata
                          ? JSON.stringify(log.metadata)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Admin User Clearance Management (ADMIN only) */}
      {user?.role === 'ADMIN' && (
        <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                CADET DIRECTORY & ROLE ASSIGNMENT (ADMIN OVERRIDE)
              </h3>
            </div>
            <button
              onClick={fetchUsers}
              disabled={isLoadingUsers}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>Refresh Cadets</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">CADET / EMAIL</th>
                  <th className="py-2 px-3">BADGE</th>
                  <th className="py-2 px-3">ROLE CLEARANCE</th>
                  <th className="py-2 px-3">STATUS</th>
                  <th className="py-2 px-3 text-right">OVERRIDE ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {userList.map((cadet) => (
                  <tr key={cadet.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{cadet.name}</div>
                      <div className="text-[10px] text-slate-500">{cadet.email}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{cadet.badgeNumber || 'N/A'}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={cadet.role}
                        disabled={cadet.id === user.id}
                        onChange={(e) => handleRoleChange(cadet.id, e.target.value)}
                        aria-label={`Role for ${cadet.name}`}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="OPERATOR">OPERATOR</option>
                        <option value="FIELD_COORDINATOR">FIELD_COORDINATOR</option>
                        <option value="MEDICAL_COORDINATOR">MEDICAL_COORDINATOR</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          cadet.isActive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {cadet.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {cadet.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(cadet.id, cadet.isActive)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                            cadet.isActive
                              ? 'border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10'
                              : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {cadet.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Operational Preferences Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Operator Identification */}
        <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200 dark:border-white/10">
            <User className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">OPERATOR IDENTIFICATION</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">OPERATOR NAME</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500/50 dark:focus:border-[#2DD4BF]/50"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">ASSIGNED DESK / CONSOLE</label>
              <input
                type="text"
                value={deskStation}
                onChange={(e) => setDeskStation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500/50 dark:focus:border-[#2DD4BF]/50"
              />
            </div>
          </div>
        </div>

        {/* Emergency Response Thresholds */}
        <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200 dark:border-white/10">
            <ShieldAlert className="w-4 h-4 text-[#FB4A4A]" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">EMERGENCY THRESHOLDS & SLA</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-2">
                <span>Response Delay Cutoff Flag:</span>
                <span className="text-amber-600 dark:text-[#F5A623] font-bold">{delayThreshold} Minutes</span>
              </div>
              <input
                type="range"
                min="4"
                max="20"
                value={delayThreshold}
                onChange={(e) => setDelayThreshold(Number(e.target.value))}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Units taking longer than this benchmark automatically trigger high-priority delay escalations.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-2">
                <span>AI Auto-Triage Confidence Gate:</span>
                <span className="text-purple-700 dark:text-[#A78BFA] font-bold">{aiConfidenceCutoff}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                value={aiConfidenceCutoff}
                onChange={(e) => setAiConfidenceCutoff(Number(e.target.value))}
                className="w-full accent-[#7C5CFC] cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Confidence threshold required for autonomous resource allocation recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Interface & Tactical Preferences */}
        <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200 dark:border-white/10">
            <Activity className="w-4 h-4 text-teal-600 dark:text-[#2DD4BF]" />
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">INTERFACE & TACTICAL AUDIO</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Audio Toggle */}
            <div
              onClick={toggleSound}
              className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-[#2DD4BF]/40 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-slate-900 dark:text-white font-semibold block">Tactical Audio FX</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sonars, alert warbles</span>
              </div>
              <div className="p-2 rounded-xl bg-[#2DD4BF]/10 text-teal-700 dark:text-[#2DD4BF]">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </div>
            </div>

            {/* Theme Toggle */}
            <div
              onClick={toggleTheme}
              className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-[#2DD4BF]/40 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-slate-900 dark:text-white font-semibold block">Color Theme</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Command Dark' : 'Operations Light'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
            </div>

            {/* Live Simulation Clock Toggle */}
            <div
              onClick={toggleSimulationTimer}
              className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-[#2DD4BF]/40 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-slate-900 dark:text-white font-semibold block">Live Simulation Tick</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isSimulating ? 'Active (5s drift)' : 'Paused'}
                </span>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  isSimulating ? 'bg-[#34D399] animate-ping' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <CyberButton variant="primary" size="lg" type="submit">
            SAVE OPERATIONAL PREFERENCES
          </CyberButton>
        </div>
      </form>
    </div>
  );
};

export default Settings;
