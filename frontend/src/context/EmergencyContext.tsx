import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Incident,
  ResponseTeam,
  HospitalResource,
  EquipmentResource,
  AlertItem,
  NotificationItem,
  IncidentStatus,
  Station,
  RouteData,
  LiveResource,
} from '../types';
export type { AlertItem, NotificationItem };
import {
  INITIAL_INCIDENTS,
  INITIAL_TEAMS,
  INITIAL_HOSPITALS,
  INITIAL_EQUIPMENT,
  INITIAL_ALERTS,
  INITIAL_NOTIFICATIONS,
  SIMULATION_SCENARIOS,
} from '../data/mockData';
import { soundFx } from '../utils/audio';
import {
  incidentsApi,
  teamsApi,
  resourcesApi,
  facilitiesApi,
  notificationsApi,
  escalationsApi,
  EscalationItem,
  stationsApi,
  routesApi,
  simulationApi,
  SimulationState,
  SimulationEvent,
  alertsApi,
  getToken,
} from '../services/api';
import {
  adaptBackendIncidents,
  adaptBackendTeams,
  adaptBackendFacilities,
  adaptBackendResources,
  mapBackendIncidentStatus,
} from '../utils/adapters';
import { io } from 'socket.io-client';
import { CreateIncidentModal } from '../components/operations/CreateIncidentModal';
import { NotificationToast } from '../components/notifications/NotificationToast';

