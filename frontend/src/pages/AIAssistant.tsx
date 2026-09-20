import React, { useState, useRef, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { CyberButton } from '../components/ui/CyberButton';
import { TextScramble } from '../components/motion/TextScramble';
import {
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { aiApi, AiChatResult } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  intent?: string;
  executedTools?: string[];
  verifiedData?: boolean;
  data?: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    link?: string | null;
  }>;
  isError?: boolean;
}

export const AIAssistant: React.FC = () => {
  const { stats } = useEmergency();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'MSG-01',
      sender: 'ai',
      text: `Greetings Operator. Response AI Command Copilot is operational and monitoring real-time disaster feeds. There are currently ${stats.totalIncidents} active incidents (${stats.criticalIncidents} Critical P1, ${stats.activeEscalations || 0} Escalations). How can I assist tactical decision-making?`,
      timestamp: new Date().toTimeString().slice(0, 8),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const quickPrompts = [
    'Show current critical incidents.',
    'Which ambulances are available?',
    'Which incidents are currently delayed?',
    'Which hospitals have capacity?',
    'Summarize the current emergency situation.',
    'Which incidents are currently escalated?',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isThinking) return;

    soundFx.playClick();
    setLastPrompt(text);

    const userMsg: Message = {
      id: `USER-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toTimeString().slice(0, 8),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const history = messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text }));
      const result: AiChatResult = await aiApi.chat({
        message: text,
        history,
      });

      soundFx.playDispatch();
      const aiMsg: Message = {
        id: `AI-${Date.now()}`,
        sender: 'ai',
        text: result.answer,
        timestamp: new Date().toTimeString().slice(0, 8),
        intent: result.intent,
        data: result.data,
        verifiedData: result.verifiedData,
        executedTools: result.executedTools,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      soundFx.playEmergencyAlert();
      const errorMsg: Message = {
        id: `AI-ERR-${Date.now()}`,
        sender: 'ai',
        text: `Command assistant encountered a temporary connectivity issue: ${err.message || 'AI service unavailable'}. Please verify backend network state and retry.`,
        timestamp: new Date().toTimeString().slice(0, 8),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearHistory = () => {
    soundFx.playClick();
    setMessages([
      {
        id: `MSG-${Date.now()}`,
        sender: 'ai',
        text: 'Tactical session cleared. Response AI is ready for operational inquiries.',
        timestamp: new Date().toTimeString().slice(0, 8),
      },
    ]);
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 font-sans leading-relaxed text-xs">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Headers
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || (/^\*\*[^*]+\*\*$/.test(trimmed) && trimmed.length < 60)) {
            const headerText = trimmed.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '');
            return (
              <div key={idx} className="font-mono font-bold text-xs uppercase text-purple-700 dark:text-[#A78BFA] tracking-wide pt-1">
                {headerText}
              </div>
            );
          }

          // Horizontal divider
          if (trimmed === '---' || trimmed === '***') {
            return <div key={idx} className="my-2 border-t border-slate-200 dark:border-white/10" />;
          }

          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
          const isNumbered = /^\d+\.\s/.test(trimmed);
          const cleanText = isBullet ? trimmed.replace(/^[•\-\*]\s*/, '') : trimmed;

          // Split by bold segments
          const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);

          return (
            <div key={idx} className={`${isBullet || isNumbered ? 'pl-2 flex items-start gap-1.5' : ''}`}>
              {isBullet && <span className="text-[#7C5CFC] font-bold select-none">•</span>}
              <div className="flex-1">
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#7C5CFC]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="AI RESPONSE COPILOT // TACTICAL COMMAND" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            INTENT-DRIVEN TELEMETRY INTERROGATION • TARGETED OPERATIONAL CONTEXT
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleClearHistory}
            title="Clear Chat History"
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Log</span>
          </button>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C5CFC]/15 border border-[#7C5CFC]/40 text-purple-700 dark:text-[#A78BFA] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC] animate-pulse" />
            ONLINE // MISTRAL NEURAL COPILOT
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
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      msg.isError
                        ? 'bg-red-500/20 border border-red-500/40 text-red-500'
                        : 'bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 text-purple-700 dark:text-[#A78BFA]'
                    }`}
                  >
                    {msg.isError ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}

                <div
                  className={`max-w-xl p-4 rounded-2xl whitespace-pre-line leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-teal-500/10 text-teal-900 dark:text-[#5EEAD4] border border-teal-500/30 rounded-tr-none'
                      : msg.isError
                      ? 'bg-red-500/10 text-red-900 dark:text-red-300 border border-red-500/30 rounded-tl-none font-sans text-xs'
                      : 'bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-none font-sans text-xs'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-white/5 pb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 font-bold">
                      <span>{msg.sender === 'user' ? 'OPERATOR' : 'MISTRAL COMMAND AI'}</span>
                      {msg.intent && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-[#A78BFA] text-[9px] font-mono">
                          {msg.intent}
                        </span>
                      )}
                      {msg.verifiedData && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          VERIFIED OPERATIONAL DATA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.executedTools && msg.executedTools.length > 0 && (
                        <div className="flex items-center gap-1">
                          {msg.executedTools.map((t, tidx) => (
                            <span key={tidx} className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-[8.5px] font-mono">
                              tool:{t}()
                            </span>
                          ))}
                        </div>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                  <div>{renderFormattedContent(msg.text)}</div>

                  {/* Interactive Structured Entity References */}
                  {msg.data && msg.data.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Operational Entity References:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.data.slice(0, 6).map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              if (item.link) navigate(item.link);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                              item.link
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-[#A78BFA] hover:bg-purple-500/20 cursor-pointer'
                                : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold">{item.id}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{item.title}</span>
                            {item.link && <ExternalLink className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.isError && lastPrompt && (
                    <button
                      onClick={() => handleSend(lastPrompt)}
                      className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 font-mono text-[11px] transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry query</span>
                    </button>
                  )}
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
                  Selecting controlled operational tools and retrieving verified database state...
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
                disabled={isThinking}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.02] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-[#2DD4BF] whitespace-nowrap transition-colors disabled:opacity-50"
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
              placeholder="Inquire about incidents, available ambulances, delayed responses, ICU beds..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isThinking}
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
              NEURAL COMMAND COPILOT
            </h3>
            <p className="text-xs font-mono text-purple-700 dark:text-[#A78BFA] mt-1 font-semibold">
              TASK-SPECIFIC MINIMAL CONTEXT
            </p>

            <div className="w-full mt-6 pt-4 border-t border-slate-200 dark:border-white/10 text-left font-mono text-xs space-y-2.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>INTENT ROUTING:</span>
                <span className="text-teal-700 dark:text-[#2DD4BF] font-bold">CONTROLLED MATRIX</span>
              </div>
              <div className="flex justify-between items-center">
                <span>DATABASE ACCESS:</span>
                <span className="text-teal-700 dark:text-[#2DD4BF] font-bold">SCOPED PROJECTIONS</span>
              </div>
              <div className="flex justify-between items-center">
                <span>FAIL-SAFE HEURISTICS:</span>
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center">
                <span>OPERATIONAL SAFETY:</span>
                <span className="text-amber-600 dark:text-[#F5A623] font-bold">READ-ONLY SUPPORT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
