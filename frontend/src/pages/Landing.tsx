import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Users,
  Cpu,
  Layers,
  BarChart3,
  Zap,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberHUDCard } from '../components/ui/CyberHUDCard';
import { TextScramble } from '../components/motion/TextScramble';
import { InteractiveOpsHero } from '../components/operations/InteractiveOpsHero';
import { EmergencyNetwork } from '../components/operations/EmergencyNetwork';
import { CursorGrid } from '../components/ui/CursorGrid';
import { EmergenXLogo } from '../components/ui/EmergenXLogo';
import { useEmergency } from '../context/EmergencyContext';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useEmergency();

  const workflowSteps = [
    { title: 'DETECT', desc: 'IoT acoustic sensors & 911 calls', icon: PhoneCall, color: 'text-[#2DD4BF]' },
    { title: 'CLASSIFY', desc: 'AI NLP extraction & triage', icon: Cpu, color: 'text-[#A78BFA]' },
    { title: 'PRIORITIZE', desc: 'Severity matrix scoring (P1-P4)', icon: Shield, color: 'text-[#FB4A4A]' },
    { title: 'RECOMMEND', desc: 'Optimal vehicle capability match', icon: Users, color: 'text-[#F5A623]' },
    { title: 'DISPATCH', desc: 'Automated telemetry routing', icon: Zap, color: 'text-[#34D399]' },
    { title: 'MONITOR', desc: 'Real-time GPS & SLA escalation', icon: Activity, color: 'text-[#3B82F6]' },
    { title: 'ANALYZE', desc: 'Post-event debrief & audit log', icon: BarChart3, color: 'text-[#EC4899]' },
  ];

  const capabilities = [
    {
      title: 'Incident Telemetry & Sensor Fusion',
      desc: 'Centralizes citizen emergency calls, seismic sensors, IoT acoustic detectors, and aerial drone surveillance into unified incident clusters.',
      icon: Radio,
      variant: 'default' as const,
      tag: 'TELEMETRY-FUSION',
    },
    {
      title: 'Autonomous Deep Learning Triage',
      desc: 'Real-time classification models calculate severity, hazard perimeter expansion, and confidence levels with 94%+ verified accuracy.',
      icon: Cpu,
      variant: 'ai' as const,
      tag: 'NEURAL-CLASSIFIER',
    },
    {
      title: 'Intelligent Resource Optimization',
      desc: 'Algorithms compute nearest apparatus availability, specialized capacity (industrial foam, trauma surgeons), and fastest transit corridors.',
      icon: Users,
      variant: 'default' as const,
      tag: 'DISPATCH-MATRIX',
    },
    {
      title: 'Real-Time Geospatial Tactical Map',
      desc: 'High-density GIS overlays render hazard blast radiuses, traffic choke points, field fleet telemetry, and hospital ICU saturation.',
      icon: Layers,
      variant: 'info' as const,
      tag: 'GIS-CORRIDOR',
    },
    {
      title: 'Predictive Response Delay Detection',
      desc: 'Real-time SLA monitors detect transit deviations, triggering automatic escalation to regional mutual aid before seconds turn critical.',
      icon: Activity,
      variant: 'warning' as const,
      tag: 'SLA-MONITOR',
    },
    {
      title: 'Defense-Grade Audit & Analytics',
      desc: 'Cryptographic post-incident metrics on response latency, hospital bed turnover, and apparatus allocation across jurisdictional zones.',
      icon: BarChart3,
      variant: 'default' as const,
      tag: 'AUDIT-LOG',
    },
  ];

  return (
    <div className="relative min-h-screen atmospheric-bg text-slate-900 dark:text-[#F5F7FA] selection:bg-[#2DD4BF]/25 selection:text-teal-700 dark:selection:text-[#5EEAD4] overflow-x-hidden transition-colors duration-200">
      {/* Interactive Cursor Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <CursorGrid
          cellSize={64}
          color="#2DD4BF"
          radius={160}
          falloff="smooth"
          holdTime={400}
          fadeDuration={800}
          lineWidth={1.2}
          maxOpacity={0.65}
          fillOpacity={0.08}
          gridOpacity={0.03}
          cellRadius={4}
          clickPulse={true}
          pulseSpeed={650}
          globalPointer={true}
        />
      </div>

      {/* Background Ambient Node Network */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <EmergencyNetwork nodeCount={24} opacity={0.3} />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-30 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EmergenXLogo size={42} />
          <div>
            <span className="font-display font-bold text-lg tracking-wider text-slate-900 dark:text-white">
              EmergenX
            </span>
            <span className="block text-[10px] font-mono text-teal-600 dark:text-[#2DD4BF] font-semibold tracking-tight">
              AUTONOMOUS EMERGENCY INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Command Theme'}
            className="p-2.5 rounded-xl text-slate-700 hover:text-amber-500 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:text-amber-400 shadow-sm transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="text-xs font-mono font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-3 py-2 transition-colors hidden sm:block"
          >
            Operator Sign In
          </button>

          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-mono font-semibold text-teal-600 dark:text-[#2DD4BF] hover:underline px-3 py-2 transition-colors hidden sm:block"
          >
            Enlist Clearance
          </button>

          <CyberButton
            variant="primary"
            size="sm"
            onClick={() => navigate('/command-center')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            COMMAND CENTER
          </CyberButton>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 pt-8 sm:pt-14 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-[#2DD4BF] text-xs font-mono mb-6 shadow-[0_0_15px_rgba(45,212,191,0.2)] font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-[#2DD4BF]" />
          <span>INTELLIGENT EMERGENCY RESPONSE & RESOURCE COORDINATION PLATFORM</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.08] mb-6"
        >
          <TextScramble text="MISSION CONTROL FOR" duration={450} /> <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-blue-600 to-indigo-600 dark:from-[#2DD4BF] dark:via-[#60A5FA] dark:to-[#7C5CFC]">
            EMERGENCY RESPONSE
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10 font-sans font-medium"
        >
          Defense-grade geospatial command center fusing multi-source telemetry, autonomous AI triage, and real-time fleet dispatch to coordinate lifesaving operations during urban disasters.
        </motion.p>

        {/* INTERACTIVE EMERGENCY OPERATIONS CENTERPIECE */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-16"
        >
          <InteractiveOpsHero />
        </motion.div>

        {/* Dual Visual Feature: Satellite GIS & Drone Thermal Scan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Tactical GIS Map Visual */}
          <div className="rounded-2xl p-1 bg-gradient-to-br from-teal-500/20 to-transparent border border-slate-300 dark:border-white/10 shadow-xl overflow-hidden">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[16/10]">
              <img
                src="/assets/tactical_gis_map.jpg"
                alt="Defense Grade Tactical GIS Satellite Map"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/40" />
              <div className="absolute top-3 left-3 px-3 py-1 rounded bg-slate-950/90 backdrop-blur-md border border-[#2DD4BF]/40 text-[#2DD4BF] font-mono text-xs font-semibold">
                SATELLITE RECON • SECTOR D4
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white text-left">
                <div className="font-semibold text-sm">Automated Hazard Perimeter Heatmap</div>
                <div className="text-xs text-slate-300 font-mono">Infrared thermal telemetry with dynamic evacuation corridors</div>
              </div>
            </div>
          </div>

          {/* Drone Thermal Camera Scan */}
          <div className="rounded-2xl p-1 bg-gradient-to-br from-red-500/20 to-transparent border border-slate-300 dark:border-white/10 shadow-xl overflow-hidden">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[16/10]">
              <img
                src="/assets/drone_thermal_feed.jpg"
                alt="Search and Rescue Drone Thermal Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/40" />
              <div className="absolute top-3 left-3 px-3 py-1 rounded bg-slate-950/90 backdrop-blur-md border border-red-500/40 text-[#FB4A4A] font-mono text-xs font-semibold">
                FLIR DRONE CAM • FIRE_HAWK_03
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white text-left">
                <div className="font-semibold text-sm">Industrial Heat Signature Telemetry</div>
                <div className="text-xs text-slate-300 font-mono">Target Lock: +485°C • Toxic vapor plume model active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7-Step Autonomous Workflow Pipeline */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono text-teal-600 dark:text-[#2DD4BF] uppercase tracking-widest block mb-2 font-bold">
            Autonomous Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-4">
            End-to-End Incident Lifecycle in Seconds
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            From initial multi-sensor detection to post-action debriefing, every second is optimized for saving lives.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {workflowSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white dark:bg-[#0B1018]/80 border border-slate-300 dark:border-white/10 shadow-md hover:border-teal-500/50 dark:hover:border-[#2DD4BF]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-slate-500">0{idx + 1}</span>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <div className="font-mono font-bold text-xs text-slate-900 dark:text-white tracking-wider mb-1">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  {step.desc}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-[#34D399] font-bold">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-slate-300 dark:border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono text-purple-600 dark:text-[#7C5CFC] uppercase tracking-widest block mb-2 font-bold">
            Platform Modules
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-4">
            Built for High-Stakes Disaster Operations
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            Engineered according to Incident Command System (ICS) standards for urban search and rescue, hazardous materials, and multi-agency mutual aid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {capabilities.map((cap, i) => (
            <CyberHUDCard
              key={i}
              variant={cap.variant}
              telemetryCode={cap.tag}
              telemetryLabel="SYSTEM VERIFIED"
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-[#2DD4BF] mb-4">
                  <cap.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{cap.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            </CyberHUDCard>
          ))}
        </div>

        {/* Emergency Fleet Section with Photorealistic Asset */}
        <div className="rounded-2xl p-1 bg-gradient-to-r from-blue-500/20 via-teal-500/20 to-emerald-500/20 border border-slate-300 dark:border-white/10 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center bg-[#0A0F1D] text-white rounded-xl overflow-hidden">
            <div className="p-8 lg:p-10 text-left">
              <span className="text-xs font-mono text-[#2DD4BF] uppercase tracking-wider font-bold block mb-2">
                FLEET & EQUIPMENT READINESS
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4">
                Automated Apparatus Staging & Capability Matching
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                From specialized heavy foam tenders to mobile intensive care ambulances, EmergenX maintains millisecond synchronization
                with field apparatus status, fuel capacity, crew skill rosters, and radio telemetry channels.
              </p>
              <div className="grid grid-cols-2 gap-4 font-mono text-xs mb-6">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-slate-400 text-[10px]">AVG DISPATCH TIME</div>
                  <div className="text-lg font-bold text-[#2DD4BF]">14.2 SEC</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-slate-400 text-[10px]">ROUTE OPTIMIZATION</div>
                  <div className="text-lg font-bold text-[#34D399]">-34% TRANSIT</div>
                </div>
              </div>
              <CyberButton
                variant="primary"
                size="md"
                onClick={() => navigate('/resources')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                VIEW FLEET ASSETS
              </CyberButton>
            </div>
            <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full w-full overflow-hidden">
              <img
                src="/assets/emergency_fleet_ops.jpg"
                alt="Emergency Response Heavy Foam Tender & Rescue Units"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="relative z-20 max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-b from-teal-500/10 via-slate-100 dark:via-white/[0.03] to-transparent border border-slate-300 dark:border-white/10 shadow-2xl">
          <span className="text-xs font-mono text-teal-600 dark:text-[#2DD4BF] tracking-widest uppercase font-bold block mb-3">
            DEPLOYED FOR BIT-N-BUILD 2026
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Test the Live Emergency Operations Console
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Experience real-time interactive incident simulation, automated AI resource dispatch recommendations,
            tactical GPS telemetry maps, and trauma hospital capacity tracking.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <CyberButton
              variant="primary"
              size="lg"
              onClick={() => navigate('/command-center')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              LAUNCH EmergenX DASHBOARD
            </CyberButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-300 dark:border-white/10 py-8 px-6 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>EmergenX • INTELLIGENT EMERGENCY RESPONSE PLATFORM • BIT-N-BUILD 2026</div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>REST API OPERATIONAL</span>
            <span>•</span>
            <span className="text-teal-600 dark:text-[#2DD4BF] font-semibold">SEC-OPS CERTIFIED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
