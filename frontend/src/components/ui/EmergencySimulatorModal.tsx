import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  CarFront,
  Waves,
  Biohazard,
  X,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  Square,
  FastForward,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { GlowButton } from './GlowButton';
import { useNavigate } from 'react-router-dom';

interface ScenarioDef {
  id: string;
  backendScenario: string;
  title: string;
  type: string;
  icon: string;
  severity: string;
  priority: string;
  zone: string;
  description: string;
  totalSteps: number;
}

const DEMO_SCENARIOS: ScenarioDef[] = [
  {
    id: 'HIGH_RISE_FIRE',
    backendScenario: 'HIGH_RISE_FIRE',
    title: 'Skyline Plaza Commercial Tower Inferno',
    type: 'High-Rise Fire',
    icon: 'Flame',
    severity: 'CRITICAL',
    priority: 'P1',
    zone: 'Barakhamba Road, Connaught Place',
    description:
      '42-story commercial skyscraper fire on 18th floor with trapped occupants, heavy particulate smoke, and compromised stairwells.',
    totalSteps: 15,
  },
  {
    id: 'CHEMICAL_FACTORY_EXPLOSION',
    backendScenario: 'CHEMICAL_FACTORY_EXPLOSION',
    title: 'Apex Petrochemical Refinery Reactor Rupture',
    type: 'Hazmat Explosion',
    icon: 'Biohazard',
    severity: 'CRITICAL',
    priority: 'P1',
    zone: 'Okhla Industrial Area Phase III',
    description:
      'Hydrocarbon polymer storage vessel over-pressurization causing toxic vapor plume and secondary containment breach.',
    totalSteps: 12,
  },
  {
    id: 'FLASH_FLOOD',
    backendScenario: 'FLASH_FLOOD',
    title: 'Metro Underpass Submersion & Embankment Breach',
    type: 'Monsoon Flood',
    icon: 'Waves',
    severity: 'CRITICAL',
    priority: 'P1',
    zone: 'Yamuna Embankment Sector 5',
    description:
      'Rapid river embankment failure inundating underground subway interchange, trapping commuters in flooded tunnels.',
    totalSteps: 12,
  },
  {
    id: 'HIGHWAY_TANKER_PILEUP',
    backendScenario: 'HIGHWAY_TANKER_PILEUP',
    title: 'NH-48 Expressway Hazardous Tanker Pileup',
    type: 'Mass Road Accident',
    icon: 'CarFront',
    severity: 'HIGH',
    priority: 'P2',
    zone: 'NH-48 Flyover km 18',
    description:
      'Multi-vehicle commuter coach collision with hazardous chemical tanker causing severe structural traffic gridlock.',
    totalSteps: 12,
  },
];

