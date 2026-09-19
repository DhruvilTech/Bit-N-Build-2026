import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CarFront, Waves, Biohazard, X, ShieldAlert, ArrowRight, CheckCircle2, Cpu, Radio, Sparkles } from 'lucide-react';
import { SIMULATION_SCENARIOS } from '../../data/mockData';
import { useEmergency } from '../../context/EmergencyContext';
import { GlowButton } from './GlowButton';
import { useNavigate } from 'react-router-dom';

export const EmergencySimulatorModal: React.FC = () => {
  const { isSimulatorModalOpen, setIsSimulatorModalOpen, simulateEmergency } = useEmergency();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SIMULATION_SCENARIOS[0].id);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const navigate = useNavigate();

  if (!isSimulatorModalOpen) return null;

  const selectedScenario = SIMULATION_SCENARIOS.find((s) => s.id === selectedScenarioId) || SIMULATION_SCENARIOS[0];

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

  const handleLaunch = () => {
    setIsExecuting(true);
    simulateEmergency(selectedScenario.id);

    setTimeout(() => {
      setIsExecuting(false);
      setIsSimulatorModalOpen(false);
      navigate('/command-center');
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-3xl rounded-2xl bg-[#080B12] border border-cyan-500/30 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_35px_rgba(0,217,255,0.15)] overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-red-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white tracking-wide flex items-center gap-2">
                  EMERGENCY SIMULATION ENGINE
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    LIVE DEMO CORE
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select an emergency scenario to trigger the autonomous AI response workflow across the entire platform.
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

          {/* Scenario Selection Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {SIMULATION_SCENARIOS.map((scenario) => {
              const isSelected = scenario.id === selectedScenarioId;
              return (
                <div
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(0,217,255,0.15)]'
                      : 'bg-[#0B1018]/80 border-white/10 hover:border-white/20 hover:bg-white/5'
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
                    <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400">
                      <span>{scenario.zone}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00D9FF]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cascading Pipeline Visualization */}
          <div className="p-4 rounded-xl bg-[#05070D]/80 border border-white/10 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Automated Cascading Pipeline Sequence
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-mono">
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <Radio className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <div className="text-white font-medium">1. Detect</div>
                <div className="text-[10px] text-slate-400">IoT Telemetry</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <Cpu className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                <div className="text-white font-medium">2. AI Classify</div>
                <div className="text-[10px] text-slate-400">95% Conf. P1</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-red-400" />
                <div className="text-white font-medium">3. Prioritize</div>
                <div className="text-[10px] text-slate-400">De-duplicate</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <ArrowRight className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <div className="text-white font-medium">4. Recommend</div>
                <div className="text-[10px] text-slate-400">Closest Units</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <div className="text-white font-medium">5. Mobilize</div>
                <div className="text-[10px] text-slate-400">Live Timeline</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-mono">
              TARGET: <span className="text-white">{selectedScenario.zone}</span>
            </span>
            <div className="flex items-center gap-3">
              <GlowButton
                variant="outline"
                size="sm"
                onClick={() => setIsSimulatorModalOpen(false)}
                disabled={isExecuting}
              >
                Cancel
              </GlowButton>
              <GlowButton
                variant="critical"
                size="md"
                pulse={true}
                onClick={handleLaunch}
                disabled={isExecuting}
                icon={<Flame className="w-4 h-4" />}
              >
                {isExecuting ? 'INITIALIZING EMERGENCY PIPELINE...' : 'TRIGGER EMERGENCY NOW'}
              </GlowButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
