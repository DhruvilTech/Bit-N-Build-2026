export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'New' | 'Analyzing' | 'Assigned' | 'Responding' | 'Resolved' | 'Escalated';

export type IncidentAiStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IncidentAiReasoning {
  incidentType?: string;
  severity?: string;
  priority?: string;
}

export interface IncidentAiOverride {
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  overriddenBy: {
    userId?: string;
    name?: string;
    role?: string;
  };
  overriddenAt: string;
}

export interface IncidentAiHumanReview {
  status: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN';
  reviewedBy?: {
    userId?: string;
    name?: string;
    role?: string;
  } | null;
  reviewedAt?: string | null;
  notes?: string;
  decision?: string;
}

export interface IncidentAiAnalysis {
  incidentType?: string;
  severity?: IncidentSeverity;
  priority?: IncidentPriority;
  confidence?: number;
  signals?: string[];
  reasoning?: IncidentAiReasoning;
  suggestedCorrection?: boolean;
  originalType?: string | null;
  isLowConfidence?: boolean;
  model?: string;
  version?: string;
  status: IncidentAiStatus;
  error?: string | null;
  analyzedAt?: string | null;
  requiresHumanReview?: boolean;
  reviewReason?: string | null;
  classification?: {
    type: string;
    confidence: number;
    subcategory?: string;
    secondaryCategories?: string[];
  };
  severityAnalysis?: {
    level: IncidentSeverity;
    confidence: number;
    score?: number;
    lifeThreat?: boolean;
    propertyDamage?: boolean;
    environmentalHazard?: boolean;
  };
  priorityAnalysis?: {
    level: IncidentPriority;
    score?: number;
    slaMinutes?: number;
    escalationFlag?: boolean;
    reason?: string;
  };
  locationAnalysis?: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    confidence?: number;
  };
  tactical?: {
    hazards?: string[];
    recommendedUnits?: string[];
    responseDelayRisk?: string;
    keySummary?: string;
  };
  duplicate?: {
    isDuplicate: boolean;
    similarity: number;
    relatedIncidentId?: string | null;
  };
  humanReview?: IncidentAiHumanReview;
  original?: {
    type?: string;
    severity?: IncidentSeverity;
    priority?: IncidentPriority;
    confidence?: number;
  };
  final?: {
    type?: string;
    severity?: IncidentSeverity;
    priority?: IncidentPriority;
  };
  overrides?: IncidentAiOverride[];
}

export interface ReportItem {
  id: string;
  source: string;
  text: string;
  timestamp: string;
  reliability: number;
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  completed: boolean;
  event?: string;
  reason?: string;
}

export interface Incident {
  id: string;
  title: string;
  type: string;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  status: IncidentStatus;
  rawStatus?: string;
  rawType?: string;
  source?: string;
  aiAnalysis?: IncidentAiAnalysis;
  reportedBy?: {
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
    badgeNumber?: string;
  };
  metadata?: Record<string, any>;
  resolvedAt?: string | null;
  location: {
    name: string;
    zone: string;
    lat: number;
    lng: number;
  };
  createdAt: string;
  aiConfidence: number;
  aiSummary: string;
  duplicateReportsCount: number;
  sourceCount?: number;
  requiresHumanReview?: boolean;
  duplicateOf?: string | null;
  reports: ReportItem[];
  assignedTeamIds: string[];
  timeline: TimelineEvent[];
  delayDetected?: boolean;
  delayMinutes?: number;
}

export type TeamType = 'Fire' | 'Medical' | 'Police' | 'Rescue' | 'Hazmat';
export type TeamStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_SCENE' | 'BUSY' | 'OFFLINE';

export interface ResponseTeam {
  id: string;
  name: string;
  type: TeamType;
  status: TeamStatus;
  membersCount: number;
  vehicleId: string;
  vehicleName: string;
  location: {
    name: string;
    zone: string;
    lat: number;
    lng: number;
  };
  responseTimeEta: number; // in minutes
  assignedIncidentId?: string;
  batteryOrFuelLevel: number; // percentage
  contactRadioChannel: string;
}

export interface HospitalResource {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  totalBeds: number;
  availableIcuBeds: number;
  burnUnitCapacity: number;
  traumaUnitReady: boolean;
  divertStatus: boolean;
  oxygenReservesPct: number;
}

export interface EquipmentResource {
  id: string;
  name: string;
  category: 'Fire Apparatus' | 'Medical ICU Unit' | 'Tactical Police' | 'Hazmat Neutralizer' | 'Recon Drone';
  status: 'Available' | 'Deployed' | 'Maintenance';
  assignedZone: string;
  capacityMetric: string;
}

export interface AlertItem {
  id: string;
  incidentId?: string;
  severity: 'CRITICAL' | 'WARNING' | 'RESPONSE DELAY' | 'RESOURCE SHORTAGE';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  requiresEscalation: boolean;
}

export interface NotificationItem {
  id: string;
  category: 'Critical' | 'Teams' | 'Resources' | 'System';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  incidentId?: string;
}

export interface EmergencyScenario {
  id: string;
  title: string;
  type: Incident['type'];
  icon: string;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  zone: string;
  description: string;
  lat: number;
  lng: number;
  recommendedTeamTypes: TeamType[];
}