export const EmergencySimulatorModal: React.FC = () => {
  const {
    isSimulatorModalOpen,
    setIsSimulatorModalOpen,
    activeSimulation,
    startSimulationEngine,
    advanceSimulationEngine,
    stopSimulationEngine,
    setActiveIncidentId,
  } = useEmergency();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('HIGH_RISE_FIRE');
  const [isAutoRun, setIsAutoRun] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const navigate = useNavigate();

  if (!isSimulatorModalOpen) return null;

  const selectedScenario =
    DEMO_SCENARIOS.find((s) => s.id === selectedScenarioId) || DEMO_SCENARIOS[0];

  const getIcon = (type: string) => {
    switch (type) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'CarFront':
        return <CarFront className="w-5 h-5 text-amber-400" />;
      case 'Waves':
        return <Waves className="w-5 h-5 text-cyan-400" />;
      case 'Biohazard':
      default:
        return <Biohazard className="w-5 h-5 text-purple-400" />;
    }
  };

  const handleStartSimulation = async () => {
    setIsStarting(true);
    try {
      await startSimulationEngine(selectedScenario.backendScenario, isAutoRun, 2500);
    } catch (err) {
      console.error('Failed to start simulation:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAdvanceStep = async () => {
    setIsAdvancing(true);
    try {
      await advanceSimulationEngine();
    } catch (err) {
      console.error('Failed to advance simulation step:', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleStopSimulation = async () => {
    setIsStopping(true);
    try {
      await stopSimulationEngine();
    } catch (err) {
      console.error('Failed to stop simulation:', err);
    } finally {
      setIsStopping(false);
    }
  };

  const handleViewIncident = (incidentId: string) => {
    setActiveIncidentId(incidentId);
    setIsSimulatorModalOpen(false);
    navigate(`/command-center`);
  };

  const isSimRunning = activeSimulation?.status === 'RUNNING';
  const isSimCompleted = activeSimulation?.status === 'COMPLETED';
  const isSimStopped = activeSimulation?.status === 'STOPPED';
  const currentStep = activeSimulation?.currentStep || 0;
  const totalSteps = activeSimulation?.totalSteps || selectedScenario.totalSteps;
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#080B12] border border-cyan-500/40 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(0,217,255,0.18)] overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-red-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white tracking-wide flex items-center gap-2">
                  EMERGENCY SIMULATION ENGINE
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold animate-pulse">
                    LIVE SIMULATION MODE
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Hackathon Core: Orchestrates real incident triage, AI classification, dispatch, transit delay alerts, and mutual aid escalations.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSimulatorModalOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Active Simulation Status Card */}
            {activeSimulation && (
              <div className="p-4 rounded-xl bg-cyan-950/25 border border-cyan-500/40 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cyan-500/20 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      SIMULATION #{activeSimulation.simulationId}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isSimRunning
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isSimCompleted
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      STATUS: {activeSimulation.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-400">
                      STEP: <strong className="text-cyan-400">{currentStep}</strong> / {totalSteps}
                    </span>
                    <span className="text-slate-400">
                      PROGRESS: <strong className="text-white">{progressPercent}%</strong>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden mb-3 border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                {/* Generated Incident Link */}
                {activeSimulation.incidentIds?.length > 0 && (
                  <div className="flex items-center justify-between pt-1 text-xs font-mono">
                    <span className="text-slate-400">
                      ACTIVE INCIDENT RECORD:{' '}
                      <strong className="text-white">{activeSimulation.incidentIds[0]}</strong>
                    </span>
                    <button
                      onClick={() => handleViewIncident(activeSimulation.incidentIds[0])}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors"
                    >
                      <span>Open in Command Center</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Scenario Selector Grid */}
            {!isSimRunning && (
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Select Emergency Scenario
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DEMO_SCENARIOS.map((scenario) => {
                    const isSelected = scenario.id === selectedScenarioId;
                    return (
                      <div
                        key={scenario.id}
                        onClick={() => setSelectedScenarioId(scenario.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/70 shadow-[0_0_20px_rgba(0,217,255,0.2)]'
                            : 'bg-[#0B1018]/90 border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
                          {getIcon(scenario.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-white truncate">{scenario.title}</h4>
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                scenario.severity === 'CRITICAL'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              }`}
                            >
                              {scenario.priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                            {scenario.description}
                          </p>
                          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                            <span>{scenario.zone}</span>
                            <span className="text-slate-500">{scenario.totalSteps} Steps</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00D9FF]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Real-Time Event Timeline Stream */}
            {activeSimulation && activeSimulation.eventHistory?.length > 0 && (
              <div className="p-4 rounded-xl bg-[#05070D]/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Live Event Timeline Stream ({activeSimulation.eventHistory.length} Events)
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    REAL-TIME DISPATCH FEED
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 font-mono text-xs pr-1">
                  {activeSimulation.eventHistory.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-start gap-2.5 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {ev.status === 'WARNING' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : ev.type === 'INCIDENT_RESOLVED' || ev.type === 'SIMULATION_COMPLETED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-white text-[11px] uppercase">
                            Step {ev.step}: {ev.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{ev.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="border-t border-white/10 pt-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
            {/* Left: Mode Toggle */}
            <div className="flex items-center gap-3">
              {!isSimRunning && (
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={isAutoRun}
                    onChange={(e) => setIsAutoRun(e.target.checked)}
                    className="w-4 h-4 rounded bg-black/40 border border-cyan-500/40 text-cyan-500 focus:ring-0"
                  />
                  <span>Auto-Progress Mode (2.5s intervals)</span>
                </label>
              )}

              {isSimCompleted && (
                <button
                  onClick={() => {
                    setIsSimulatorModalOpen(false);
                    navigate('/analytics');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-mono font-bold hover:bg-teal-500/30 transition-colors"
                >
                  View Operational Analytics
                </button>
              )}
            </div>

            {/* Right: Operational Buttons */}
            <div className="flex items-center gap-2.5">
              <GlowButton
                variant="outline"
                size="sm"
                onClick={() => setIsSimulatorModalOpen(false)}
                disabled={isStarting || isAdvancing}
              >
                Close
              </GlowButton>

              {isSimRunning ? (
                <>
                  <button
                    onClick={handleStopSimulation}
                    disabled={isStopping}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-xs font-mono font-bold transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-red-400" />
                    <span>{isStopping ? 'STOPPING...' : 'STOP SIMULATION'}</span>
                  </button>

                  <GlowButton
                    variant="critical"
                    size="sm"
                    onClick={handleAdvanceStep}
                    disabled={isAdvancing || currentStep >= totalSteps}
                    icon={<FastForward className="w-4 h-4" />}
                  >
                    {isAdvancing
                      ? 'ADVANCING PIPELINE...'
                      : `ADVANCE TO STEP ${currentStep + 1} / ${totalSteps}`}
                  </GlowButton>
                </>
              ) : (
                <GlowButton
                  variant="critical"
                  size="md"
                  pulse={true}
                  onClick={handleStartSimulation}
                  disabled={isStarting}
                  icon={<Play className="w-4 h-4 fill-white" />}
                >
                  {isStarting
                    ? 'INITIALIZING REAL BACKEND...'
                    : `START ${selectedScenario.title.toUpperCase()}`}
                </GlowButton>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmergencySimulatorModal;
