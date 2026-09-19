import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Radio,
  Cpu,
  User,
  PhoneCall,
  Flame,
  AlertTriangle,
  MapPin,
  Send,
  Sparkles,
  Thermometer,
  Shield,
  Activity,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { CyberButton } from '../ui/CyberButton';
import { soundFx } from '../../utils/audio';
import { incidentsApi } from '../../services/api';
import { adaptBackendIncidents } from '../../utils/adapters';
import { useEmergency } from '../../context/EmergencyContext';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newIncident: any) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Vadodara Central / Downtown (Gujarat)', lat: 22.3072, lng: 73.1812, addr: 'Downtown Vadodara, Gujarat' },
  { name: 'Vishwamitri River Basin (Vadodara)', lat: 22.3105, lng: 73.1800, addr: 'Vishwamitri River Basin, Vadodara, Gujarat' },
  { name: 'Apex Petrochemical Complex (Zone 3)', lat: 28.6289, lng: 77.2065, addr: 'Sector 4 Industrial Gate, Zone 3' },
  { name: 'Docklands Maritime Container Terminal', lat: 28.6410, lng: 77.2340, addr: 'Docklands Cargo Terminal Bay 14, Port Zone' },
  { name: 'Central Connaught Commercial Ring', lat: 28.6328, lng: 77.2197, addr: 'Connaught Circle Block B, Central Market' },
  { name: 'South Highway Express Corridor Km 28', lat: 28.5720, lng: 77.1620, addr: 'NH-48 Expressway Gateway Km 28' },
  { name: 'Riverbank North Elevated Colony', lat: 28.6600, lng: 77.2010, addr: 'Riverbank North Embankment Gate 3' },
];

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { syncWithBackend } = useEmergency();

  const [source, setSource] = useState<'CITIZEN' | 'SENSOR' | 'FIELD_TEAM' | 'OPERATOR' | 'EMERGENCY_CALL'>('OPERATOR');
  const [type, setType] = useState<string>('FIRE');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [priority, setPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [address, setAddress] = useState<string>('');
  const [detectedLocationInfo, setDetectedLocationInfo] = useState<{
    found: boolean;
    address?: string;
    latitude?: number;
    longitude?: number;
    rawMention?: string;
    confidence?: number;
  } | null>(null);

  // Multi-source specific metadata
  const [sensorId, setSensorId] = useState<string>('IOT-FLIR-09');
  const [temperature, setTemperature] = useState<string>('460');
  const [ppmReading, setPpmReading] = useState<string>('120');
  const [callerName, setCallerName] = useState<string>('');
  const [callerPhone, setCallerPhone] = useState<string>('');
  const [fieldOfficer, setFieldOfficer] = useState<string>('Captain Marcus Rodriguez');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClassifyingAi, setIsClassifyingAi] = useState<boolean>(false);
  const [aiClassification, setAiClassification] = useState<{
    incidentType: string;
    severity: string;
    priority: string;
    confidence: number;
    signals: string[];
    reasoning?: any;
    model?: string;
  } | null>(null);

  const handleAiAutoTriage = async () => {
    if (!description.trim() && !title.trim()) {
      setErrorMessage('Please enter an Incident Title or Situational Description first for the AI model to analyze.');
      return;
    }
    setErrorMessage(null);
    setIsClassifyingAi(true);
    soundFx.playClick();

    const metadata: Record<string, any> = {};
    if (source === 'SENSOR') {
      metadata.sensorId = sensorId || 'IOT-FLIR-09';
      metadata.temperature = Number(temperature) || 0;
      metadata.ppmReading = Number(ppmReading) || 0;
    }

    try {
      const result = await incidentsApi.classifyPreview({
        title: title.trim(),
        description: description.trim(),
        source,
        metadata,
        location: address.trim() && latitude !== '' && longitude !== '' ? { latitude: Number(latitude), longitude: Number(longitude), address } : undefined,
      });

      if (result) {
        setType(result.incidentType);
        setSeverity(result.severity as any);
        setPriority(result.priority as any);
        setAiClassification(result);

        // Auto-populate location if detected by AI from narrative
        if (result.detectedLocation && result.detectedLocation.found) {
          if (result.detectedLocation.address) {
            setAddress(result.detectedLocation.address);
          }
          if (result.detectedLocation.latitude != null) {
            setLatitude(result.detectedLocation.latitude);
          }
          if (result.detectedLocation.longitude != null) {
            setLongitude(result.detectedLocation.longitude);
          }
          setDetectedLocationInfo(result.detectedLocation);
        } else {
          setDetectedLocationInfo({ found: false });
        }

        soundFx.playSonarPing();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'AI Auto-Triage temporarily unavailable. You can still set parameters manually.');
    } finally {
      setIsClassifyingAi(false);
    }
  };

  const applyPreset = (preset: (typeof PRESET_LOCATIONS)[0]) => {
    soundFx.playClick();
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setAddress(preset.addr);
    setDetectedLocationInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Incident Title is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Detailed situation description is required.');
      return;
    }
    if (!address.trim() || latitude === '' || longitude === '') {
      setErrorMessage('Valid location address and GPS coordinates are required. Please enter an address or choose a preset.');
      return;
    }

    setIsSubmitting(true);
    soundFx.playDispatch();

    const metadata: Record<string, any> = {};
    if (source === 'SENSOR') {
      metadata.sensorId = sensorId || 'SENSOR-GENERIC';
      metadata.temperature = Number(temperature) || 0;
      metadata.ppmReading = Number(ppmReading) || 0;
      metadata.telemetrySource = 'IOT_HAZARD_GRID';
    } else if (source === 'CITIZEN') {
      metadata.callerName = callerName || 'Anonymous Citizen';
      metadata.callerPhone = callerPhone || 'Not Disclosed';
      metadata.intakeChannel = 'CITIZEN_MOBILE_APP';
    } else if (source === 'FIELD_TEAM') {
      metadata.reportingOfficer = fieldOfficer;
      metadata.radioChannel = 'CH-04 TAC MESH';
    } else if (source === 'EMERGENCY_CALL') {
      metadata.callCenterId = '911-METRO-01';
      metadata.audioRecorded = true;
    }

    try {
      const payload = {
        title: title.trim(),
        type,
        source,
        description: description.trim(),
        severity,
        priority,
        location: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: address.trim(),
        },
        metadata,
      };

      const created = await incidentsApi.create(payload);
      soundFx.playDispatch();

      if (onCreated) {
        onCreated(created);
      }
      await syncWithBackend();
      onClose();
    } catch (err: any) {
      soundFx.playEmergencyAlert();
      setErrorMessage(err.message || 'Failed to dispatch incident report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-teal-500/40 shadow-2xl overflow-hidden font-sans text-slate-900 dark:text-white my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-700 dark:text-[#2DD4BF]">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold tracking-wide flex items-center gap-2">
                  DISPATCH INCIDENT REPORT
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/30">
                    PHASE 7 INGESTION
                  </span>
                </h2>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  MULTI-SOURCE TELEMETRY • CITIZEN, SENSOR, FIELD & OPERATOR INTAKE
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-mono text-xs">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Source Selection Tabs */}
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 font-bold">
                INCIDENT INGESTION SOURCE:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'OPERATOR', label: 'Operator Desk', icon: Shield },
                  { id: 'SENSOR', label: 'IoT Sensor', icon: Thermometer },
                  { id: 'CITIZEN', label: 'Citizen Report', icon: User },
                  { id: 'FIELD_TEAM', label: 'Field Team', icon: Radio },
                  { id: 'EMERGENCY_CALL', label: '911 Call', icon: PhoneCall },
                ].map((src) => {
                  const Icon = src.icon;
                  const isSelected = source === src.id;
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setSource(src.id as any);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        isSelected
                          ? 'bg-teal-500/15 border-teal-500 text-teal-800 dark:text-[#2DD4BF] shadow-[0_0_12px_rgba(45,212,191,0.2)] font-bold'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-teal-500/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{src.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Source Metadata Sub-Card */}
            {source === 'SENSOR' && (
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-purple-700 dark:text-[#A78BFA] font-bold">
                  <Thermometer className="w-4 h-4" />
                  <span>IOT SENSOR GRID TELEMETRY METADATA</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">SENSOR HARDWARE ID</label>
                    <input
                      type="text"
                      value={sensorId}
                      onChange={(e) => setSensorId(e.target.value)}
                      placeholder="e.g. OGI-901"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">TEMPERATURE READING (°C)</label>
                    <input
                      type="text"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="e.g. 485"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">GAS / PPM VALUE</label>
                    <input
                      type="text"
                      value={ppmReading}
                      onChange={(e) => setPpmReading(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {source === 'CITIZEN' && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-[#60A5FA] font-bold">
                  <User className="w-4 h-4" />
                  <span>CITIZEN CALLER INTAKE DETAILS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">REPORTER NAME</label>
                    <input
                      type="text"
                      value={callerName}
                      onChange={(e) => setCallerName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">PHONE NUMBER</label>
                    <input
                      type="text"
                      value={callerPhone}
                      onChange={(e) => setCallerPhone(e.target.value)}
                      placeholder="e.g. +91-98765-43210"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {source === 'FIELD_TEAM' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-[#F5A623] font-bold">
                  <Radio className="w-4 h-4" />
                  <span>FIELD PERSONNEL ON-SCENE VERIFICATION</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">REPORTING COORDINATOR / OFFICER</label>
                  <input
                    type="text"
                    value={fieldOfficer}
                    onChange={(e) => setFieldOfficer(e.target.value)}
                    placeholder="e.g. Captain Marcus Rodriguez"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Raw Incident Narrative Intake */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  INCIDENT TITLE / REPORT SUMMARY
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tanker Fire at Chemical Refinery Storage Bay"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">
                    SITUATIONAL NARRATIVE & RAW REPORT
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    UNSTRUCTURED MULTI-SOURCE STREAM
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe active hazard, estimated casualties, perimeter status, chemical or structural hazards..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]"
                />
              </div>

              {/* AI Auto-Triage Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-teal-500/10 to-transparent border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 dark:text-[#A78BFA] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white block">
                      PS-9 AI INCIDENT CLASSIFIER
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Auto-detects Hazard Type, Severity, and SLA Priority from narrative
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAiAutoTriage}
                  disabled={isClassifyingAi}
                  className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  {isClassifyingAi ? (
                    <>
                      <Cpu className="w-3.5 h-3.5 animate-spin" />
                      <span>ANALYZING WITH AI...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                      <span>⚡ AUTO-TRIAGE WITH AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Classification Confirmation & Signals Badge */}
              {aiClassification && (
                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/40 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-purple-800 dark:text-[#C4B5FD] font-bold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>AI PREDICTION CALIBRATED ({Math.round(aiClassification.confidence * 100)}% CONFIDENCE)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      {aiClassification.model || 'emergency-classifier-v1'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400">Detected Signals:</span>
                    {aiClassification.signals?.length > 0 ? (
                      aiClassification.signals.map((sig, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-200 border border-purple-500/30 text-[10px]">
                          #{sig}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">Contextual text markers</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    ✓ Hazard Type, Severity, and SLA Priority automatically set below. You may manually adjust them if needed.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Hazard Type & Severity / Priority Grid (AI-Assigned with Operator Override) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  CLASSIFICATION & OPERATOR OVERRIDE (HUMAN-IN-THE-LOOP)
                </span>
                {aiClassification ? (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> AI Populated
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    Default / Manual
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    HAZARD TYPE
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="FIRE">FIRE</option>
                    <option value="FLOOD">FLOOD</option>
                    <option value="ROAD_ACCIDENT">ROAD ACCIDENT</option>
                    <option value="INDUSTRIAL_ACCIDENT">INDUSTRIAL ACCIDENT</option>
                    <option value="MEDICAL_EMERGENCY">MEDICAL EMERGENCY</option>
                    <option value="EARTHQUAKE">EARTHQUAKE</option>
                    <option value="OTHER">OTHER HAZARD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    SEVERITY
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="CRITICAL">CRITICAL (Threat to Life)</option>
                    <option value="HIGH">HIGH (Severe Threat)</option>
                    <option value="MEDIUM">MEDIUM (Moderate Damage)</option>
                    <option value="LOW">LOW (Controlled / Minor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    SLA PRIORITY
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="P1">P1 (Immediate &lt; 5m)</option>
                    <option value="P2">P2 (Urgent &lt; 10m)</option>
                    <option value="P3">P3 (Priority &lt; 20m)</option>
                    <option value="P4">P4 (Routine &lt; 45m)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location & Geospatial Preset Picker */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>GEOSPATIAL LOCATION & ADDRESS</span>
                </div>
                <div className="flex items-center gap-2">
                  {detectedLocationInfo?.found && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> AI Extracted
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">2DSPHERE INDEXED</span>
                </div>
              </div>

              {/* AI Detected Location notification banner */}
              {detectedLocationInfo?.found && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
                    <div>
                      <span className="font-bold">AI Extracted Location: </span>
                      <span>{detectedLocationInfo.address}</span>
                      <span className="font-mono text-[10px] ml-2 text-emerald-600 dark:text-emerald-400">
                        [{Number(detectedLocationInfo.latitude)?.toFixed(4)}, {Number(detectedLocationInfo.longitude)?.toFixed(4)}]
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Calibrated</span>
                </div>
              )}

              {detectedLocationInfo && !detectedLocationInfo.found && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>No location detected in incident narrative. Please select a preset below or enter address manually.</span>
                </div>
              )}

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-500 py-1">Metro Presets:</span>
                {PRESET_LOCATIONS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/5 hover:bg-teal-500/20 text-[10px] text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-[#2DD4BF] border border-transparent hover:border-teal-500/30 transition-all truncate max-w-xs cursor-pointer"
                  >
                    {p.name.split(' (')[0]}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">STREET ADDRESS / ZONE</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (detectedLocationInfo) setDetectedLocationInfo(null);
                  }}
                  placeholder="e.g. Downtown Vadodara, Gujarat or select a preset..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">LATITUDE (-90 to +90)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="e.g. 22.3072"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">LONGITUDE (-180 to +180)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="e.g. 73.1812"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B0E13] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                CANCEL
              </button>
              <CyberButton
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                icon={isSubmitting ? <Cpu className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              >
                {isSubmitting ? 'DISPATCHING TO MESH...' : 'BROADCAST INCIDENT REPORT'}
              </CyberButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
