import React, { useState, useRef, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { CyberButton } from '../components/ui/CyberButton';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Bot,
  Send,
  Sparkles,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AIAssistant: React.FC = () => {
  const { incidents, teams, hospitals, stats } = useEmergency();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'MSG-01',
      sender: 'ai',
      text: `Greetings Operator. Response AI is operational and monitoring real-time disaster feeds. There are currently ${stats.totalIncidents} active incidents (${stats.criticalIncidents} Critical P1). How can I assist tactical decision-making?`,
      timestamp: '13:40:10',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const quickPrompts = [
    'Summarize current emergency situation.',
    'Which incidents are currently delayed?',
    'What are the critical P1 incidents?',
    'Which teams and vehicles are available right now?',
    'Report hospital ICU bed shortages.',
  ];

  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('summarize') || q.includes('situation')) {
      const topCritical = incidents.find((i) => i.severity === 'CRITICAL');
      return `SITUATIONAL BRIEFING:\n• Active Incidents: ${stats.totalIncidents} monitored in real time.\n• Critical Threats: ${stats.criticalIncidents} rated P1 (${topCritical ? topCritical.title + ' in ' + topCritical.location.zone : 'None'}).\n• Field Readiness: ${stats.activeTeams} teams mobilized, ${stats.availableVehicles} reserve vehicles ready for dispatch.\n• Response Latency: ${stats.delayedResponses > 0 ? stats.delayedResponses + ' units flagged for transit bottleneck.' : 'All units operating within expected SLAs.'}`;
    }

    if (q.includes('delay')) {
      const delayed = incidents.filter((i) => i.delayDetected);
      if (delayed.length === 0) {
        return `Positive status: No active incidents currently exceed SLA response benchmarks. Average transit time is 06m 12s across active zones.`;
      }
      return `ALERT: ${delayed.length} delayed responses detected:\n${delayed
        .map((d) => `• #${d.id} (${d.title}): Transit duration exceeds baseline by +${d.delayMinutes || 6} min along ${d.location.zone}. Rerouting suggested.`)
        .join('\n')}`;
    }

    if (q.includes('critical') || q.includes('p1')) {
      const criticals = incidents.filter((i) => i.severity === 'CRITICAL');
      return `CRITICAL INCIDENTS ROSTER (${criticals.length} Active):\n${criticals
        .map((c) => `• #${c.id} [${c.type}]: ${c.title} at ${c.location.name}. AI Confidence: ${c.aiConfidence}%. Status: ${c.status}.`)
        .join('\n')}`;
    }

    if (q.includes('team') || q.includes('available') || q.includes('vehicle')) {
      const avail = teams.filter((t) => t.status === 'AVAILABLE');
      return `AVAILABLE FIELD ASSETS (${avail.length} Units Ready):\n${avail
        .map((t) => `• ${t.name} (${t.type}): Vehicle ${t.vehicleName} stationed at ${t.location.zone}. Fuel: ${t.batteryOrFuelLevel}%.`)
        .join('\n')}`;
    }

    if (q.includes('hospital') || q.includes('bed') || q.includes('icu')) {
      const diverting = hospitals.filter((h) => h.divertStatus);
      const totalIcu = hospitals.reduce((acc, h) => acc + h.availableIcuBeds, 0);
      return `MEDICAL SYSTEM CAPACITY:\n• Total Available ICU Beds: ${totalIcu} across 8 metro trauma facilities.\n• Divert Status: ${diverting.length > 0 ? diverting.map((h) => h.name).join(', ') + ' currently saturated.' : 'All trauma centers accepting priority casualties.'}`;
    }

    return `Telemetry acknowledged for query: "${query}". Cross-referencing 14 IoT seismic/atmospheric nodes and GPS trackers. Optimal command priority remains containment of active P1 hazards and mutual aid staging.`;
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    soundFx.playClick();
    const userMsg: Message = {
      id: `USER-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toTimeString().slice(0, 8),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      soundFx.playDispatch();
      const aiReply = generateAIResponse(text);
      const aiMsg: Message = {
        id: `AI-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toTimeString().slice(0, 8),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 650);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#7C5CFC]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="AI RESPONSE COPILOT // TACTICAL SYNTHESIS" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            NEURAL DISASTER SYNTHESIS • CONVERSATIONAL TELEMETRY INTERROGATION
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C5CFC]/15 border border-[#7C5CFC]/40 text-purple-700 dark:text-[#A78BFA] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC] animate-pulse" />
            MODEL: EMERGENCY-GPT-4v // OPERATIONAL
          </span>
        </div>
      </div>

      {/* Main Chat Interface Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Console (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col h-[650px] rounded-[20px] bg-white dark:bg-[rgba(11,14,19,0.85)] border border-[rgba(124,92,252,0.35)] backdrop-blur-[18px] shadow-lg dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-mono text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 flex items-center justify-center text-purple-700 dark:text-[#A78BFA] flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-xl p-4 rounded-2xl whitespace-pre-line leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-teal-500/10 text-teal-900 dark:text-[#5EEAD4] border border-teal-500/30 rounded-tr-none'
                      : 'bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-none font-sans text-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{msg.sender === 'user' ? 'OPERATOR' : 'RESPONSE AI'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 flex items-center justify-center text-purple-700 dark:text-[#A78BFA] flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-purple-700 dark:text-[#A78BFA] font-mono text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#7C5CFC] animate-ping" />
                  Cross-referencing live telemetry and response status...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Pills */}
          <div className="px-4 py-2 bg-slate-100/90 dark:bg-[#05070D]/80 border-t border-slate-200 dark:border-white/5 flex gap-2 overflow-x-auto">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.02] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-[#2DD4BF] whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-white dark:bg-[#05070D]/90 border-t border-slate-200 dark:border-white/10 flex items-center gap-3"
          >
            <input
              type="text"
              placeholder="Inquire about incidents, resource shortages, ETA delays..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-xs focus:outline-none focus:border-[#7C5CFC]/60 focus:ring-1 focus:ring-[#7C5CFC]/40"
            />
            <CyberButton
              type="submit"
              variant="ai"
              size="md"
              disabled={isThinking || !input.trim()}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </CyberButton>
          </form>
        </div>

        {/* Animated AI Hologram / Waveform Panel (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Animated Glowing Holographic Orb */}
          <div className="p-6 rounded-[20px] bg-white dark:bg-[rgba(11,14,19,0.85)] border border-[rgba(124,92,252,0.35)] backdrop-blur-[18px] flex flex-col items-center text-center shadow-lg dark:shadow-2xl relative overflow-hidden animate-ai-breathing">
            <div className="relative w-36 h-36 my-4 flex items-center justify-center">
              {/* Outer pulsing rings */}
              <div className="absolute inset-0 rounded-full border border-[#7C5CFC]/30 animate-signal-pulse" />
              <div className="absolute inset-3 rounded-full border border-[#2DD4BF]/40 animate-spin-slow" />
              <div className="absolute inset-6 rounded-full border border-dashed border-[#A78BFA]/50 animate-radar-rotate" />

              {/* Glowing Core */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#7C5CFC] via-[#2DD4BF] to-[#3B82F6] shadow-[0_0_35px_rgba(124,92,252,0.7)] flex items-center justify-center text-white">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
              NEURAL SITUATION AGENT
            </h3>
            <p className="text-xs font-mono text-purple-700 dark:text-[#A78BFA] mt-1">STATUS: CONTINUOUS INGESTION</p>

            {/* Audio Waveform Bars Simulation */}
            <div className="flex items-center gap-1.5 h-8 my-4">
              {[40, 75, 25, 90, 60, 85, 30, 95, 50, 70, 45, 80].map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-[#7C5CFC] to-[#2DD4BF] rounded-full transition-all duration-300"
                  style={{
                    height: `${isThinking ? height : Math.max(15, height * 0.4)}%`,
                  }}
                />
              ))}
            </div>

            <div className="w-full pt-4 border-t border-slate-200 dark:border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 text-left">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">LATENCY:</span>
                <span className="text-emerald-700 dark:text-[#34D399] font-bold">18 ms</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">TRAINED ON:</span>
                <span className="text-slate-900 dark:text-white font-bold">HAZMAT & NIMS</span>
              </div>
            </div>
          </div>

          {/* Multimodal Drone Thermal Sensor Integration Card */}
          <div className="rounded-[20px] overflow-hidden bg-white dark:bg-[rgba(11,14,19,0.85)] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl">
            <div className="relative h-40">
              <img
                src="/assets/drone_thermal_feed.jpg"
                alt="Tactical FLIR Drone Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-600/90 text-white font-mono text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                FLIR CAMERA #4 // 485°C
              </div>
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-white/90">
                <span>AI VISION: HAZMAT ACTIVE</span>
                <span className="text-[#2DD4BF] font-bold">96.4% CONF</span>
              </div>
            </div>
            <div className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span>MULTIMODAL INGESTION</span>
              <span className="text-emerald-700 dark:text-[#34D399] font-semibold">STREAM ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
