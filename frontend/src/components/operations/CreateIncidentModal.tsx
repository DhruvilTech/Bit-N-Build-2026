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
  const [latitude, setLatitude] = useState<number>(28.6289);
  const [longitude, setLongitude] = useState<number>(77.2065);
  const [address, setAddress] = useState<string>('Apex Petrochemical Complex, Sector 4');

  // Multi-source specific metadata
  const [sensorId, setSensorId] = useState<string>('IOT-FLIR-09');
  const [temperature, setTemperature] = useState<string>('460');
  const [ppmReading, setPpmReading] = useState<string>('120');
  const [callerName, setCallerName] = useState<string>('');
  const [callerPhone, setCallerPhone] = useState<string>('');
  const [fieldOfficer, setFieldOfficer] = useState<string>('Captain Marcus Rodriguez');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPreset = (preset: (typeof PRESET_LOCATIONS)[0]) => {
    soundFx.playClick();
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setAddress(preset.addr);
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
    if (!address.trim()) {
      setErrorMessage('Valid location address is required.');
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

            {/* Type & Severity / Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  HAZARD TYPE
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
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
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  SEVERITY
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="CRITICAL">CRITICAL (Threat to Life)</option>
                  <option value="HIGH">HIGH (Severe Threat)</option>
                  <option value="MEDIUM">MEDIUM (Moderate Damage)</option>
                  <option value="LOW">LOW (Controlled / Minor)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  SLA PRIORITY
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="P1">P1 (Immediate &lt; 5m)</option>
                  <option value="P2">P2 (Urgent &lt; 10m)</option>
                  <option value="P3">P3 (Priority &lt; 20m)</option>
                  <option value="P4">P4 (Routine &lt; 45m)</option>
                </select>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  INCIDENT TITLE
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
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                  SITUATIONAL SUMMARY & DESCRIPTION
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe active hazard, estimated casualties, perimeter status, and hazardous materials..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-teal-500 dark:focus:border-[#2DD4BF]"
                />
              </div>
            </div>

            {/* Location & Geospatial Preset Picker */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>GEOSPATIAL LOCATION & ADDRESS</span>
                </div>
                <span className="text-[10px] text-slate-500">2DSPHERE INDEXED</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-500 py-1">Metro Presets:</span>
                {PRESET_LOCATIONS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/5 hover:bg-teal-500/20 text-[10px] text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-[#2DD4BF] border border-transparent hover:border-teal-500/30 transition-all truncate max-w-xs"
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
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Sector 4 Industrial Gate, Zone 3"
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
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
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
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
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
