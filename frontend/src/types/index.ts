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
    value?: string;
    confidence: number;
    subcategory?: string;
    secondaryCategories?: string[];
  };
  severityRating?: {
    level?: IncidentSeverity;
    value?: IncidentSeverity;
    confidence?: number;
    score?: number;
  };
  priorityRating?: {
    level?: IncidentPriority;
    value?: IncidentPriority;
    score?: number;
    slaMinutes?: number;
    reason?: string;
  };
  reason?: string;
  recommendations?: string[];
  riskFactors?: string[];
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

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'COMPLETED'
  | 'RETURNING'
  | 'CANCELLED';

export type StationType =
  | 'FIRE_STATION'
  | 'AMBULANCE_BASE'
  | 'POLICE_STATION'
  | 'RESCUE_BASE'
  | 'DISASTER_RESPONSE_CENTER'
  | 'OTHER';

export interface Station {
  id?: string;
  _id?: string;
  stationId: string;
  name: string;
  type: StationType;
  address: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    geometry?: {
      type: string;
      coordinates: [number, number];
    };
  };
  status: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
  capacity: number;
  assignedResources?: string[];
  contactNumber?: string;
}

export interface RouteData {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [[longitude, latitude]]
  origin?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface LiveResource {
  id?: string;
  _id?: string;
  resourceId: string;
  name: string;
  type: string;
  status:
    | 'AVAILABLE'
    | 'ASSIGNED'
    | 'DISPATCHED'
    | 'EN_ROUTE'
    | 'ON_SCENE'
    | 'COMPLETED'
    | 'RETURNING'
    | 'BUSY'
    | 'OFFLINE';
  stationId?: string;
  homeLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  destinationLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  locationUpdatedAt?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  capabilities: string[];
  capacity: number;
  currentAssignment?: string | null;
  assignedIncidentId?: string | null;
  availability: boolean;
  distanceKm?: number;
  etaMinutes?: number;
}

export interface LiveLocationUpdate {
  resourceId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: string;
  distanceKm?: number;
  etaMinutes?: number;
  timestamp: string;
}

export interface ResourceRecommendation {
  resourceId: string;
  name: string;
  type: string;
  capabilityMatch: number;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  score: number;
  reason: string;
  matchedCapabilities?: string[];
  missingCapabilities?: string[];
  currentLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  capacity?: number;
}

export interface ResourceAssignment {
  id?: string;
  assignmentId: string;
  incidentId: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  status: AssignmentStatus;
  assignedBy?: {
    userId?: string;
    name?: string;
    role?: string;
    email?: string;
  };
  notes?: string;
  capabilities?: string[];
  assignedAt: string;
  dispatchedAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  releasedAt?: string | null;
  cancelledAt?: string | null;
  estimatedDistanceKm?: number;
  estimatedArrivalMinutes?: number;
  actualArrivalMinutes?: number;
  responseTimeMinutes?: number;
  responseDurationMinutes?: number;
  delayMinutes?: number;
  timeline?: Array<{
    status: AssignmentStatus;
    timestamp: string;
    changedBy?: {
      userId?: string;
      name?: string;
      role?: string;
    };
    note?: string;
  }>;
}

export interface ResponseMetrics {
  incidentId: string;
  metrics: {
    avgResponseTimeMinutes: number | null;
    avgDelayMinutes: number;
    onTimeCount: number;
    delayedCount: number;
  };
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  typeBreakdown: Record<
    string,
    {
      count: number;
      completed: number;
      avgResponseTime: number | null;
    }
  >;
}