interface EmergencyContextType {
  incidents: Incident[];
  activeIncidentId: string;
  setActiveIncidentId: (id: string) => void;
  activeIncident: Incident | undefined;
  teams: ResponseTeam[];
  hospitals: HospitalResource[];
  equipment: EquipmentResource[];
  alerts: AlertItem[];
  notifications: NotificationItem[];
  escalations: EscalationItem[];
  activeEscalations: EscalationItem[];
  currentTime: string;
  currentDate: string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  isSimulating: boolean;
  toggleSimulationTimer: () => void;
  isSimulatorModalOpen: boolean;
  setIsSimulatorModalOpen: (open: boolean) => void;
  isCreateIncidentModalOpen: boolean;
  setIsCreateIncidentModalOpen: (open: boolean) => void;
  isNotificationsDrawerOpen: boolean;
  setIsNotificationsDrawerOpen: (open: boolean) => void;
  activeSimulation: SimulationState | null;
  startSimulationEngine: (scenario: string, autoRun?: boolean, stepDelayMs?: number) => Promise<SimulationState>;
  advanceSimulationEngine: () => Promise<SimulationState | null>;
  stopSimulationEngine: () => Promise<SimulationState | null>;
  simulateEmergency: (scenarioId: string) => void;
  dispatchTeamToIncident: (teamId: string, incidentId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  escalateIncident: (incidentId: string, alertId?: string) => Promise<boolean>;
  resolveIncident: (incidentId: string) => void;
  updateIncidentStatus: (incidentId: string, status: string, reason?: string) => Promise<void>;
  createIncident: (data: any) => Promise<any>;
  triggerAiAnalysis: (incidentId: string) => Promise<void>;
  reviewIncident: (id: string, decision: 'CONFIRM' | 'OVERRIDE', reason: string, overrides?: any) => Promise<any>;
  overrideIncident: (id: string, overrides: any, reason: string) => Promise<any>;
  addIncidentReport: (id: string, report: { source?: string; text: string; reliability?: number }) => Promise<any>;
  mergeIncidents: (canonicalId: string, duplicateIds: string[], reason?: string) => Promise<any>;
  getRelatedIncidents: (id: string) => Promise<any>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  activeToast: NotificationItem | null;
  dismissToast: () => void;
  acknowledgeEscalation: (id: string) => Promise<any>;
  resolveEscalation: (id: string, notes?: string) => Promise<any>;
  isLiveBackend: boolean;
  syncWithBackend: () => Promise<void>;
  stations: Station[];
  liveResources: LiveResource[];
  activeRoutes: Record<string, RouteData>;
  isSimulationMode: boolean;
  toggleSimulationMode: (enabled?: boolean) => Promise<any>;
  focusLocation: { lat: number; lng: number } | null;
  setFocusLocation: (loc: { lat: number; lng: number } | null) => void;
  startResourceSimulation: (
    resourceId: string,
    destination: { latitude: number; longitude: number },
    incidentId?: string
  ) => Promise<void>;
  returnResourceToStation: (resourceId: string) => Promise<void>;
  dispatchIncidentSimulation: (incidentId: string) => Promise<void>;
  stats: {
    totalIncidents: number;
    criticalIncidents: number;
    activeTeams: number;
    availableVehicles: number;
    hospitalsAvailable: number;
    delayedResponses: number;
    activeEscalations: number;
    unreadNotifications: number;
  };
  autoDispatchModalData: AutoDispatchModalData | null;
  setAutoDispatchModalData: React.Dispatch<React.SetStateAction<AutoDispatchModalData | null>>;
  triggerAutoDispatch: (incidentId: string) => Promise<any>;
  cancelAutoDispatch: (incidentId: string, reason?: string) => Promise<any>;
  closeAutoDispatchModal: () => void;
}

export interface AutoDispatchModalData {
  isOpen: boolean;
  incident: any;
  dispatchedResources: any[];
  message: string;
  isCancelled?: boolean;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [activeIncidentId, setActiveIncidentId] = useState<string>('ER-2048');
  const [teams, setTeams] = useState<ResponseTeam[]>(INITIAL_TEAMS);
  const [hospitals, setHospitals] = useState<HospitalResource[]>(INITIAL_HOSPITALS);
  const [equipment, setEquipment] = useState<EquipmentResource[]>(INITIAL_EQUIPMENT);
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('ps9_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState<boolean>(false);
  const [isCreateIncidentModalOpen, setIsCreateIncidentModalOpen] = useState<boolean>(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [liveResources, setLiveResources] = useState<LiveResource[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<Record<string, RouteData>>({});
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationState | null>(null);
  const [autoDispatchModalData, setAutoDispatchModalData] = useState<AutoDispatchModalData | null>(null);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const dismissToast = useCallback(() => setActiveToast(null), []);
  const socketRef = React.useRef<any>(null);

  // Socket.IO Real-Time Mesh Integration
  useEffect(() => {
    let socket: any = null;
    try {
      socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('incident:new', (rawIncident: any) => {
        soundFx.playDispatch();
        const adaptedList = adaptBackendIncidents([rawIncident]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => {
            if (prev.some((i) => i.id === adapted.id)) return prev;
            return [adapted, ...prev];
          });
          setActiveIncidentId(adapted.id);
          setNotifications((prev) => [
            {
              id: `NOTIF-${Date.now()}`,
              category: 'Critical',
              title: `🚨 ${adapted.type} Ingested`,
              message: `${adapted.title} - ${adapted.location.name}`,
              timestamp: new Date().toTimeString().slice(0, 5),
              read: false,
              incidentId: adapted.id,
            },
            ...prev,
          ]);
        }
      });

      socket.on('incident:updated', (rawIncident: any) => {
        const adaptedList = adaptBackendIncidents([rawIncident]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      });

      socket.on('incident:statusChanged', (rawIncident: any) => {
        soundFx.playClick();
        const adaptedList = adaptBackendIncidents([rawIncident]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      });

      socket.on('incident:aiProcessing', (payload: any) => {
        const incId = payload.incidentId;
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incId) {
              return {
                ...i,
                aiAnalysis: {
                  ...(i.aiAnalysis || { status: 'PENDING' }),
                  status: 'PROCESSING',
                  error: null,
                },
              };
            }
            return i;
          })
        );
      });

      socket.on('incident:aiAnalyzed', (payload: any) => {
        soundFx.playClick();
        const raw = payload.incident || payload;
        const adaptedList = adaptBackendIncidents([raw]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));

          const conf = adapted.aiAnalysis?.confidence ? Math.round(adapted.aiAnalysis.confidence * 100) : null;
          setNotifications((prev) => [
            {
              id: `NOTIF-AI-${Date.now()}`,
              category: 'Critical',
              title: `🤖 AI Triage: ${adapted.aiAnalysis?.incidentType || adapted.type}`,
              message: `Severity: ${adapted.aiAnalysis?.severity || adapted.severity} • Priority: ${adapted.aiAnalysis?.priority || adapted.priority}${conf ? ` • ${conf}% Confidence` : ''}`,
              timestamp: new Date().toTimeString().slice(0, 5),
              read: false,
              incidentId: adapted.id,
            },
            ...prev,
          ]);
        }
      });

      socket.on('incident:aiFailed', (payload: any) => {
        const incId = payload.incidentId;
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incId) {
              return {
                ...i,
                aiAnalysis: {
                  ...(i.aiAnalysis || { status: 'PENDING' }),
                  status: 'FAILED',
                  error: payload.error || 'AI classification failed',
                },
              };
            }
            return i;
          })
        );
      });

      socket.on('incident:reviewRequired', (payload: any) => {
        soundFx.playEmergencyAlert();
        const incId = payload.incidentId;
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incId) {
              return {
                ...i,
                requiresHumanReview: true,
                aiAnalysis: {
                  ...(i.aiAnalysis || { status: 'COMPLETED' }),
                  requiresHumanReview: true,
                  reviewReason: payload.reason,
                },
              };
            }
            return i;
          })
        );
        setNotifications((prev) => [
          {
            id: `NOTIF-REV-${Date.now()}`,
            category: 'Critical',
            title: `⚠️ Human Review Required: #${incId}`,
            message: payload.reason || 'AI confidence below threshold. Operator verification required.',
            timestamp: new Date().toTimeString().slice(0, 5),
            read: false,
            incidentId: incId,
          },
          ...prev,
        ]);
      });

      // Phase 31: Real-time system health broadcast
      socket.on('system:health', (payload: any) => {
        window.dispatchEvent(new CustomEvent('ps9:systemHealth', { detail: payload }));
      });

      // Phase 32: AI analyzing alias
      socket.on('incident:aiAnalyzing', (payload: any) => {
        const incId = payload.incidentId;
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incId) {
              return {
                ...i,
                aiAnalysis: {
                  ...(i.aiAnalysis || { status: 'PENDING' }),
                  status: 'PROCESSING',
                  error: null,
                },
              };
            }
            return i;
          })
        );
      });

      // Phase 32: AI Fallback activated
      socket.on('incident:aiFallback', (payload: any) => {
        const incId = payload.incidentId;
        const details = payload.fallbackDetails || {};
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incId) {
              return {
                ...i,
                requiresHumanReview: true,
                aiAnalysis: {
                  ...(i.aiAnalysis || { status: 'PENDING' }),
                  status: 'FALLBACK',
                  fallbackUsed: true,
                  errorCode: details.errorCode || 'FALLBACK',
                  failureReason: details.failureReason,
                  requiresHumanReview: true,
                },
              };
            }
            return i;
          })
        );
      });

      // Phase 32: Human review required alias
      socket.on('incident:humanReviewRequired', (payload: any) => {
        const incId = payload.incidentId;
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incId) {
              return {
                ...i,
                requiresHumanReview: true,
                aiAnalysis: {
                  ...(i.aiAnalysis || { status: 'COMPLETED' }),
                  requiresHumanReview: true,
                  reviewReason: payload.reason,
                },
              };
            }
            return i;
          })
        );
      });

      // Phase 34 & 37: Real-time Timeline event created
      socket.on('incident:timelineUpdated', (payload: any) => {
        window.dispatchEvent(new CustomEvent('ps9:timelineUpdated', { detail: payload }));
        const { incidentId, event } = payload;
        if (!incidentId || !event) return;
        setIncidents((prev) =>
          prev.map((i) => {
            if (i.id === incidentId) {
              const newTimeline = [...(i.timeline || []), {
                id: event.timelineId || `TL-${Date.now()}`,
                time: event.timestamp ? new Date(event.timestamp).toLocaleTimeString().slice(0, 8) : 'Just now',
                title: event.event?.replace(/_/g, ' ') || event.title || 'Timeline Event',
                description: event.description || event.reason || 'Event recorded.',
                completed: true,
                event: event.event,
                reason: event.reason,
              }];
              return {
                ...i,
                timeline: newTimeline,
              };
            }
            return i;
          })
        );
      });

      // GPS Tracking & Route events
      socket.on('resource:locationUpdated', (payload: any) => {
        const { resourceId, currentLocation, status, distanceKm, etaMinutes } = payload;
        setLiveResources((prev) =>
          prev.map((r) => {
            if (r.resourceId === resourceId) {
              return {
                ...r,
                currentLocation: currentLocation || r.currentLocation,
                location: currentLocation || r.location,
                status: status || r.status,
                distanceKm: distanceKm !== undefined ? distanceKm : r.distanceKm,
                etaMinutes: etaMinutes !== undefined ? etaMinutes : r.etaMinutes,
              };
            }
            return r;
          })
        );
      });

      socket.on('resource:arrived', (payload: any) => {
        soundFx.playDispatch();
        const { resourceId, incidentId, status } = payload;
        setLiveResources((prev) =>
          prev.map((r) => {
            if (r.resourceId === resourceId) {
              return {
                ...r,
                status: status || 'ON_SCENE',
                etaMinutes: 0,
                distanceKm: 0,
              };
            }
            return r;
          })
        );
        setNotifications((prev) => [
          {
            id: `NOTIF-ARRIVE-${Date.now()}`,
            category: 'Teams',
            title: `📍 Resource Arrived: ${resourceId}`,
            message: `Resource has arrived on-scene${incidentId ? ` at incident #${incidentId}` : ''}. Status: ON_SCENE`,
            timestamp: new Date().toTimeString().slice(0, 5),
            read: false,
            incidentId,
          },
          ...prev,
        ]);
      });

      socket.on('incident:reviewed', (payload: any) => {
        soundFx.playClick();
        const raw = payload.incident || payload;
        const adaptedList = adaptBackendIncidents([raw]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      });

      socket.on('incident:aiOverridden', (payload: any) => {
        soundFx.playClick();
        const raw = payload.incident || payload;
        const adaptedList = adaptBackendIncidents([raw]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      });

      socket.on('incident:merged', (payload: any) => {
        soundFx.playClick();
        const raw = payload.canonicalIncident || payload.incident || payload;
        const mergedIds = payload.mergedIncidentIds || [];
        const adaptedList = adaptBackendIncidents([raw]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) =>
            prev.map((i) => {
              if (i.id === adapted.id) return adapted;
              if (mergedIds.includes(i.id)) {
                return { ...i, status: 'Resolved', rawStatus: 'CANCELLED', duplicateOf: adapted.id };
              }
              return i;
            })
          );
        }
      });

      // Phase 17 & 18: Notification Real-Time Sync
      socket.on('notification:new', (payload: any) => {
        let cat: 'Critical' | 'Teams' | 'Resources' | 'System' = 'System';
        if (
          payload.type === 'CRITICAL_INCIDENT' ||
          payload.type === 'INCIDENT_CRITICAL' ||
          payload.type === 'ESCALATION' ||
          payload.type === 'ALERT_ESCALATED' ||
          payload.severity === 'CRITICAL' ||
          payload.priority === 'CRITICAL'
        ) {
          cat = 'Critical';
          soundFx.playEmergencyAlert();
        } else if (
          payload.type === 'RESOURCE_ASSIGNMENT' ||
          payload.type === 'RESOURCE_ASSIGNED' ||
          payload.type === 'RESOURCE_DISPATCHED' ||
          payload.type === 'RESOURCE_ARRIVED' ||
          payload.type === 'RESPONSE_DELAY' ||
          payload.type === 'ETA_EXCEEDED' ||
          payload.type === 'TEAM_ASSIGNED' ||
          payload.type === 'TEAM_DISPATCHED'
        ) {
          cat = 'Teams';
          soundFx.playDispatch();
        } else if (
          payload.type === 'RESOURCE_SHORTAGE' ||
          payload.type === 'HOSPITAL_CAPACITY_WARNING'
        ) {
          cat = 'Resources';
          soundFx.playDispatch();
        } else {
          soundFx.playClick();
        }

        const item: NotificationItem = {
          id: payload.notificationId || payload._id || payload.id || `NTF-${Date.now()}`,
          category: cat,
          title: payload.title,
          message: payload.message,
          timestamp: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          incidentId: payload.incidentId || (payload.entityType === 'INCIDENT' ? payload.entityId : payload.metadata?.incidentId),
          alertId: payload.alertId || (payload.entityType === 'ALERT' ? payload.entityId : undefined),
          assignmentId: payload.assignmentId || (payload.entityType === 'ASSIGNMENT' ? payload.entityId : undefined),
          resourceId: payload.entityType === 'RESOURCE' ? payload.entityId : undefined,
          severity: payload.severity,
          priority: payload.priority,
          type: payload.type,
        };

        setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);
        setActiveToast(item);
      });

      socket.on('notification:read', (payload: any) => {
        if (payload.all) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } else if (payload.notificationId) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.notificationId ? { ...n, read: true } : n))
          );
        }
      });

      // Phase 16: Escalation Real-Time Sync
      socket.on('escalation:created', (payload: any) => {
        soundFx.playEmergencyAlert();
        const esc: EscalationItem = payload.escalation;
        if (esc) {
          setEscalations((prev) => [esc, ...prev.filter((e) => e.escalationId !== esc.escalationId)]);
        }
      });

      socket.on('escalation:acknowledged', (payload: any) => {
        soundFx.playClick();
        const esc: EscalationItem = payload.escalation;
        if (esc) {
          setEscalations((prev) =>
            prev.map((e) => (e.escalationId === esc.escalationId ? esc : e))
          );
        }
      });

      socket.on('escalation:resolved', (payload: any) => {
        soundFx.playSuccess();
        const esc: EscalationItem = payload.escalation;
        if (esc) {
          setEscalations((prev) =>
            prev.filter((e) => e.escalationId !== esc.escalationId && e._id !== esc._id)
          );
        }
      });

      socket.on('route:created', (payload: any) => {
        const { resourceId, assignmentId, route } = payload;
        if (route && (resourceId || assignmentId)) {
          const key = resourceId || assignmentId;
          setActiveRoutes((prev) => ({
            ...prev,
            [key]: route,
          }));
        }
      });

      socket.on('resource:assigned', (payload: any) => {
        const { resourceId, status, assignmentId } = payload;
        setLiveResources((prev) =>
          prev.map((r) =>
            r.resourceId === resourceId
              ? {
                  ...r,
                  status: status || 'ASSIGNED',
                  currentAssignment: assignmentId || r.currentAssignment,
                  availability: false,
                }
              : r
          )
        );
      });

      socket.on('resource:released', (payload: any) => {
        const { resourceId, status } = payload;
        setLiveResources((prev) =>
          prev.map((r) =>
            r.resourceId === resourceId
              ? {
                  ...r,
                  status: status || 'AVAILABLE',
                  currentAssignment: null,
                  availability: true,
                  etaMinutes: undefined,
                  distanceKm: undefined,
                }
              : r
          )
        );
      });

      socket.on('station:created', (payload: any) => {
        if (payload?.station) {
          setStations((prev) => [...prev, payload.station]);
        }
      });

      socket.on('station:updated', (payload: any) => {
        if (payload?.station) {
          setStations((prev) =>
            prev.map((s) => (s.stationId === payload.station.stationId ? payload.station : s))
          );
        }
      });

      // Simulation Engine Real-Time Listeners (Phase 26)
      socket.on('simulation:started', (sim: SimulationState) => {
        soundFx.playEmergencyAlert();
        setActiveSimulation(sim);
      });

      socket.on('simulation:step', (data: { simulation: SimulationState; event: SimulationEvent }) => {
        if (data?.simulation) setActiveSimulation(data.simulation);
        if (data?.event?.type === 'ESCALATION_TRIGGERED' || data?.event?.type === 'DELAY_DETECTED') {
          soundFx.playEmergencyAlert();
        } else if (data?.event?.type === 'INCIDENT_RESOLVED' || data?.event?.type === 'SIMULATION_COMPLETED') {
          soundFx.playSuccess();
        } else {
          soundFx.playDispatch();
        }
      });

      socket.on('simulation:updated', (sim: SimulationState) => {
        setActiveSimulation(sim);
      });

      socket.on('simulation:completed', (sim: SimulationState) => {
        soundFx.playSuccess();
        setActiveSimulation(sim);
        incidentsApi.getAll({ limit: 50 }).then((res) => {
          if (res?.incidents) setIncidents(adaptBackendIncidents(res.incidents));
        }).catch(() => {});
      });

      socket.on('simulation:stopped', (sim: SimulationState) => {
        setActiveSimulation(sim);
      });

      // Phase 12: Team Live GPS Location
      socket.on('team:location', (payload: any) => {
        setTeams((prev) =>
          prev.map((t) => {
            if (t.id === payload.teamId || t.name?.includes(payload.teamId)) {
              return {
                ...t,
                lat: payload.latitude,
                lng: payload.longitude,
              };
            }
            return t;
          })
        );
      });

      // Phase 13: Assignment Dynamic ETA Update
      socket.on('assignment:etaUpdated', (payload: any) => {
        setTeams((prev) =>
          prev.map((t) => {
            if (t.id === payload.teamId) {
              return {
                ...t,
                etaMinutes: payload.estimatedArrivalMinutes,
              };
            }
            return t;
          })
        );
      });

      // Phase 14: SLA Latency Delay Alert
      socket.on('response:delayed', (payload: any) => {
        soundFx.playWarning();
        setNotifications((prev) => [
          {
            id: `NOTIF-DELAY-${Date.now()}`,
            category: 'Critical',
            title: `⚠️ Response Delayed: Team ${payload.teamId}`,
            message: `Unit is delayed by ${payload.delayMinutes} min past expected SLA for incident #${payload.incidentId}.`,
            timestamp: new Date().toTimeString().slice(0, 5),
            read: false,
            incidentId: payload.incidentId,
          },
          ...prev,
        ]);
      });

      // Phase 15: Emergency Alert Mesh
      socket.on('alert:new', (payload: any) => {
        soundFx.playEmergencyAlert();
        const newAlert: AlertItem = {
          id: payload.alertId || payload.id,
          incidentId: payload.incidentId,
          severity:
            payload.type === 'RESPONSE_DELAY'
              ? 'RESPONSE DELAY'
              : payload.type === 'RESOURCE_SHORTAGE'
              ? 'RESOURCE SHORTAGE'
              : payload.severity === 'CRITICAL'
              ? 'CRITICAL'
              : 'WARNING',
          title: payload.title,
          message: payload.message,
          timestamp: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          acknowledged: payload.status === 'ACKNOWLEDGED' || payload.status === 'RESOLVED',
          requiresEscalation: payload.type === 'ESCALATION_REQUIRED',
        };
        setAlerts((prev) => {
          if (prev.some((a) => a.id === newAlert.id)) return prev;
          return [newAlert, ...prev];
        });
      });

      socket.on('alert:acknowledged', (payload: any) => {
        const id = payload.alertId || payload.id;
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
        );
      });

      socket.on('alert:resolved', (payload: any) => {
        const id = payload.alertId || payload.id;
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      });

      // Autonomous AI City-Scoped Dispatch Event
      socket.on('incident:autoDispatched', (payload: any) => {
        soundFx.playDispatch();
        const { incident, dispatchedResources, message } = payload;
        if (incident) {
          const adaptedList = adaptBackendIncidents([incident]);
          if (adaptedList.length > 0) {
            const adapted = adaptedList[0];
            setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
          }
        }
        setAutoDispatchModalData({
          isOpen: true,
          incident: incident || payload,
          dispatchedResources: dispatchedResources || [],
          message: message || 'AI has automatically assigned city-scoped emergency units.',
          isCancelled: false,
        });
        setNotifications((prev) => [
          {
            id: `NOTIF-AUTO-${Date.now()}`,
            category: 'Critical',
            title: `🤖 AI Auto-Dispatched: ${incident?.incidentId || incident?.id || 'Incident'}`,
            message: `${dispatchedResources?.length || 0} unit(s) dispatched (${incident?.city || 'City'}). Operator override available.`,
            timestamp: new Date().toTimeString().slice(0, 5),
            read: false,
            incidentId: incident?.incidentId || incident?.id,
          },
          ...prev,
        ]);
      });

      // Dispatch Cancelled / Recalled Event
      socket.on('incident:dispatchCancelled', (payload: any) => {
        soundFx.playEmergencyAlert();
        const { incident, recalledResources, message } = payload;
        if (incident) {
          const adaptedList = adaptBackendIncidents([incident]);
          if (adaptedList.length > 0) {
            const adapted = adaptedList[0];
            setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
          }
        }
        setAutoDispatchModalData((prev) =>
          prev
            ? {
                ...prev,
                isCancelled: true,
                message: message || 'Dispatch cancelled by operator. Units recalled to base.',
              }
            : null
        );
        setNotifications((prev) => [
          {
            id: `NOTIF-CANCEL-${Date.now()}`,
            category: 'Critical',
            title: `🛑 Dispatch Cancelled: ${incident?.incidentId || incident?.id || 'Incident'}`,
            message: `${recalledResources?.length || 0} unit(s) recalled to base.`,
            timestamp: new Date().toTimeString().slice(0, 5),
            read: false,
            incidentId: incident?.incidentId || incident?.id,
          },
          ...prev,
        ]);
      });
    } catch (err: any) {
      console.warn('Socket connection deferred:', err.message);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Sync state with live backend APIs
  const syncWithBackend = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [incidentsRes, teamsRes, facilitiesRes, resourcesRes, stationsRes, simRes, notifsRes, escalationsRes, alertsRes] = await Promise.allSettled([
        incidentsApi.getAll(),
        teamsApi.getAll(),
        facilitiesApi.getAll(),
        resourcesApi.getAll(),
        stationsApi.getAll(),
        simulationApi.getStatus(),
        notificationsApi.getAll(),
        escalationsApi.getActive(),
        alertsApi.getAll(),
      ]);

      if (incidentsRes.status === 'fulfilled' && Array.isArray(incidentsRes.value) && incidentsRes.value.length > 0) {
        const adapted = adaptBackendIncidents(incidentsRes.value);
        setIncidents(adapted);
        if (adapted[0]?.id) {
          setActiveIncidentId(adapted[0].id);
        }
      }

      if (teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value) && teamsRes.value.length > 0) {
        setTeams(adaptBackendTeams(teamsRes.value));
      }

      if (facilitiesRes.status === 'fulfilled' && Array.isArray(facilitiesRes.value) && facilitiesRes.value.length > 0) {
        setHospitals(adaptBackendFacilities(facilitiesRes.value));
      }

      if (resourcesRes.status === 'fulfilled' && Array.isArray(resourcesRes.value) && resourcesRes.value.length > 0) {
        setEquipment(adaptBackendResources(resourcesRes.value));
        setLiveResources(resourcesRes.value);
      }

      if (stationsRes.status === 'fulfilled' && Array.isArray(stationsRes.value) && stationsRes.value.length > 0) {
        setStations(stationsRes.value);
      }

      if (simRes.status === 'fulfilled' && simRes.value?.isSimulationMode !== undefined) {
        setIsSimulationMode(simRes.value.isSimulationMode);
      }

      if (notifsRes.status === 'fulfilled' && notifsRes.value?.notifications) {
        const adaptedNotifs: NotificationItem[] = notifsRes.value.notifications.map((n: any) => {
          let cat: 'Critical' | 'Teams' | 'Resources' | 'System' = 'System';
          if (
            n.type === 'CRITICAL_INCIDENT' ||
            n.type === 'INCIDENT_CRITICAL' ||
            n.type === 'ESCALATION' ||
            n.type === 'ALERT_ESCALATED' ||
            n.severity === 'CRITICAL' ||
            n.priority === 'CRITICAL'
          ) {
            cat = 'Critical';
          } else if (
            n.type === 'RESOURCE_ASSIGNMENT' ||
            n.type === 'RESOURCE_ASSIGNED' ||
            n.type === 'RESOURCE_DISPATCHED' ||
            n.type === 'RESOURCE_ARRIVED' ||
            n.type === 'RESPONSE_DELAY' ||
            n.type === 'ETA_EXCEEDED' ||
            n.type === 'TEAM_ASSIGNED' ||
            n.type === 'TEAM_DISPATCHED'
          ) {
            cat = 'Teams';
          } else if (
            n.type === 'RESOURCE_SHORTAGE' ||
            n.type === 'HOSPITAL_CAPACITY_WARNING'
          ) {
            cat = 'Resources';
          }

          return {
            id: n.notificationId || n._id || `NTF-${Date.now()}`,
            category: cat,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: Boolean(n.isRead),
            incidentId: n.incidentId || (n.entityType === 'INCIDENT' ? n.entityId : n.metadata?.incidentId),
            alertId: n.alertId || (n.entityType === 'ALERT' ? n.entityId : undefined),
            assignmentId: n.assignmentId || (n.entityType === 'ASSIGNMENT' ? n.entityId : undefined),
            resourceId: n.entityType === 'RESOURCE' ? n.entityId : undefined,
            severity: n.severity,
            priority: n.priority,
            type: n.type,
          };
        });
        setNotifications(adaptedNotifs);
      }

      if (escalationsRes.status === 'fulfilled' && Array.isArray(escalationsRes.value)) {
        setEscalations(escalationsRes.value);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value) && alertsRes.value.length > 0) {
        const adaptedAlerts: AlertItem[] = alertsRes.value.map((a: any) => ({
          id: a.alertId || a.id,
          incidentId: a.incidentId,
          severity:
            a.type === 'RESPONSE_DELAY'
              ? 'RESPONSE DELAY'
              : a.type === 'RESOURCE_SHORTAGE'
              ? 'RESOURCE SHORTAGE'
              : a.severity === 'CRITICAL'
              ? 'CRITICAL'
              : 'WARNING',
          title: a.title,
          message: a.message,
          timestamp: new Date(a.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          acknowledged: a.status === 'ACKNOWLEDGED' || a.status === 'RESOLVED',
          requiresEscalation: a.type === 'ESCALATION_REQUIRED',
        }));
        setAlerts(adaptedAlerts);
      }

      setIsLiveBackend(true);
    } catch (err: any) {
      console.warn('Backend live sync deferred:', err.message);
      setIsLiveBackend(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();

    const handleAuthChange = () => {
      syncWithBackend();
    };

    window.addEventListener('ps9:auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('ps9:auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [syncWithBackend]);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState<string>('13:42:08');
  const [currentDate] = useState<string>('19 Sep 2026');

  // Sync theme with HTML class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Audio mute sync
  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Live second tick
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Format with 2-digits
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Periodic Telemetry Simulation (vehicle movement & ETA countdown)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTeams((prevTeams) =>
        prevTeams.map((team) => {
          if (team.status === 'EN_ROUTE' && team.responseTimeEta > 0) {
            const nextEta = team.responseTimeEta - 1;
            if (nextEta === 0) {
              soundFx.playDispatch();
              return {
                ...team,
                status: 'ON_SCENE',
                responseTimeEta: 0,
              };
            }
            // slight coordinate drift towards realistic destination
            return {
              ...team,
              responseTimeEta: nextEta,
              location: {
                ...team.location,
                lat: team.location.lat + (Math.random() - 0.5) * 0.0004,
                lng: team.location.lng + (Math.random() - 0.5) * 0.0004,
              },
            };
          }
          return team;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const activeIncident = useMemo(() => {
    return incidents.find((inc) => inc.id === activeIncidentId) || incidents[0];
  }, [incidents, activeIncidentId]);

  // Metrics summary
  const stats = useMemo(() => {
    const totalIncidents = incidents.filter((i) => i.status !== 'Resolved').length;
    const criticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'Resolved').length;
    const activeTeams = teams.filter((t) => t.status === 'EN_ROUTE' || t.status === 'ON_SCENE' || t.status === 'BUSY').length;
    const availableVehicles = teams.filter((t) => t.status === 'AVAILABLE').length + equipment.filter((e) => e.status === 'Available').length;
    const hospitalsAvailable = hospitals.filter((h) => !h.divertStatus && h.availableIcuBeds > 0).length;
    const delayedResponses = incidents.filter((i) => i.delayDetected && i.status !== 'Resolved').length;

    const activeEscalations = escalations.filter((e) => e.status === 'PENDING' || e.status === 'ACKNOWLEDGED').length;
    const unreadNotifications = notifications.filter((n) => !n.read).length;

    return {
      totalIncidents,
      criticalIncidents,
      activeTeams,
      availableVehicles,
      hospitalsAvailable,
      delayedResponses,
      activeEscalations,
      unreadNotifications,
    };
  }, [incidents, teams, equipment, hospitals, escalations, notifications]);

  const toggleTheme = useCallback(() => {
    soundFx.playClick();
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('ps9_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundFx.enabled = next;
      if (next) soundFx.playClick();
      return next;
    });
  }, []);

  const toggleSimulationTimer = useCallback(() => {
    soundFx.playClick();
    setIsSimulating((prev) => !prev);
  }, []);

  // Dispatch Team Action
  const dispatchTeamToIncident = useCallback((teamId: string, incidentId: string) => {
    soundFx.playDispatch();

    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            status: 'EN_ROUTE',
            assignedIncidentId: incidentId,
            responseTimeEta: 5,
          };
        }
        return team;
      })
    );

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          const updatedTeams = Array.from(new Set([...inc.assignedTeamIds, teamId]));
          return {
            ...inc,
            assignedTeamIds: updatedTeams,
            status: inc.status === 'New' || inc.status === 'Analyzing' ? 'Assigned' : inc.status,
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                time: new Date().toTimeString().slice(0, 8),
                title: `Unit Dispatched (${teamId})`,
                description: `Emergency response team mobilized with priority code 1.`,
                completed: true,
              },
            ],
          };
        }
        return inc;
      })
    );

    // Sync with backend asynchronously (Phase 8 Multi-Resource Assignment & Phase 4 Team Assignment)
    incidentsApi.assignResources(incidentId, { resourceIds: [teamId], notes: `Dispatched unit ${teamId} via command center` }).catch((err) => {
      console.warn('Backend incidentsApi assignResources note:', err.message);
    });
    teamsApi.assign(teamId, { incidentId }).catch((err) => {
      console.warn('Backend dispatch sync note:', err.message);
    });

    // Add notification
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        category: 'Teams',
        title: `Unit ${teamId} Dispatched`,
        message: `Assigned to Incident #${incidentId}. Transit underway.`,
        timestamp: new Date().toTimeString().slice(0, 5),
        read: false,
        incidentId,
      },
      ...prev,
    ]);
  }, []);

  // Acknowledge Alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    soundFx.playClick();
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === alertId ? { ...alt, acknowledged: true } : alt))
    );
    alertsApi.acknowledge(alertId).catch((err) => {
      console.warn('Backend alertsApi acknowledge note:', err.message);
    });
  }, []);

  // Escalate Incident
  const escalateIncident = useCallback(async (incidentId: string, alertId?: string): Promise<boolean> => {
    soundFx.playEmergencyAlert();

    // 1. Optimistic Incident state update
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            severity: 'CRITICAL',
            priority: 'P1',
            status: 'Escalated',
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                time: new Date().toTimeString().slice(0, 8),
                title: 'ESCALATED TO P1 CRITICAL',
                description: 'Command authorized level-1 critical escalation and inter-agency mobilization.',
                completed: true,
              },
            ],
          };
        }
        return inc;
      })
    );

    // 2. Optimistic Alert state update: mark the escalation alert as acknowledged/authorized (NO duplicate spam)
    setAlerts((prev) =>
      prev.map((alt) => {
        if (alt.incidentId === incidentId && (alt.id === alertId || alt.requiresEscalation)) {
          return {
            ...alt,
            acknowledged: true,
            requiresEscalation: false,
          };
        }
        return alt;
      })
    );

    // Add a single notification for the command center
    setNotifications((prev) => [
      {
        id: `NOTIF-ESC-${Date.now()}`,
        category: 'Critical',
        title: `🚨 Escalation Authorized: #${incidentId}`,
        message: 'Level-1 Critical Escalation confirmed. Inter-agency mobilization active.',
        timestamp: new Date().toTimeString().slice(0, 5),
        read: false,
        incidentId,
      },
      ...prev,
    ]);

    // 3. Sync with backend asynchronously
    try {
      await incidentsApi.update(incidentId, { priority: 'P1', severity: 'CRITICAL', status: 'ESCALATED' });
    } catch (err: any) {
      console.warn('Backend escalate sync note:', err.message);
    }

    if (alertId) {
      alertsApi.acknowledge(alertId, 'Command authorized level-1 critical escalation').catch((err) => {
        console.warn('Backend alert acknowledge note:', err.message);
      });
    }

    return true;
  }, []);

  // Resolve Incident
  const resolveIncident = useCallback((incidentId: string) => {
    soundFx.playDispatch();

    // Sync with backend asynchronously
    incidentsApi.updateStatus(incidentId, 'RESOLVED').catch((err) => {
      console.warn('Backend resolve sync note:', err.message);
    });

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            status: 'Resolved',
            timeline: [
              ...inc.timeline,
              {
                id: `TL-${Date.now()}`,
                time: new Date().toTimeString().slice(0, 8),
                title: 'Incident Resolved & Secured',
                description: 'All hazards contained. Standdown order issued to field teams.',
                completed: true,
              },
            ],
          };
        }
        return inc;
      })
    );

    // Free up teams assigned to this incident
    setTeams((prev) =>
      prev.map((t) => {
        if (t.assignedIncidentId === incidentId) {
          return {
            ...t,
            status: 'AVAILABLE',
            assignedIncidentId: undefined,
          };
        }
        return t;
      })
    );
  }, []);

  const closeAutoDispatchModal = useCallback(() => {
    setAutoDispatchModalData((prev) => (prev ? { ...prev, isOpen: false } : null));
  }, []);

  const triggerAutoDispatch = useCallback(async (incidentId: string) => {
    soundFx.playDispatch();
    try {
      const data = await incidentsApi.autoDispatch(incidentId);
      if (data?.incident) {
        const adaptedList = adaptBackendIncidents([data.incident]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      }
      setAutoDispatchModalData({
        isOpen: true,
        incident: data?.incident || { id: incidentId },
        dispatchedResources: data?.dispatchedResources || [],
        message: data?.message || 'Autonomous AI dispatch initiated for city-scoped units.',
        isCancelled: false,
      });
      await syncWithBackend();
      return data;
    } catch (err: any) {
      console.warn('triggerAutoDispatch error:', err.message);
      throw err;
    }
  }, [syncWithBackend]);

  const cancelAutoDispatch = useCallback(async (incidentId: string, reason?: string) => {
    soundFx.playEmergencyAlert();
    try {
      const data = await incidentsApi.cancelDispatch(incidentId, reason || 'Operator cancelled dispatch');
      if (data?.incident) {
        const adaptedList = adaptBackendIncidents([data.incident]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      }
      setAutoDispatchModalData((prev) =>
        prev
          ? {
              ...prev,
              isCancelled: true,
              message: data?.message || 'Dispatch revoked by operator. Units returning to staging base.',
            }
          : null
      );
      await syncWithBackend();
      return data;
    } catch (err: any) {
      console.warn('cancelAutoDispatch error:', err.message);
      throw err;
    }
  }, [syncWithBackend]);

  const createIncident = useCallback(async (data: any) => {
    soundFx.playDispatch();
    const created = await incidentsApi.create(data);
    const adaptedList = adaptBackendIncidents([created]);
    if (adaptedList.length > 0) {
      const adapted = adaptedList[0];
      setIncidents((prev) => {
        if (prev.some((i) => i.id === adapted.id)) return prev;
        return [adapted, ...prev];
      });
      setActiveIncidentId(adapted.id);
    }

    // Auto-dispatch city-scoped resources immediately per user requirement
    try {
      const targetId = created.incidentId || created.id || created._id;
      if (targetId) {
        const dispatchRes = await incidentsApi.autoDispatch(targetId);
        if (dispatchRes?.incident) {
          const updAdapted = adaptBackendIncidents([dispatchRes.incident]);
          if (updAdapted.length > 0) {
            setIncidents((prev) => prev.map((i) => (i.id === updAdapted[0].id ? updAdapted[0] : i)));
          }
        }
        setAutoDispatchModalData({
          isOpen: true,
          incident: dispatchRes?.incident || created,
          dispatchedResources: dispatchRes?.dispatchedResources || [],
          message: dispatchRes?.message || 'AI has automatically assigned city-scoped emergency units.',
          isCancelled: false,
        });
      }
    } catch (dispatchErr: any) {
      console.warn('Auto-dispatch on creation note:', dispatchErr.message);
    }

    await syncWithBackend();
    return created;
  }, [syncWithBackend]);

  const triggerAiAnalysis = useCallback(async (incidentId: string) => {
    soundFx.playClick();
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            aiAnalysis: {
              ...(inc.aiAnalysis || { status: 'PENDING' }),
              status: 'PROCESSING',
              error: null,
            },
          };
        }
        return inc;
      })
    );

    try {
      const updated = await incidentsApi.analyze(incidentId);
      if (updated) {
        const adaptedList = adaptBackendIncidents([updated]);
        if (adaptedList.length > 0) {
          const adapted = adaptedList[0];
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err.message);
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id === incidentId) {
            return {
              ...inc,
              aiAnalysis: {
                ...(inc.aiAnalysis || { status: 'PENDING' }),
                status: 'FAILED',
                error: err.message || 'AI analysis request failed',
              },
            };
          }
          return inc;
        })
      );
      throw err;
    }
  }, []);

  const reviewIncident = useCallback(
    async (id: string, decision: 'CONFIRM' | 'OVERRIDE', reason: string, overrides?: any) => {
      soundFx.playClick();
      const res = await incidentsApi.review(id, { decision, reason, overrides });
      const raw = res?.incident || res;
      if (raw) {
        const adapted = adaptBackendIncidents([raw])[0];
        if (adapted) {
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      }
      return res;
    },
    []
  );

  const overrideIncident = useCallback(
    async (id: string, overrides: any, reason: string) => {
      soundFx.playClick();
      const res = await incidentsApi.override(id, { overrides, reason });
      const raw = res?.incident || res;
      if (raw) {
        const adapted = adaptBackendIncidents([raw])[0];
        if (adapted) {
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      }
      return res;
    },
    []
  );

  const addIncidentReport = useCallback(
    async (id: string, report: { source?: string; text: string; reliability?: number }) => {
      soundFx.playClick();
      const res = await incidentsApi.addReport(id, report);
      const raw = res?.incident;
      if (raw) {
        const adapted = adaptBackendIncidents([raw])[0];
        if (adapted) {
          setIncidents((prev) => prev.map((i) => (i.id === adapted.id ? adapted : i)));
        }
      }
      return res;
    },
    []
  );

  const mergeIncidents = useCallback(
    async (canonicalId: string, duplicateIds: string[], reason?: string) => {
      soundFx.playClick();
      const res = await incidentsApi.merge(canonicalId, duplicateIds, reason);
      const raw = res?.canonicalIncident;
      if (raw) {
        const adapted = adaptBackendIncidents([raw])[0];
        if (adapted) {
          setIncidents((prev) =>
            prev.map((i) => {
              if (i.id === adapted.id) return adapted;
              if (duplicateIds.includes(i.id)) {
                return { ...i, status: 'Resolved', rawStatus: 'CANCELLED', duplicateOf: adapted.id };
              }
              return i;
            })
          );
        }
      }
      return res;
    },
    []
  );

  const getRelatedIncidents = useCallback(async (id: string) => {
    return await incidentsApi.getRelated(id);
  }, []);


  const updateIncidentStatus = useCallback(async (incidentId: string, status: string, reason?: string) => {
    soundFx.playClick();
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? { ...inc, status: mapBackendIncidentStatus(status), rawStatus: status }
          : inc
      )
    );
    try {
      await incidentsApi.updateStatus(incidentId, status.toUpperCase(), reason);
      await syncWithBackend();
    } catch (err: any) {
      console.warn('Backend status sync note:', err.message);
    }
  }, [syncWithBackend]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationsApi.markAsRead(id);
    } catch (err: any) {
      console.warn('Backend markAsRead note:', err.message);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    soundFx.playClick();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllAsRead();
    } catch (err: any) {
      console.warn('Backend markAllAsRead note:', err.message);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    soundFx.playClick();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.delete(id);
    } catch (err: any) {
      console.warn('Backend deleteNotification note:', err.message);
    }
  }, []);

  const acknowledgeEscalation = useCallback(async (id: string) => {
    soundFx.playClick();
    const updated = await escalationsApi.acknowledge(id);
    if (updated) {
      setEscalations((prev) =>
        prev.map((e) => (e.escalationId === id || e._id === id ? updated : e))
      );
    }
    return updated;
  }, []);

  const resolveEscalation = useCallback(async (id: string, notes?: string) => {
    soundFx.playSuccess();
    const updated = await escalationsApi.resolve(id, notes);
    if (updated) {
      setEscalations((prev) =>
        prev.filter((e) => e.escalationId !== id && e._id !== id)
      );
    }
    return updated;
  }, []);

  // MASTER EMERGENCY SIMULATION ENGINE (Phase 26 & 27 Real Backend Core)
  const startSimulationEngine = useCallback(
    async (scenario: string, autoRun = false, stepDelayMs = 2500): Promise<SimulationState> => {
      soundFx.playEmergencyAlert();
      try {
        const sim = await simulationApi.start({ scenario, autoRun, stepDelayMs });
        setActiveSimulation(sim);

        if (socketRef.current) {
          socketRef.current.emit('join:simulation', sim.simulationId);
        }

        // Re-sync incidents from backend
        try {
          const res = await incidentsApi.getAll({ limit: 50 });
          if (res?.incidents) {
            const adapted = adaptBackendIncidents(res.incidents);
            setIncidents(adapted);
            if (sim.incidentIds?.[0]) {
              setActiveIncidentId(sim.incidentIds[0]);
            }
          }
        } catch (_) {}

        return sim;
      } catch (err: any) {
        console.error('Failed to start simulation engine:', err);
        throw err;
      }
    },
    []
  );

  const advanceSimulationEngine = useCallback(async (): Promise<SimulationState | null> => {
    if (!activeSimulation) return null;
    soundFx.playClick();
    try {
      const sim = await simulationApi.advance(activeSimulation.simulationId);
      setActiveSimulation(sim);

      // Re-sync incidents on advance
      try {
        const res = await incidentsApi.getAll({ limit: 50 });
        if (res?.incidents) {
          setIncidents(adaptBackendIncidents(res.incidents));
        }
      } catch (_) {}

      return sim;
    } catch (err: any) {
      console.error('Failed to advance simulation:', err);
      throw err;
    }
  }, [activeSimulation]);

  const stopSimulationEngine = useCallback(async (): Promise<SimulationState | null> => {
    if (!activeSimulation) return null;
    soundFx.playClick();
    try {
      const sim = await simulationApi.stop(activeSimulation.simulationId);
      setActiveSimulation(sim);
      return sim;
    } catch (err: any) {
      console.error('Failed to stop simulation:', err);
      throw err;
    }
  }, [activeSimulation]);

  const simulateEmergency = useCallback(
    (scenarioId: string) => {
      let canonical = 'HIGH_RISE_FIRE';
      if (scenarioId === 'SIM-01' || scenarioId === 'CHEMICAL_FACTORY_EXPLOSION') {
        canonical = 'CHEMICAL_FACTORY_EXPLOSION';
      } else if (scenarioId === 'SIM-02' || scenarioId === 'HIGHWAY_TANKER_PILEUP') {
        canonical = 'HIGHWAY_TANKER_PILEUP';
      } else if (scenarioId === 'SIM-03' || scenarioId === 'FLASH_FLOOD') {
        canonical = 'FLASH_FLOOD';
      } else if (scenarioId === 'SIM-04') {
        canonical = 'CHEMICAL_FACTORY_EXPLOSION';
      } else if (scenarioId === 'HIGH_RISE_FIRE') {
        canonical = 'HIGH_RISE_FIRE';
      }

      startSimulationEngine(canonical, false, 2500).catch((err) => {
        console.error('Failed to launch simulation:', err);
      });
    },
    [startSimulationEngine]
  );

  const activeEscalations = useMemo(() => {
    return escalations.filter((e) => e.status === 'PENDING' || e.status === 'ACKNOWLEDGED');
  }, [escalations]);

  const toggleSimulationMode = useCallback(async (enabled?: boolean) => {
    try {
      const nextState = enabled !== undefined ? enabled : !isSimulationMode;
      const res = await simulationApi.setMode(nextState);
      setIsSimulationMode(nextState);
      if (nextState) {
        soundFx.playDispatch();
      }
      return res;
    } catch (err: any) {
      console.warn('Failed to toggle simulation mode:', err.message);
    }
  }, [isSimulationMode]);

  const startResourceSimulation = useCallback(
    async (
      resourceId: string,
      destination: { latitude: number; longitude: number },
      incidentId?: string
    ) => {
      try {
        const res = await simulationApi.startResourceRoute(resourceId, destination, incidentId);
        if (res?.data?.route) {
          setActiveRoutes((prev) => ({
            ...prev,
            [resourceId]: res.data.route,
          }));
        }
      } catch (err: any) {
        console.warn('Failed to start resource simulation:', err.message);
      }
    },
    []
  );

  const returnResourceToStation = useCallback(async (resourceId: string) => {
    try {
      const res = await simulationApi.returnResource(resourceId);
      if (res?.data?.route) {
        setActiveRoutes((prev) => ({
          ...prev,
          [resourceId]: res.data.route,
        }));
      }
    } catch (err: any) {
      console.warn('Failed to return resource to station:', err.message);
    }
  }, []);

  const dispatchIncidentSimulation = useCallback(
    async (incidentId: string) => {
      try {
        soundFx.playDispatch();
        await simulationApi.dispatchIncident(incidentId);
        await syncWithBackend();
      } catch (err: any) {
        console.warn('Failed to auto-dispatch incident:', err.message);
      }
    },
    [syncWithBackend]
  );

  const value = {
    incidents,
    activeIncidentId,
    setActiveIncidentId,
    activeIncident,
    teams,
    hospitals,
    equipment,
    alerts,
    notifications,
    escalations,
    activeEscalations,
    currentTime,
    currentDate,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    isSimulating,
    toggleSimulationTimer,
    isSimulatorModalOpen,
    setIsSimulatorModalOpen,
    isCreateIncidentModalOpen,
    setIsCreateIncidentModalOpen,
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    activeSimulation,
    startSimulationEngine,
    advanceSimulationEngine,
    stopSimulationEngine,
    simulateEmergency,
    dispatchTeamToIncident,
    acknowledgeAlert,
    escalateIncident,
    resolveIncident,
    updateIncidentStatus,
    createIncident,
    triggerAiAnalysis,
    reviewIncident,
    overrideIncident,
    addIncidentReport,
    mergeIncidents,
    getRelatedIncidents,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    activeToast,
    dismissToast,
    acknowledgeEscalation,
    resolveEscalation,
    isLiveBackend,
    syncWithBackend,
    stations,
    liveResources,
    activeRoutes,
    isSimulationMode,
    toggleSimulationMode,
    focusLocation,
    setFocusLocation,
    startResourceSimulation,
    returnResourceToStation,
    dispatchIncidentSimulation,
    stats,
    autoDispatchModalData,
    setAutoDispatchModalData,
    triggerAutoDispatch,
    cancelAutoDispatch,
    closeAutoDispatchModal,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
      <NotificationToast notification={activeToast} onDismiss={dismissToast} />
      <CreateIncidentModal
        isOpen={isCreateIncidentModalOpen}
        onClose={() => setIsCreateIncidentModalOpen(false)}
      />
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};
