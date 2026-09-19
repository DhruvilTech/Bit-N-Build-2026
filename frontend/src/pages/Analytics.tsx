import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { CyberCard } from '../components/ui/CyberCard';
import { TextScramble } from '../components/motion/TextScramble';
import {
  BarChart3,
  Clock,
  ShieldAlert,
  Activity,
  Award,
} from 'lucide-react';

// Chart 1: Hourly Incident Ingestion
  const hourlyData = [
    { hour: '08:00', incidents: 4, resolved: 3 },
    { hour: '09:00', incidents: 7, resolved: 5 },
    { hour: '10:00', incidents: 12, resolved: 8 },
    { hour: '11:00', incidents: 9, resolved: 7 },
    { hour: '12:00', incidents: 15, resolved: 11 },
    { hour: '13:00', incidents: 24, resolved: 14 },
    { hour: '14:00', incidents: 18, resolved: 16 },
  ];

  // Chart 2: Incidents by Category
  const typeData = [
    { name: 'Industrial Fire', value: 8, color: '#FB4A4A' },
    { name: 'Road Accidents', value: 14, color: '#F5A623' },
    { name: 'Flash Floods', value: 6, color: '#2DD4BF' },
    { name: 'Chemical / Hazmat', value: 4, color: '#7C5CFC' },
    { name: 'Structural / Other', value: 5, color: '#3B82F6' },
  ];

  // Chart 3: Response Time Benchmark vs Actual
  const responseTimeData = [
    { zone: 'Zone 1 (Core)', actual: 4.8, target: 6.0 },
    { zone: 'Zone 2 (North)', actual: 5.4, target: 6.0 },
    { zone: 'Zone 3 (Indust.)', actual: 6.2, target: 6.0 },
    { zone: 'Zone 4 (East)', actual: 5.1, target: 6.0 },
    { zone: 'Zone 5 (River)', actual: 7.8, target: 6.0 },
    { zone: 'NH-48 Corridor', actual: 11.2, target: 8.0 },
  ];

  // Chart 4: Resource Fleet Utilization
  const fleetData = [
    { category: 'Heavy Fire Rigs', active: 85, reserve: 15 },
    { category: 'Mobile Trauma ICUs', active: 90, reserve: 10 },
    { category: 'Police Interceptors', active: 70, reserve: 30 },
    { category: 'Hazmat Trailers', active: 60, reserve: 40 },
    { category: 'Rescue Amphibious', active: 45, reserve: 55 },
  ];

// Custom Dark Command Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-[#080B12] border border-[#2DD4BF]/40 shadow-2xl font-mono text-xs">
        <div className="text-white font-bold mb-1">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
            <span>{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Analytics: React.FC = () => {

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2DD4BF]" />
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-wider">
              <TextScramble text="OPERATIONAL ANALYTICS & INTELLIGENCE" duration={350} />
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            DISASTER LATENCY METRICS • RESOURCE EFFICIENCY • POST-INCIDENT AUDITS
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-teal-700 dark:text-[#2DD4BF] font-semibold">
            DISPATCH LATENCY: 01m 42s AVG
          </div>
        </div>
      </div>

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CyberCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">AVERAGE ARRIVAL TIME</span>
            <Clock className="w-4 h-4 text-[#2DD4BF]" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">06m 15s</div>
          <div className="text-[11px] font-mono text-emerald-700 dark:text-[#34D399] mt-1 font-semibold">
            -42s faster than city mandate
          </div>
        </CyberCard>

        <CyberCard variant="ai" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">AI TRIAGE ACCURACY</span>
            <Award className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div className="text-2xl font-mono font-bold text-purple-700 dark:text-[#A78BFA]">94.8%</div>
          <div className="text-[11px] font-mono text-purple-700 dark:text-[#A78BFA] mt-1 font-semibold">
            Verified post-incident review
          </div>
        </CyberCard>

        <CyberCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">DE-DUPLICATION RATE</span>
            <Activity className="w-4 h-4 text-[#34D399]" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-700 dark:text-[#34D399]">76.2%</div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
            Saves operator call overhead
          </div>
        </CyberCard>

        <CyberCard variant="warning" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">SLA ADHERENCE</span>
            <ShieldAlert className="w-4 h-4 text-[#F5A623]" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">88.4%</div>
          <div className="text-[11px] font-mono text-amber-700 dark:text-[#F5A623] mt-1 font-semibold">
            Bottleneck identified on NH-48
          </div>
        </CyberCard>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Volume Area Chart (7 Columns) */}
        <div className="lg:col-span-7 p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4 font-mono">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              INCIDENT FREQUENCY & RESOLUTION BY HOUR
            </h3>
            <span className="text-[11px] text-teal-700 dark:text-[#2DD4BF] font-semibold">TODAY'S SHIFT</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#64748B" fontSize={11} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  name="Ingested Incidents"
                  stroke="#2DD4BF"
                  fillOpacity={1}
                  fill="url(#tealGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="#34D399"
                  fillOpacity={1}
                  fill="url(#emeraldGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents by Type Donut Chart (5 Columns) */}
        <div className="lg:col-span-5 p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4 font-mono">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              INCIDENTS BY DISASTER CATEGORY
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">37 TOTAL</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
            {typeData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time SLA by Zone (6 Columns) */}
        <div className="lg:col-span-6 p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4 font-mono">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              AVERAGE ARRIVAL TIME VS TARGET SLA (MINUTES)
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimeData}>
                <XAxis dataKey="zone" stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                <Bar dataKey="actual" name="Actual Arrival (min)" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target SLA (min)" fill="#64748B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resource Fleet Utilization (6 Columns) */}
        <div className="lg:col-span-6 p-6 rounded-[18px] bg-white dark:bg-[rgba(11,14,19,0.78)] border border-slate-200 dark:border-white/10 backdrop-blur-[18px] shadow-md dark:shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4 font-mono">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              EMERGENCY FLEET UTILIZATION %
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleetData} layout="vertical">
                <XAxis type="number" stroke="#64748B" fontSize={11} fontFamily="JetBrains Mono" domain={[0, 100]} />
                <YAxis type="category" dataKey="category" stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="active" name="Active Deployed %" fill="#7C5CFC" stackId="a" />
                <Bar dataKey="reserve" name="Reserve Available %" fill="#334155" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
