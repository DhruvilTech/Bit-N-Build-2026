import React, { useState } from 'react';
import { CyberHUDCard } from '../components/ui/CyberHUDCard';
import { CyberButton } from '../components/ui/CyberButton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TelemetryLabel } from '../components/ui/TelemetryLabel';
import { TextScramble } from '../components/motion/TextScramble';
import { MagneticButton } from '../components/motion/MagneticButton';
import { RadarPulse } from '../components/operations/RadarPulse';
import { IncidentMarker } from '../components/operations/IncidentMarker';
import { ResponderMarker } from '../components/operations/ResponderMarker';
import {
  Component,
  Layers,
  Sparkles,
  Flame,
  Shield,
  Bot,
  Activity,
  Code2,
} from 'lucide-react';

export const ComponentLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'components' | 'tokens' | 'notes'>('components');

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Component className="w-5 h-5 text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="COMPONENT SYSTEM & BUILD ARCHITECTURE" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            CYBER-SENTINEL DESIGN PRIMITIVES • OPERATIONAL TELEMETRY TOKENS • SYSTEM BUILD SPEC
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-xl p-1 font-mono text-xs shadow-sm">
          <button
            onClick={() => setActiveTab('components')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
              activeTab === 'components'
                ? 'bg-[#2DD4BF]/20 text-teal-700 dark:text-[#2DD4BF] font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            UI Primitives
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
              activeTab === 'tokens'
                ? 'bg-[#2DD4BF]/20 text-teal-700 dark:text-[#2DD4BF] font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tokens & Colors
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
              activeTab === 'notes'
                ? 'bg-[#2DD4BF]/20 text-teal-700 dark:text-[#2DD4BF] font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Build Notes
          </button>
        </div>
      </div>

      {/* TAB 1: UI PRIMITIVES */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          {/* Section 1: Cyber HUD Cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Layers className="w-4 h-4 text-[#2DD4BF]" />
              1. CyberHUDCard Primitives (Spotlight + Corner Brackets + Telemetry)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <CyberHUDCard
                variant="default"
                telemetryCode="TELEMETRY-SYS"
                telemetryLabel="CONNECTED"
                className="p-5"
              >
                <div className="text-slate-900 dark:text-white font-semibold mb-1">Standard Operational Card</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  Base surface with interactive cursor spotlight, corner reticles, and subtle teal glow.
                </p>
              </CyberHUDCard>

              <CyberHUDCard
                variant="critical"
                telemetryCode="CRITICAL-P1"
                telemetryLabel="IMMEDIATE THREAT"
                className="p-5"
              >
                <div className="text-slate-900 dark:text-white font-semibold mb-1">Critical Threat HUD Card</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  Emphasized red corner brackets and alert-critical border for high-stakes incidents.
                </p>
              </CyberHUDCard>

              <CyberHUDCard
                variant="ai"
                telemetryCode="AI-SYNTHESIS"
                telemetryLabel="NEURAL ENGINE"
                className="p-5"
              >
                <div className="text-slate-900 dark:text-white font-semibold mb-1">AI Recommendation Card</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  Violet accents indicating autonomous triage and resource allocation predictions.
                </p>
              </CyberHUDCard>
            </div>
          </div>

          {/* Section 2: Operational Buttons */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
              2. Operational Buttons & Sheen Sweeps
            </div>

            <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] flex flex-wrap items-center gap-4 shadow-md dark:shadow-2xl">
              <CyberButton variant="primary" size="md">
                Primary Action
              </CyberButton>
              <CyberButton variant="secondary" size="md">
                Glass Action
              </CyberButton>
              <CyberButton variant="critical" size="md" pulse={true} icon={<Flame className="w-3.5 h-3.5" />}>
                Critical Action
              </CyberButton>
              <CyberButton variant="ai" size="md" icon={<Bot className="w-3.5 h-3.5" />}>
                AI Dispatch
              </CyberButton>
              <CyberButton variant="ghost" size="md">
                Ghost Link
              </CyberButton>

              <div className="w-full pt-3 border-t border-slate-200 dark:border-white/5 flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                <span>Magnetic Pull Demo:</span>
                <MagneticButton strength={15}>
                  <CyberButton variant="primary" size="sm">
                    Magnetic Primary CTA
                  </CyberButton>
                </MagneticButton>
              </div>
            </div>
          </div>

          {/* Section 3: Semantic Status Badges & Telemetry Labels */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Activity className="w-4 h-4 text-[#2DD4BF]" />
              3. Semantic Status Badges & Telemetry Readouts
            </div>

            <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] space-y-4 shadow-md dark:shadow-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge type="severity" value="CRITICAL" />
                <StatusBadge type="severity" value="HIGH" />
                <StatusBadge type="severity" value="MEDIUM" />
                <StatusBadge type="severity" value="LOW" />
                <StatusBadge type="status" value="Responding" />
                <StatusBadge type="status" value="Analyzing" />
                <StatusBadge type="teamStatus" value="AVAILABLE" />
                <StatusBadge type="teamStatus" value="EN_ROUTE" />
                <StatusBadge type="teamStatus" value="ON_SCENE" />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-3">
                <TelemetryLabel label="ZONE" value="SECTOR 04" status="active" pulse={true} />
                <TelemetryLabel label="LAT" value="22.3072 N" status="neutral" />
                <TelemetryLabel label="LON" value="73.1812 E" status="neutral" />
                <TelemetryLabel label="ETA" value="06:42 MIN" status="warning" />
                <TelemetryLabel label="UNIT" value="MEDIC-07" status="active" />
                <TelemetryLabel label="AI CONF" value="94.8%" status="ai" />
              </div>
            </div>
          </div>

          {/* Section 4: Tactical Map Simulators */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <Shield className="w-4 h-4 text-[#2DD4BF]" />
              4. Tactical Map Markers & Radar Pulses
            </div>

            <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] flex flex-wrap items-center justify-around gap-6 shadow-md dark:shadow-2xl">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">RADAR PULSE (TEAL)</span>
                <RadarPulse size={48} color="#2DD4BF" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">RADAR PULSE (CRITICAL)</span>
                <RadarPulse size={48} color="#FB4A4A" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">INCIDENT TARGET</span>
                <IncidentMarker id="INC-2048" type="Industrial Fire" severity="CRITICAL" priority="P1" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">RESPONDER (FIRE)</span>
                <ResponderMarker id="ENG-04" name="Engine 04" type="Fire" status="EN_ROUTE" eta={4} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">RESPONDER (EMS)</span>
                <ResponderMarker id="MED-07" name="Medic 07" type="Medical" status="AVAILABLE" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOKENS & COLORS */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] space-y-6 shadow-md dark:shadow-2xl">
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Semantic Emergency Palette
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">TEAL (#2DD4BF)</span>
                  <div className="w-5 h-5 rounded-full bg-[#2DD4BF] shadow-[0_0_10px_#2DD4BF]" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  Active system / live telemetry / connected network nodes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">VIOLET (#7C5CFC)</span>
                  <div className="w-5 h-5 rounded-full bg-[#7C5CFC] shadow-[0_0_10px_#7C5CFC]" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  AI assistance / neural triage / autonomous recommendations.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">BLUE (#3B82F6)</span>
                  <div className="w-5 h-5 rounded-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  Information / command / tactical fleet navigation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">CRITICAL RED (#FB4A4A)</span>
                  <div className="w-5 h-5 rounded-full bg-[#FB4A4A] shadow-[0_0_10px_#FB4A4A]" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  Critical P1 incident / immediate hazard attention.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">AMBER (#F5A623)</span>
                  <div className="w-5 h-5 rounded-full bg-[#F5A623] shadow-[0_0_10px_#F5A623]" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  Warning / response transit delay / degraded status.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">GREEN (#34D399)</span>
                  <div className="w-5 h-5 rounded-full bg-[#34D399] shadow-[0_0_10px_#34D399]" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  Station ready / unit available / incident resolved.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-3 font-mono text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Dark Surface Neutral Foundation</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#05070A] border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block">CANVAS</span>
                  <span className="text-white font-bold">#05070A</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0E13] border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block">SURFACE</span>
                  <span className="text-white font-bold">#0B0E13</span>
                </div>
                <div className="p-3 rounded-xl bg-[#12161D] border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block">RAISED</span>
                  <span className="text-white font-bold">#12161D</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUILD NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] space-y-4 shadow-md dark:shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
              <Code2 className="w-5 h-5 text-[#2DD4BF]" />
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                PS-9 Architectural Design System Specifications
              </h3>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <h4 className="font-mono font-bold text-slate-900 dark:text-white text-sm mb-1">1. Cyber-Sentinel Metaphor Translation</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  Transformed all cybersecurity and document motifs into mission-critical emergency operations equivalents:
                  document scanning &rarr; incident detection; document network &rarr; multi-agency response topology;
                  document cards &rarr; unit & apparatus HUD cards; metadata &rarr; real-time GPS telemetry and transit SLAs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <h4 className="font-mono font-bold text-slate-900 dark:text-white text-sm mb-1">2. Motion Discipline</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  Standardized Framer Motion timings with precise easing curve <code className="text-teal-700 dark:text-[#2DD4BF] font-mono">cubic-bezier(0.16, 1, 0.3, 1)</code>.
                  Micro-interactions are capped at 150-250ms to ensure the operator never experiences interface latency during high-stakes disaster coordination.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <h4 className="font-mono font-bold text-slate-900 dark:text-white text-sm mb-1">3. Accessibility & Reduced Motion</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  All animations automatically respect <code className="text-teal-700 dark:text-[#2DD4BF] font-mono">@media (prefers-reduced-motion: reduce)</code>.
                  High contrast WCAG-friendly ratios are maintained across dark neutrals and semantic accent glows.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
