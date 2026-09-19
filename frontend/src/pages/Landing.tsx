import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Flame,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Users,
  Building2,
  Cpu,
  Layers,
  BarChart3,
  Zap,
  Sun,
  Moon,
  Crosshair,
  Wifi,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { GlowButton } from '../components/ui/GlowButton';
import { RadarBackground } from '../components/ui/RadarBackground';
import { SplitCursor } from '../components/ui/SplitCursor';
import { useEmergency } from '../context/EmergencyContext';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useEmergency();

  const workflowSteps = [
    { title: 'DETECT', desc: 'IoT acoustic sensors & 911 calls', icon: PhoneCall, color: 'text-cyan-500 dark:text-cyan-400' },
    { title: 'CLASSIFY', desc: 'AI NLP extraction & triage', icon: Cpu, color: 'text-purple-500 dark:text-purple-400' },
    { title: 'PRIORITIZE', desc: 'Severity matrix scoring (P1-P4)', icon: Shield, color: 'text-red-500 dark:text-red-400' },
    { title: 'RECOMMEND', desc: 'Optimal vehicle capability match', icon: Users, color: 'text-amber-500 dark:text-amber-400' },
    { title: 'DISPATCH', desc: 'Automated telemetry routing', icon: Zap, color: 'text-emerald-500 dark:text-emerald-400' },
    { title: 'MONITOR', desc: 'Real-time GPS & SLA escalation', icon: Activity, color: 'text-blue-500 dark:text-blue-400' },
    { title: 'ANALYZE', desc: 'Post-event debrief & audit log', icon: BarChart3, color: 'text-pink-500 dark:text-pink-400' },
  ];

  const capabilities = [
    {
      title: 'Incident Telemetry & Sensor Fusion',
      desc: 'Centralizes citizen emergency calls, seismic sensors, IoT acoustic detectors, and aerial drone surveillance into unified incident clusters.',
      icon: Radio,
    },
    {
      title: 'Autonomous Deep Learning Triage',
      desc: 'Real-time classification models calculate severity, hazard perimeter expansion, and confidence levels with 94%+ verified accuracy.',
      icon: Cpu,
    },
    {
      title: 'Intelligent Resource Optimization',
      desc: 'Algorithms compute nearest apparatus availability, specialized capacity (industrial foam, trauma surgeons), and fastest transit corridors.',
      icon: Users,
    },
    {
      title: 'Real-Time Geospatial Tactical Map',
      desc: 'High-density GIS overlays render hazard blast radiuses, traffic choke points, field fleet telemetry, and hospital ICU saturation.',
      icon: Layers,
    },
    {
      title: 'Predictive Response Delay Detection',
      desc: 'Real-time SLA monitors detect transit deviations, triggering automatic escalation to regional mutual aid before seconds turn critical.',
      icon: Activity,
    },
    {
      title: 'Operational Audit & Analytics',
      desc: 'Defense-grade post-incident metrics on response latency, hospital bed turnover, and apparatus allocation across jurisdictional zones.',
      icon: BarChart3,
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#060911] dark:text-slate-100 selection:bg-cyan-500/25 selection:text-cyan-800 dark:selection:text-cyan-300 overflow-x-hidden transition-colors duration-200">
      <SplitCursor />
      <RadarBackground opacity={0.35} />

      {/* Navigation Bar */}
      <nav className="relative z-30 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[0_0_20px_rgba(0,212,255,0.25)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-wider text-slate-900 dark:text-white">
              PS-9 PLATFORM
            </span>
            <span className="block text-[10px] font-mono text-cyan-600 dark:text-cyan-400 tracking-tight">
              AUTONOMOUS EMERGENCY INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to White Theme' : 'Switch to Dark Theme'}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 transition-colors hidden sm:block"
          >
            Operator Sign In
          </button>

          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 px-3 py-2 transition-colors hidden sm:block"
          >
            Enlist Clearance
          </button>

          <GlowButton
            variant="primary"
            size="sm"
            onClick={() => navigate('/command-center')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            COMMAND CENTER
          </GlowButton>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 pt-8 sm:pt-14 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-mono mb-6 shadow-sm dark:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>INTELLIGENT EMERGENCY RESPONSE & RESOURCE COORDINATION PLATFORM</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.08] mb-6"
        >
          INTELLIGENT CRISIS <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-sky-300 dark:to-blue-500">
            RESPONSE COMMAND
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-sans leading-relaxed mb-8"
        >
          A unified defense-grade operations center synchronizing telemetry sensors, emergency 911 calls,
          first responder fleets, and regional hospital capacities with real-time AI triage and autonomous dispatch.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-14"
        >
          <GlowButton
            variant="primary"
            size="lg"
            onClick={() => navigate('/command-center')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            LAUNCH COMMAND CENTER
          </GlowButton>
          <GlowButton
            variant="secondary"
            size="lg"
            onClick={() => {
              const el = document.getElementById('convergence-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            SYSTEM ARCHITECTURE
          </GlowButton>
        </motion.div>

        {/* Photorealistic Command Center Hero Visual with HUD Overlay */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="relative max-w-5xl mx-auto rounded-2xl p-1 bg-gradient-to-b from-cyan-500/30 via-slate-200 dark:via-white/10 to-transparent shadow-2xl dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)]"
        >
          <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-white/15 relative group">
            {/* Real Command Center Operations Image */}
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img
                src="/assets/command_center_hero.jpg"
                alt="National Emergency Operations Command Center"
                className="w-full h-full object-cover object-center filter brightness-[0.95] contrast-[1.05] transition-transform duration-700 group-hover:scale-105"
              />

              {/* Animated HUD Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/60 pointer-events-none" />

              {/* Top HUD Telemetry Bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between px-4 py-2 rounded-lg bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-white font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-cyan-300 font-semibold">NEOCC SECTOR 09 • LIVE TELEMETRY</span>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-cyan-400" /> SATELLITE LINK 100%
                  </span>
                  <span>LAT: 37.7749° N, LNG: -122.4194° W</span>
                </div>
              </div>

              {/* Floating Interactive Incident Cards Overlaid on Hero Image */}
              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-red-500/40 text-white shadow-lg">
                  <div className="flex items-center justify-between text-xs font-mono text-red-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> #ER-2048
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">P1 CRITICAL</span>
                  </div>
                  <div className="text-sm font-semibold mb-0.5">Apex Petrochemical Fire</div>
                  <div className="text-[11px] text-slate-400 font-mono">Team FT-04 Dispatched • Foam Tender 7</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 text-white shadow-lg">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> AI TRIAGE ENGINE
                    </span>
                    <span className="text-cyan-300 font-bold">94% CONFIDENCE</span>
                  </div>
                  <div className="text-sm font-semibold mb-0.5">Dual-Unit Mobilization</div>
                  <div className="text-[11px] text-slate-400 font-mono">Hazmat containment + Trauma diversion</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 text-white shadow-lg">
                  <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> TRAUMA NETWORK
                    </span>
                    <span className="text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                  <div className="text-sm font-semibold mb-0.5">Regional General Hospital</div>
                  <div className="text-[11px] text-slate-400 font-mono">18 ICU Beds • Burn Ward Mobilized</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Disconnected Sources Convergence Section */}
      <section id="convergence-section" className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono text-red-600 dark:text-red-400 uppercase tracking-widest block mb-2 font-bold">
            The Problem We Solve
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-4">
            Disconnected Data Causes Catastrophic Delays
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            During major emergencies, crucial data is fragmented across 911 dispatch, traffic sensors, weather radar,
            and hospital boards. PS-9 unifies them into a single, synchronized tactical intelligence stream.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-14 text-center">
          {[
            { title: 'Citizen Reports', icon: Users, count: '14 Active Inquiries' },
            { title: 'Emergency 911', icon: PhoneCall, count: '28 Priority Lines' },
            { title: 'IoT Sensors', icon: Activity, count: '140 Acoustic Probes' },
            { title: 'Field Response', icon: Shield, count: '8 Deployed Units' },
            { title: 'Trauma Centers', icon: Building2, count: '8 Hospital Systems' },
          ].map((source, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all backdrop-blur-md"
            >
              <source.icon className="w-6 h-6 mx-auto text-cyan-600 dark:text-cyan-400 mb-2" />
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">{source.title}</div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{source.count}</div>
            </div>
          ))}
        </div>

        {/* Dual Visual Feature: Satellite GIS & Drone Thermal Scan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Tactical GIS Map Visual */}
          <div className="rounded-2xl p-1 bg-gradient-to-br from-cyan-500/20 to-transparent border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[16/10]">
              <img
                src="/assets/tactical_gis_map.jpg"
                alt="Defense Grade Tactical GIS Satellite Map"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
              <div className="absolute top-3 left-3 px-3 py-1 rounded bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 font-mono text-xs">
                SATELLITE RECON • SECTOR D4
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="font-semibold text-sm">Automated Hazard Perimeter Heatmap</div>
                <div className="text-xs text-slate-300 font-mono">Infrared thermal telemetry with dynamic evacuation corridors</div>
              </div>
            </div>
          </div>

          {/* Drone Thermal Camera Scan */}
          <div className="rounded-2xl p-1 bg-gradient-to-br from-red-500/20 to-transparent border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[16/10]">
              <img
                src="/assets/drone_thermal_feed.jpg"
                alt="Search and Rescue Drone Thermal Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
              <div className="absolute top-3 left-3 px-3 py-1 rounded bg-slate-950/80 backdrop-blur-md border border-red-500/40 text-red-300 font-mono text-xs">
                FLIR DRONE CAM • FIRE_HAWK_03
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
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
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-2 font-bold">
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
              className="p-4 rounded-xl bg-white dark:bg-[#0B1018]/70 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">0{idx + 1}</span>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <div className="font-mono font-bold text-xs text-slate-900 dark:text-white tracking-wider mb-1">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {step.desc}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono text-purple-600 dark:text-purple-400 uppercase tracking-widest block mb-2 font-bold">
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
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-[#0B1018]/70 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <cap.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{cap.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>

        {/* Emergency Fleet Section with Photorealistic Asset */}
        <div className="rounded-2xl p-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-emerald-500/20 border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center bg-white dark:bg-[#0A0F1D] rounded-xl overflow-hidden">
            <div className="p-8 lg:p-10">
              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-bold block mb-2">
                FLEET & EQUIPMENT READINESS
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white mb-4">
                Automated Apparatus Staging & Capability Matching
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                From specialized heavy foam tenders to mobile intensive care ambulances, PS-9 maintains millisecond synchronization
                with field apparatus status, fuel capacity, crew skill rosters, and radio telemetry channels.
              </p>
              <div className="grid grid-cols-2 gap-4 font-mono text-xs mb-6">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">AVG DISPATCH TIME</div>
                  <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">14.2 SEC</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">ROUTE OPTIMIZATION</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">-34% TRANSIT</div>
                </div>
              </div>
              <GlowButton
                variant="primary"
                size="md"
                onClick={() => navigate('/resources')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                VIEW FLEET ASSETS
              </GlowButton>
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
        <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-b from-cyan-500/10 via-slate-100 dark:via-white/[0.03] to-transparent border border-slate-200 dark:border-white/10 shadow-2xl">
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 tracking-widest uppercase font-bold block mb-3">
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
            <GlowButton
              variant="primary"
              size="lg"
              onClick={() => navigate('/command-center')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              LAUNCH PS-9 DASHBOARD
            </GlowButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-200 dark:border-white/10 py-8 px-6 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>PS-9 INTELLIGENT EMERGENCY RESPONSE PLATFORM • BIT-N-BUILD 2026</div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>NODE.JS • EXPRESS • MONGO • REACT</span>
            <span>REST API OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
