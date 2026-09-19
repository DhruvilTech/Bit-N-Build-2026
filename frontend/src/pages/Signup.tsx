import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio,
  Compass,
  Stethoscope,
  Lock,
  User,
  Mail,
  KeyRound,
  Building2,
  Badge,
  Phone,
  ArrowRight,
  Sun,
  Moon,
  Home,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  LogIn,
} from 'lucide-react';
import { GlowButton } from '../components/ui/GlowButton';
import { RadarBackground } from '../components/ui/RadarBackground';
import { SplitCursor } from '../components/ui/SplitCursor';
import { soundFx } from '../utils/audio';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';

type SignupRole = 'OPERATOR' | 'FIELD_COORDINATOR' | 'MEDICAL_COORDINATOR';

interface RoleDefinition {
  id: SignupRole;
  slug: string;
  title: string;
  callSign: string;
  badgeCode: string;
  defaultDepartment: string;
  icon: any;
  colorClasses: {
    border: string;
    bg: string;
    text: string;
    badge: string;
    activeBorder: string;
  };
  description: string;
  permissions: string[];
}

const SIGNUP_ROLES: RoleDefinition[] = [
  {
    id: 'OPERATOR',
    slug: 'operator',
    title: 'Emergency Operator',
    callSign: 'CENTRAL DISPATCH',
    badgeCode: 'BADGE-OP',
    defaultDepartment: 'Emergency Telemetry & 911 Intake',
    icon: Radio,
    colorClasses: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-500 dark:text-cyan-400',
      badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
      activeBorder: 'border-cyan-500 shadow-[0_0_20px_rgba(0,217,255,0.25)]',
    },
    description: 'Central intake, 911 sensor telemetry triage, and rapid resource dispatch.',
    permissions: [
      'Multi-source incident creation & triage',
      'Resource & response team dispatch',
      'Incident lifecycle management',
      'Real-time situational map access',
    ],
  },
  {
    id: 'FIELD_COORDINATOR',
    slug: 'field',
    title: 'Field Coordinator',
    callSign: 'TACTICAL FORCES',
    badgeCode: 'BADGE-FC',
    defaultDepartment: 'Fire & Urban Rescue Brigade',
    icon: Compass,
    colorClasses: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      text: 'text-blue-500 dark:text-blue-400',
      badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
      activeBorder: 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)]',
    },
    description: 'Direct first-responder leadership, on-scene coordination, and mobile GPS telemetry.',
    permissions: [
      'Field team check-in & GPS updates',
      'On-scene situation assessments',
      'Equipment deployment tracking',
      'Direct command radio telemetry',
    ],
  },
  {
    id: 'MEDICAL_COORDINATOR',
    slug: 'medical',
    title: 'Medical Coordinator',
    callSign: 'HEALTH NETWORK',
    badgeCode: 'BADGE-MC',
    defaultDepartment: 'Emergency Trauma & Hospital Network',
    icon: Stethoscope,
    colorClasses: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500 dark:text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      activeBorder: 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    },
    description: 'Hospital bed capacity orchestration, critical ICU surge, and trauma ambulance routing.',
    permissions: [
      'Hospital & facility bed capacity management',
      'Critical surge & divert status control',
      'Patient routing to nearest trauma centers',
      'Emergency medical supply tracking',
    ],
  },
];

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { roleParam } = useParams<{ roleParam?: string }>();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useEmergency();
  const { register, user } = useAuth();

  // If already logged in, redirect to command center
  useEffect(() => {
    if (user) {
      navigate('/command-center', { replace: true });
    }
  }, [user, navigate]);

  // Determine initial role from URL param or query string
  const initialRole: SignupRole = (() => {
    const queryRole = searchParams.get('role')?.toUpperCase();
    if (queryRole === 'OPERATOR' || queryRole === 'FIELD_COORDINATOR' || queryRole === 'MEDICAL_COORDINATOR') {
      return queryRole;
    }
    if (roleParam) {
      const lower = roleParam.toLowerCase();
      if (lower === 'field' || lower === 'field-coordinator' || lower === 'field_coordinator') return 'FIELD_COORDINATOR';
      if (lower === 'medical' || lower === 'medical-coordinator' || lower === 'medical_coordinator') return 'MEDICAL_COORDINATOR';
      if (lower === 'operator') return 'OPERATOR';
    }
    return 'OPERATOR';
  })();

  const [selectedRole, setSelectedRole] = useState<SignupRole>(initialRole);
  const activeRoleDef = SIGNUP_ROLES.find((r) => r.id === selectedRole) || SIGNUP_ROLES[0];

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [department, setDepartment] = useState<string>(activeRoleDef.defaultDepartment);
  const [badgeNumber, setBadgeNumber] = useState<string>(
    `${activeRoleDef.badgeCode}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [phone, setPhone] = useState<string>('+1 (555) 019-2834');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update default department and badge prefix when changing role
  const handleRoleChange = (newRole: SignupRole) => {
    soundFx.playClick();
    setSelectedRole(newRole);
    const def = SIGNUP_ROLES.find((r) => r.id === newRole) || SIGNUP_ROLES[0];
    setDepartment(def.defaultDepartment);
    setBadgeNumber(`${def.badgeCode}-${Math.floor(100 + Math.random() * 900)}`);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!name.trim()) {
      setErrorMessage('Please provide your official cadet full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid official email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Clearance key (password) must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    soundFx.playDispatch();
    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
        department: department.trim(),
        badgeNumber: badgeNumber.trim(),
        phone: phone.trim(),
      });

      soundFx.playClick();
      navigate('/command-center', { replace: true });
    } catch (err: any) {
      soundFx.playEmergencyAlert();
      setErrorMessage(err.message || 'Cadet registration rejected by command server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#05070D] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-hidden transition-colors duration-500">
      <SplitCursor />
      <RadarBackground opacity={theme === 'dark' ? 0.35 : 0.2} />

      {/* Top Utility Bar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 backdrop-blur-md shadow-sm transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-amber-400 hover:scale-105 backdrop-blur-md shadow-sm transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative z-20 w-full max-w-6xl my-8">
        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            OFFICIAL CADET ENLISTMENT // EmergenX
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white tracking-wide">
            ROLE-BASED CLEARANCE REGISTRATION
          </h1>
          <p className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-2">
            Select your operational designation. Your clearance determines tactical console controls, telemetry channels, and field dispatch authorization.
          </p>
        </div>

        {/* Step 1: Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {SIGNUP_ROLES.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedRole === r.id;
            return (
              <div
                key={r.id}
                onClick={() => handleRoleChange(r.id)}
                className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 backdrop-blur-xl border ${
                  isSelected
                    ? `${r.colorClasses.activeBorder} bg-white/95 dark:bg-[#090E1A]/95 shadow-xl scale-[1.02]`
                    : 'bg-white/70 dark:bg-[#070A12]/70 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SELECTED</span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${r.colorClasses.bg} border ${r.colorClasses.border} flex items-center justify-center ${r.colorClasses.text}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono tracking-wider uppercase text-slate-500 dark:text-slate-400">
                      {r.callSign}
                    </div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {r.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mb-3 line-clamp-2">
                  {r.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/5">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    OPERATIONAL CLEARANCE:
                  </div>
                  {r.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                      <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                      <span className="truncate">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 2: Enlistment Registration Form */}
        <div className="rounded-2xl bg-white/90 dark:bg-[#080B12]/90 border border-slate-200 dark:border-white/15 p-6 sm:p-8 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(0,217,255,0.1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-6 gap-2">
            <div>
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <activeRoleDef.icon className={`w-5 h-5 ${activeRoleDef.colorClasses.text}`} />
                <span>{activeRoleDef.title} Clearance Form</span>
              </h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                PROVIDE VERIFIED IDENTIFICATION & CREATE CREDENTIALS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${activeRoleDef.colorClasses.badge}`}>
                ROLE: {activeRoleDef.id}
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300 font-mono text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cadet Name */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  OFFICIAL FULL NAME *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Officer Alex Hayes"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Cadet Email */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  OFFICIAL CADET EMAIL (FOR LOGIN) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex.hayes@emergency.ps9.gov"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  SECURITY CLEARANCE KEY (PASSWORD) *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  CONFIRM CLEARANCE KEY *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Assigned Department */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  ASSIGNED UNIT / DEPARTMENT
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Badge Number */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  BADGE NUMBER / CALL SIGN
                </label>
                <div className="relative">
                  <Badge className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Direct Phone */}
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                DIRECT TACTICAL COMM PHONE (OPTIONAL)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                />
              </div>
            </div>

            {/* Notice Note */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 font-mono text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Security verification is enforced through cryptographic TLS 1.3 audit logs.</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold">256-BIT RBAC</span>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <GlowButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="w-full"
                icon={
                  isSubmitting ? (
                    <Cpu className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )
                }
              >
                {isSubmitting ? 'ENLISTING CADET IN MESH...' : `CONFIRM ${activeRoleDef.title.toUpperCase()} REGISTRATION`}
              </GlowButton>
            </div>

            {/* Sign in Navigation Link */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-center">
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Already hold an active badge clearance?{' '}
                <Link
                  to="/login"
                  onClick={() => soundFx.playClick()}
                  className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1 ml-1"
                >
                  <LogIn className="w-3.5 h-3.5 inline" />
                  <span>Sign In to Console</span>
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
