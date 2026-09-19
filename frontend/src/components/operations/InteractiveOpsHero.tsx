import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Crosshair, Activity, ShieldAlert } from 'lucide-react';

export const InteractiveOpsHero: React.FC = () => {
  const [activeZone, setActiveZone] = useState<string>('ZONE-04 // INDUSTRIAL HAZARD');
  const [selectedUnit, setSelectedUnit] = useState<string>('ENGINE-04 [FOAM TENDER]');

  return (
    <div className="relative w-full rounded-[24px] overflow-hidden bg-slate-100 dark:bg-[#05070A] border border-slate-300 dark:border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-colors duration-200">
      {/* Top Tactical Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-300 dark:border-white/10 bg-white/95 dark:bg-[#0B0E13]/90 font-mono text-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-teal-600 dark:text-[#2DD4BF] font-semibold">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>SYSTEM OPERATIONAL</span>
          </div>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">5 ZONES MONITORED</span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-blue-600 dark:text-[#3B82F6] font-semibold">24 ACTIVE UNITS</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
          <span>
            SLA TARGET: <strong className="text-emerald-600 dark:text-[#34D399]">08 MIN</strong>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            GEO-UPLINK: <strong className="text-slate-900 dark:text-[#F5F7FA]">DELHI-METRO-GRID</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-600 dark:text-[#FB4A4A] font-bold animate-pulse">
            1 ACTIVE CRITICAL
          </span>
        </div>
      </div>

      {/* Main Tactical Map Surface Container */}
      <div className="relative w-full h-[460px] sm:h-[540px] bg-[#F1F5F9] dark:bg-[#05070A] cyber-grid overflow-hidden transition-colors duration-200">
        {/* Background Radar Sweep */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-slate-300/60 dark:border-white/5 pointer-events-none">
          <div className="absolute inset-0 rounded-full border border-dashed border-teal-500/30 dark:border-[#2DD4BF]/20 animate-radar-rotate-slow" />
          <div className="absolute inset-16 rounded-full border border-slate-300/50 dark:border-white/5" />
          <div className="absolute inset-36 rounded-full border border-slate-300/40 dark:border-white/5" />
          <div className="absolute inset-56 rounded-full border border-slate-300/30 dark:border-white/5" />
        </div>

        {/* 5 Monitored Operational Zones (Geofenced SVG polygons) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Zone 1: Downtown Core */}
          <polygon
            points="120,80 340,70 380,240 160,260"
            className="fill-blue-500/10 stroke-blue-500/40 dark:fill-[rgba(59,130,246,0.03)] dark:stroke-[rgba(59,130,246,0.2)]"
            strokeWidth="1.5"
            strokeDasharray="4, 4"
          />
          {/* Zone 2: North Sector */}
          <polygon
            points="360,60 620,50 660,200 400,220"
            className="fill-teal-500/10 stroke-teal-500/40 dark:fill-[rgba(45,212,191,0.03)] dark:stroke-[rgba(45,212,191,0.2)]"
            strokeWidth="1.5"
            strokeDasharray="4, 4"
          />
          {/* Zone 3: East River Hub */}
          <polygon
            points="680,80 920,90 890,320 660,300"
            className="fill-purple-500/10 stroke-purple-500/40 dark:fill-[rgba(124,92,252,0.03)] dark:stroke-[rgba(124,92,252,0.2)]"
            strokeWidth="1.5"
            strokeDasharray="4, 4"
          />
          {/* Zone 4: Industrial Hazard Vector (Active Incident Zone) */}
          <polygon
            points="380,260 740,240 760,460 360,480"
            className="fill-red-500/15 stroke-red-500/60 dark:fill-[rgba(251,74,74,0.06)] dark:stroke-[rgba(251,74,74,0.4)]"
            strokeWidth="2"
            strokeDasharray="6, 4"
          />
          {/* Zone 5: South Highway Corridor */}
          <polygon
            points="140,290 350,280 340,490 120,480"
            className="fill-amber-500/10 stroke-amber-500/40 dark:fill-[rgba(245,166,35,0.03)] dark:stroke-[rgba(245,166,35,0.2)]"
            strokeWidth="1.5"
            strokeDasharray="4, 4"
          />

          {/* Animated Route Lines connecting units to Incident */}
          {/* Engine 04 Route */}
          <path
            d="M 280 380 Q 420 360 520 250"
            fill="none"
            stroke="#0D9488"
            strokeWidth="2"
            strokeDasharray="6, 6"
            className="animate-route-particle"
          />
          {/* Medic 07 Route */}
          <path
            d="M 680 410 Q 640 330 520 250"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeDasharray="6, 6"
            className="animate-route-particle"
          />
        </svg>

        {/* Zone Labels (Interactive) */}
        <button
          type="button"
          onClick={() => setActiveZone('ZONE 01 // CIVIC CORE')}
          className="absolute top-24 left-36 font-mono text-[10px] text-slate-700 dark:text-slate-400 hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors tracking-wider cursor-pointer font-semibold"
        >
          ZONE 01 // CIVIC CORE
        </button>
        <button
          type="button"
          onClick={() => setActiveZone('ZONE 02 // NORTH CORRIDOR')}
          className="absolute top-20 left-[480px] font-mono text-[10px] text-slate-700 dark:text-slate-400 hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors tracking-wider cursor-pointer font-semibold"
        >
          ZONE 02 // NORTH CORRIDOR
        </button>
        <button
          type="button"
          onClick={() => setActiveZone('ZONE 03 // EAST RIVER')}
          className="absolute top-28 right-32 font-mono text-[10px] text-slate-700 dark:text-slate-400 hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors tracking-wider cursor-pointer font-semibold"
        >
          ZONE 03 // EAST RIVER
        </button>
        <button
          type="button"
          onClick={() => setActiveZone('ZONE 04 // INDUSTRIAL HAZARD (HOT ZONE)')}
          className="absolute bottom-28 left-[450px] font-mono text-[10px] text-red-600 dark:text-[#FB4A4A] tracking-wider font-bold flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-[#FB4A4A] animate-ping" />
          ZONE 04 // INDUSTRIAL HAZARD (HOT ZONE)
        </button>
        <button
          type="button"
          onClick={() => setActiveZone('ZONE 05 // LOGISTICS FREEWAY')}
          className="absolute bottom-24 left-44 font-mono text-[10px] text-slate-700 dark:text-slate-400 hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors tracking-wider cursor-pointer font-semibold"
        >
          ZONE 05 // LOGISTICS FREEWAY
        </button>

        {/* ACTIVE INCIDENT TARGET: INC-2048 (Center of Zone 4) */}
        <div
          className="absolute z-30 cursor-pointer"
          style={{ top: '46%', left: '52%', transform: 'translate(-50%, -50%)' }}
          onClick={() => {
            setActiveZone('ZONE 04 // INDUSTRIAL HAZARD (HOT ZONE)');
            setSelectedUnit('INCIDENT INC-2048 [P1 CRITICAL]');
          }}
        >
          <div className="relative flex flex-col items-center group">
            {/* Concentric expanding red radar rings */}
            <div className="absolute -inset-8 rounded-full border border-red-500/50 animate-signal-pulse" />
            <div className="absolute -inset-4 rounded-full bg-red-500/25 animate-ping" />

            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-[#1A0808] border-2 border-red-600 dark:border-[#FB4A4A] shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-[#FB4A4A] animate-pulse" />
            </div>

            {/* Incident Technical Readout Overlay */}
            <div className="mt-2 p-2.5 rounded-xl bg-white/95 dark:bg-[#0B0E13]/95 backdrop-blur-xl border border-red-500/40 shadow-2xl font-mono text-left w-56">
              <div className="flex items-center justify-between text-[10px] font-bold text-red-600 dark:text-[#FB4A4A] pb-1 mb-1 border-b border-slate-200 dark:border-white/10">
                <span>INC-2048 [P1 CRITICAL]</span>
                <span className="animate-pulse">EVAC 750m</span>
              </div>
              <div className="text-xs font-sans font-bold text-slate-900 dark:text-white leading-snug">
                Industrial Chemical Fire
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Sector 4 • Toxic Vapor Plume
              </div>
              <div className="mt-2 pt-1 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[9px] text-teal-700 dark:text-[#2DD4BF] font-semibold">
                <span>LAT 22.3072 N</span>
                <span>LON 73.1812 E</span>
              </div>
            </div>
          </div>
        </div>

        {/* RESPONDER UNIT MARKERS IN TRANSIT */}
        {/* Unit 1: Engine 04 */}
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute z-20 cursor-pointer"
          style={{ top: '64%', left: '28%' }}
          onClick={() => setSelectedUnit('ENGINE-04 (FOAM TENDER)')}
        >
          <div className={`p-2 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border ${selectedUnit.includes('ENGINE') ? 'border-teal-600 dark:border-[#2DD4BF] ring-2 ring-teal-500/40' : 'border-teal-500/40 dark:border-[#2DD4BF]/50'} shadow-lg font-mono text-[10px] text-slate-900 dark:text-white flex items-center gap-2 hover:scale-105 transition-transform`}>
            <div className="w-2 h-2 rounded-full bg-teal-500 dark:bg-[#2DD4BF] animate-ping" />
            <div>
              <div className="font-bold text-teal-700 dark:text-[#2DD4BF]">ENGINE-04</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">ETA: 04:12 • FOAM</div>
            </div>
          </div>
        </motion.div>

        {/* Unit 2: Medic 07 */}
        <motion.div
          animate={{ x: [0, -12, 0], y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute z-20 cursor-pointer"
          style={{ top: '68%', left: '68%' }}
          onClick={() => setSelectedUnit('MEDIC-07 (TRAUMA ICU)')}
        >
          <div className={`p-2 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border ${selectedUnit.includes('MEDIC') ? 'border-emerald-600 dark:border-[#34D399] ring-2 ring-emerald-500/40' : 'border-emerald-500/40 dark:border-[#34D399]/50'} shadow-lg font-mono text-[10px] text-slate-900 dark:text-white flex items-center gap-2 hover:scale-105 transition-transform`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#34D399] animate-ping" />
            <div>
              <div className="font-bold text-emerald-700 dark:text-[#34D399]">MEDIC-07</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">ETA: 06:45 • TRAUMA</div>
            </div>
          </div>
        </motion.div>

        {/* Unit 3: FLIR Drone 03 */}
        <motion.div
          animate={{ x: [0, 8, 0], y: [0, 8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute z-20 cursor-pointer"
          style={{ top: '34%', left: '58%' }}
          onClick={() => setSelectedUnit('DRONE-03 (FLIR OVERWATCH)')}
        >
          <div className={`p-1.5 rounded-lg bg-white/95 dark:bg-[#0B0E13]/90 border ${selectedUnit.includes('DRONE') ? 'border-purple-600 dark:border-[#7C5CFC] ring-2 ring-purple-500/40' : 'border-purple-500/40 dark:border-[#7C5CFC]/50'} shadow-lg font-mono text-[9px] text-purple-700 dark:text-[#A78BFA] flex items-center gap-1.5 hover:scale-105 transition-transform`}>
            <Crosshair className="w-3 h-3 text-purple-600 dark:text-[#A78BFA] animate-spin" />
            <span className="font-bold">DRONE-03 // +485°C</span>
          </div>
        </motion.div>

        {/* Bottom Left Floating Tactical HUD Card */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:block p-3.5 rounded-2xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 backdrop-blur-xl font-mono text-xs shadow-xl">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-[#2DD4BF]" />
            ACTIVE TELEMETRY STREAM
          </div>
          <div className="text-slate-900 dark:text-white font-bold">{activeZone}</div>
          <div className="text-[11px] text-teal-700 dark:text-[#2DD4BF] mt-0.5">
            TARGET: <span className="text-slate-900 dark:text-[#F5F7FA] font-bold">{selectedUnit}</span> • LATENCY: 14ms
          </div>
        </div>

        {/* Bottom Right GIS Controls HUD */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 p-1.5 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 backdrop-blur-xl font-mono text-xs shadow-xl">
          <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold">LAYERS: 6</span>
          <span className="px-2 py-1 rounded bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] font-bold">
            SATELLITE: LIVE
          </span>
        </div>
      </div>
    </div>
  );
};
