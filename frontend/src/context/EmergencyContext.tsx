import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Incident,
  ResponseTeam,
  HospitalResource,
  EquipmentResource,
  AlertItem,
  NotificationItem,
  IncidentStatus,
} from '../types';
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
  getToken,
} from '../services/api';
import {
  adaptBackendIncidents,
  adaptBackendTeams,
  adaptBackendFacilities,
  adaptBackendResources,
} from '../utils/adapters';

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
  isNotificationsDrawerOpen: boolean;
  setIsNotificationsDrawerOpen: (open: boolean) => void;
  simulateEmergency: (scenarioId: string) => void;
  dispatchTeamToIncident: (teamId: string, incidentId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  escalateIncident: (incidentId: string) => void;
  resolveIncident: (incidentId: string) => void;
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  isLiveBackend: boolean;
  syncWithBackend: () => Promise<void>;
  stats: {
    totalIncidents: number;
    criticalIncidents: number;
    activeTeams: number;
    availableVehicles: number;
    hospitalsAvailable: number;
    delayedResponses: number;
  };
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
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  // Sync state with live backend APIs
  const syncWithBackend = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [incidentsRes, teamsRes, facilitiesRes, resourcesRes] = await Promise.allSettled([
        incidentsApi.getAll(),
        teamsApi.getAll(),
        facilitiesApi.getAll(),
        resourcesApi.getAll(),
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
      }

      setIsLiveBackend(true);
    } catch (err: any) {
      console.warn('Backend live sync deferred:', err.message);
      setIsLiveBackend(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
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

    return {
      totalIncidents,
      criticalIncidents,
      activeTeams,
      availableVehicles,
      hospitalsAvailable,
      delayedResponses,
    };
  }, [incidents, teams, equipment, hospitals]);

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

    // Sync with backend asynchronously
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
  }, []);

  // Escalate Incident
  const escalateIncident = useCallback((incidentId: string) => {
    soundFx.playEmergencyAlert();

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

    // Sync with backend asynchronously
    incidentsApi.update(incidentId, { priority: 'P1', severity: 'CRITICAL' }).catch((err) => {
      console.warn('Backend escalate sync note:', err.message);
    });

    setAlerts((prev) => [
      {
        id: `ALT-${Date.now()}`,
        incidentId,
        severity: 'CRITICAL',
        title: `Incident #${incidentId} Escalated`,
        message: `High-priority escalation triggered. Priority P1 active.`,
        timestamp: 'Just now',
        acknowledged: false,
        requiresEscalation: false,
      },
      ...prev,
    ]);
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

  const updateIncidentStatus = useCallback((incidentId: string, status: IncidentStatus) => {
    soundFx.playClick();
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status } : inc))
    );
    // Sync with backend
    incidentsApi.updateStatus(incidentId, status.toUpperCase()).catch((err) => {
      console.warn('Backend status sync note:', err.message);
    });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    soundFx.playClick();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // FULL EMERGENCY SIMULATION ENGINE (Hackathon Showcase Core)
  const simulateEmergency = useCallback((scenarioId: string) => {
    const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId) || SIMULATION_SCENARIOS[0];
    soundFx.playEmergencyAlert();

    const newId = `ER-${Math.floor(2055 + Math.random() * 900)}`;
    const timeStr = new Date().toTimeString().slice(0, 8);

    const newIncident: Incident = {
      id: newId,
      title: scenario.title,
      type: scenario.type,
      severity: scenario.severity,
      priority: scenario.priority,
      status: 'Analyzing',
      location: {
        name: scenario.zone,
        zone: scenario.zone,
        lat: scenario.lat,
        lng: scenario.lng,
      },
      createdAt: timeStr,
      aiConfidence: 95,
      aiSummary: scenario.description,
      duplicateReportsCount: Math.floor(4 + Math.random() * 5),
      reports: [
        {
          id: `REP-SIM-1`,
          source: 'IoT Thermal Sensor',
          text: `Automated distress packet received from telemetry beacon in ${scenario.zone}.`,
          timestamp: timeStr,
          reliability: 98,
        },
        {
          id: `REP-SIM-2`,
          source: 'Emergency Call (911)',
          text: `Multiple emergency calls reporting rapid escalations at ${scenario.zone}.`,
          timestamp: timeStr,
          reliability: 94,
        },
        {
          id: `REP-SIM-3`,
          source: 'Surveillance Drone',
          text: `Surveillance node locked onto smoke/hazard signature. Real-time video uplink active.`,
          timestamp: timeStr,
          reliability: 99,
        },
      ],
      assignedTeamIds: [],
      timeline: [
        {
          id: `TL-SIM-1`,
          time: timeStr,
          title: 'Emergency Ingested',
          description: `Disaster telemetry synchronized across multi-source sensors.`,
          completed: true,
        },
        {
          id: `TL-SIM-2`,
          time: timeStr,
          title: 'AI Classification: 95% Confidence',
          description: `Categorized as ${scenario.type} with priority rating ${scenario.priority}.`,
          completed: true,
        },
      ],
    };

    // 1. Inject Incident
    setIncidents((prev) => [newIncident, ...prev]);
    setActiveIncidentId(newId);

    // 2. Inject Alert
    setAlerts((prev) => [
      {
        id: `ALT-SIM-${Date.now()}`,
        incidentId: newId,
        severity: 'CRITICAL',
        title: `NEW CRITICAL: ${scenario.title}`,
        message: `${scenario.zone} — Immediate resource deployment recommended by Response AI.`,
        timestamp: 'Just now',
        acknowledged: false,
        requiresEscalation: true,
      },
      ...prev,
    ]);

    // 3. Inject Notification
    setNotifications((prev) => [
      {
        id: `NOTIF-SIM-${Date.now()}`,
        category: 'Critical',
        title: `EMERGENCY ALERT #${newId}`,
        message: `${scenario.title} detected at ${scenario.zone}. AI Classification P1.`,
        timestamp: timeStr.slice(0, 5),
        read: false,
        incidentId: newId,
      },
      ...prev,
    ]);

    // 4. Auto-recommend and dispatch closest available team after 1.5s
    setTimeout(() => {
      setTeams((prevTeams) => {
        const availableCandidate = prevTeams.find(
          (t) => t.status === 'AVAILABLE' && scenario.recommendedTeamTypes.includes(t.type)
        ) || prevTeams.find((t) => t.status === 'AVAILABLE');

        if (availableCandidate) {
          soundFx.playDispatch();

          // update incident
          setIncidents((currentIncidents) =>
            currentIncidents.map((inc) => {
              if (inc.id === newId) {
                return {
                  ...inc,
                  status: 'Responding',
                  assignedTeamIds: [availableCandidate.id],
                  timeline: [
                    ...inc.timeline,
                    {
                      id: `TL-SIM-3`,
                      time: new Date().toTimeString().slice(0, 8),
                      title: `AI Auto-Dispatch: ${availableCandidate.name}`,
                      description: `Mobilized with ETA ${availableCandidate.responseTimeEta || 5} min to ${scenario.zone}.`,
                      completed: true,
                    },
                  ],
                };
              }
              return inc;
            })
          );

          // update team
          return prevTeams.map((t) =>
            t.id === availableCandidate.id
              ? {
                  ...t,
                  status: 'EN_ROUTE',
                  assignedIncidentId: newId,
                  responseTimeEta: 5,
                }
              : t
          );
        }
        return prevTeams;
      });
    }, 1500);
  }, []);

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
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    simulateEmergency,
    dispatchTeamToIncident,
    acknowledgeAlert,
    escalateIncident,
    resolveIncident,
    updateIncidentStatus,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isLiveBackend,
    syncWithBackend,
    stats,
  };

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>;
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};
