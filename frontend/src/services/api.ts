/**
 * Intelligent Emergency Response & Resource Coordination Platform (PS-9)
 * Centralized API Client Service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'ps9_auth_token';

// Token Management
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
};

export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

// Generic HTTP Request Wrapper
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // 401: unauthorized / token invalid
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      removeToken();
      window.dispatchEvent(new CustomEvent('ps9:unauthorized'));
    }

    const errorMessage =
      data?.error?.message ||
      data?.message ||
      (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data;
}

// User Interface
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'FIELD_COORDINATOR' | 'MEDICAL_COORDINATOR';
  department?: string;
  badgeNumber?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await apiRequest<{
      status: string;
      data: {
        token: string;
        user: UserProfile;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res?.data?.token) {
      setToken(res.data.token);
    }
    return res.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    badgeNumber?: string;
    phone?: string;
  }) => {
    const res = await apiRequest<{
      status: string;
      data: {
        token: string;
        user: UserProfile;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return res.data;
  },

  getMe: async () => {
    const res = await apiRequest<{
      status: string;
      data: {
        user: UserProfile;
      };
    }>('/auth/me');
    return res.data.user;
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    } finally {
      removeToken();
    }
  },

  getUsers: async (params?: { role?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiRequest<{
      status: string;
      data: {
        users: UserProfile[];
        pagination?: any;
      };
    }>(`/auth/users${query ? `?${query}` : ''}`);
    return res.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const res = await apiRequest(`/auth/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return res.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await apiRequest(`/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return res.data;
  },
};

// Incidents API
export const incidentsApi = {
  getAll: async (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/incidents${query ? `?${query}` : ''}`);
    return res.data?.incidents || res.data || [];
  },

  getById: async (id: string) => {
    const res = await apiRequest(`/incidents/${id}`);
    return res.data?.incident || res.data;
  },

  create: async (data: any) => {
    const res = await apiRequest('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.incident || res.data;
  },

  update: async (id: string, data: any) => {
    const res = await apiRequest(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data?.incident || res.data;
  },

  delete: async (id: string) => {
    const res = await apiRequest(`/incidents/${id}`, {
      method: 'DELETE',
    });
    return res.data?.incident || res.data;
  },

  updateStatus: async (id: string, status: string, reason?: string) => {
    const res = await apiRequest(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    return res.data?.incident || res.data;
  },

  updateLocation: async (id: string, location: { latitude: number; longitude: number; address: string }) => {
    const res = await apiRequest(`/incidents/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(location),
    });
    return res.data?.incident || res.data;
  },

  getTimeline: async (id: string) => {
    const res = await apiRequest(`/incidents/${id}/timeline`);
    return res.data?.timeline || res.data || [];
  },

  getReports: async (id: string) => {
    const res = await apiRequest(`/incidents/${id}/reports`);
    return res.data?.reports || res.data || [];
  },

  analyze: async (id: string) => {
    const res = await apiRequest<{ status: string; data: { incident: any; aiAnalysis: any } }>(
      `/incidents/${id}/analyze`,
      { method: 'POST' }
    );
    return res.data?.incident || res.data;
  },

  getAiAnalysis: async (id: string) => {
    const res = await apiRequest<{ status: string; data: { aiAnalysis: any } }>(
      `/incidents/${id}/ai-analysis`
    );
    return res.data?.aiAnalysis;
  },

  classifyPreview: async (data: {
    title?: string;
    description: string;
    source?: string;
    metadata?: Record<string, any>;
    location?: any;
  }) => {
    const res = await apiRequest<{
      status: string;
      data: {
        incidentType: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        priority: 'P1' | 'P2' | 'P3' | 'P4';
        confidence: number;
        signals: string[];
        reasoning: Record<string, any>;
        detectedLocation?: {
          found: boolean;
          address?: string;
          latitude?: number;
          longitude?: number;
          rawMention?: string;
          confidence?: number;
        };
        suggestedCorrection?: boolean;
        originalType?: string;
        isLowConfidence?: boolean;
        model: string;
      };
    }>('/incidents/classify-preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  getReviewRequiredQueue: async (params?: { page?: number; limit?: number }) => {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: {
        incidents: any[];
        pagination: any;
      };
    }>(`/incidents/review-required${query ? `?${query}` : ''}`);
    return res.data?.incidents || [];
  },

  review: async (id: string, data: { decision: 'CONFIRM' | 'OVERRIDE'; reason: string; overrides?: any }) => {
    const res = await apiRequest<{
      status: string;
      data: {
        incident: any;
        review: any;
      };
    }>(`/incidents/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.incident || res.data;
  },

  override: async (
    id: string,
    data: { reason: string; overrides?: any; field?: string; newValue?: string }
  ) => {
    const res = await apiRequest<{
      status: string;
      data: {
        incident: any;
        override: any;
      };
    }>(`/incidents/${id}/override`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.incident || res.data;
  },

  addReport: async (
    id: string,
    report: { source?: string; text: string; reliability?: number; reportedBy?: any }
  ) => {
    const res = await apiRequest<{
      status: string;
      data: {
        incident: any;
        totalSources: number;
        newReport: any;
      };
    }>(`/incidents/${id}/reports`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
    return res.data;
  },

  getRelated: async (id: string) => {
    const res = await apiRequest<{
      status: string;
      data: {
        incidentId: string;
        sourceCount: number;
        reports: any[];
        duplicates: any[];
        candidateMatches: any[];
      };
    }>(`/incidents/${id}/related`);
    return res.data;
  },

  merge: async (id: string, duplicateIncidentIds: string[], reason?: string) => {
    const res = await apiRequest<{
      status: string;
      data: {
        canonicalIncident: any;
        mergedIncidentIds: string[];
        mergedCount: number;
        totalSources: number;
      };
    }>(`/incidents/${id}/merge`, {
      method: 'POST',
      body: JSON.stringify({ duplicateIncidentIds, reason }),
    });
    return res.data;
  },

  getRecommendations: async (
    id: string,
    params?: { strategy?: string; maxDistanceKm?: number; limit?: number; refresh?: boolean }
  ) => {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/incidents/${id}/recommendations${query ? `?${query}` : ''}`);
    return res.data;
  },

  assignResources: async (id: string, payload: { resourceIds: string[]; notes?: string }) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/incidents/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getAssignments: async (id: string) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/incidents/${id}/assignments`);
    return res.data;
  },

  getResponseMetrics: async (id: string) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/incidents/${id}/response-metrics`);
    return res.data;
  },
};

// Resource Assignments & Lifecycle Tracking API (Phases 8-14)
export const assignmentsApi = {
  getAll: async (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await apiRequest<{ success: boolean; data: { assignments: any[]; total: number } }>(
      `/assignments${qs ? `?${qs}` : ''}`
    );
    return res.data?.assignments || [];
  },

  getById: async (assignmentId: string) => {
    const res = await apiRequest<{
      status?: string;
      success?: boolean;
      data: { assignment: any };
    }>(`/assignments/${assignmentId}`);
    return res.data?.assignment;
  },

  getForIncident: async (incidentId: string) => {
    const res = await apiRequest<{ success: boolean; data: { assignments: any[] } }>(
      `/incidents/${incidentId}/assignments`
    );
    return res.data?.assignments || [];
  },

  create: async (payload: { incidentId: string; teamId?: string; resourceId?: string; notes?: string }) => {
    const res = await apiRequest<{ success: boolean; data: { assignment: any } }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data?.assignment;
  },

  updateStatus: async (
    assignmentId: string,
    status: 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'ON_SCENE' | 'COMPLETED' | 'CANCELLED',
    notes?: string,
    timestamp?: string
  ) => {
    const res = await apiRequest<{
      status: string;
      data: { assignment: any };
    }>(`/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes, timestamp }),
    });
    return res.data?.assignment;
  },

  dispatch: async (id: string, notes: string = '') => {
    const res = await apiRequest<{ success: boolean; data: { assignment: any } }>(`/assignments/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data?.assignment;
  },

  enRoute: async (id: string, notes: string = '') => {
    const res = await apiRequest<{ success: boolean; data: { assignment: any } }>(`/assignments/${id}/en-route`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data?.assignment;
  },

  arrive: async (id: string, notes: string = '') => {
    const res = await apiRequest<{ success: boolean; data: { assignment: any } }>(`/assignments/${id}/arrive`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data?.assignment;
  },

  complete: async (id: string, notes: string = '') => {
    const res = await apiRequest<{ success: boolean; data: { assignment: any } }>(`/assignments/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data?.assignment;
  },

  release: async (assignmentId: string, notes?: string) => {
    const res = await apiRequest<{
      status: string;
      data: { assignment: any };
    }>(`/assignments/${assignmentId}/release`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data?.assignment;
  },

  cancel: async (assignmentId: string, notes?: string) => {
    const res = await apiRequest<{
      status: string;
      data: { assignment: any };
    }>(`/assignments/${assignmentId}`, {
      method: 'DELETE',
      body: JSON.stringify({ notes }),
    });
    return res.data?.assignment;
  },

  updateTeamLocation: async (teamId: string, latitude: number, longitude: number, address?: string) => {
    const res = await apiRequest<{ success: boolean; data: { team: any } }>(`/teams/${teamId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude, address }),
    });
    return res.data?.team;
  },
};

// Resources API
export const resourcesApi = {
  getAll: async (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/resources${query ? `?${query}` : ''}`);
    return res.data?.resources || res.data || [];
  },

  getById: async (id: string) => {
    const res = await apiRequest(`/resources/${id}`);
    return res.data?.resource || res.data;
  },

  create: async (data: any) => {
    const res = await apiRequest('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.resource || res.data;
  },

  assign: async (id: string, assignment: { incidentId: string; teamId?: string; assignedBy?: string }) => {
    const res = await apiRequest(`/resources/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(assignment),
    });
    return res.data?.resource || res.data;
  },

  release: async (id: string) => {
    const res = await apiRequest(`/resources/${id}/release`, {
      method: 'PATCH',
    });
    return res.data?.resource || res.data;
  },

  updateStatus: async (id: string, status: string) => {
    const res = await apiRequest(`/resources/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data?.resource || res.data;
  },

  updateLocation: async (
    id: string,
    locationData: { latitude: number; longitude: number; status?: string }
  ) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/resources/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(locationData),
    });
    return res.data;
  },
};

// Stations API (Emergency Bases)
export const stationsApi = {
  getAll: async (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: { stations: any[]; count: number };
    }>(`/stations${query ? `?${query}` : ''}`);
    return res.data?.stations || [];
  },

  getById: async (id: string) => {
    const res = await apiRequest<{
      status: string;
      data: { station: any };
    }>(`/stations/${id}`);
    return res.data?.station;
  },

  create: async (data: any) => {
    const res = await apiRequest<{
      status: string;
      data: { station: any };
    }>('/stations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.station;
  },

  update: async (id: string, data: any) => {
    const res = await apiRequest<{
      status: string;
      data: { station: any };
    }>(`/stations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data?.station;
  },

  delete: async (id: string) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/stations/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};

// Routing API
export const routesApi = {
  calculate: async (
    origin: { latitude: number; longitude: number; address?: string },
    destination: { latitude: number; longitude: number; address?: string }
  ) => {
    const res = await apiRequest<{
      status: string;
      data: {
        route: {
          distanceKm: number;
          durationMinutes: number;
          geometry: [number, number][];
          origin: any;
          destination: any;
        };
      };
    }>('/routes/calculate', {
      method: 'POST',
      body: JSON.stringify({ origin, destination }),
    });
    return res.data?.route;
  },
};

// Simulation API
export const simulationApi = {
  getStatus: async () => {
    const res = await apiRequest<{
      status: string;
      data: {
        isSimulationMode: boolean;
        activeMovementsCount: number;
        activeMovements: any[];
      };
    }>('/simulation/status');
    return res.data;
  },

  setMode: async (
    enabled: boolean,
    stepIntervalSeconds?: number,
    speedMultiplier?: number
  ) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>('/simulation/mode', {
      method: 'POST',
      body: JSON.stringify({ enabled, stepIntervalSeconds, speedMultiplier }),
    });
    return res.data;
  },

  dispatchIncident: async (incidentId: string) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/simulation/dispatch/${incidentId}`, {
      method: 'POST',
    });
    return res.data;
  },

  startResourceRoute: async (
    resourceId: string,
    destination: { latitude: number; longitude: number; address?: string },
    incidentId?: string
  ) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/simulation/start-route/${resourceId}`, {
      method: 'POST',
      body: JSON.stringify({ destination, incidentId }),
    });
    return res.data;
  },

  returnResource: async (resourceId: string) => {
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/simulation/return/${resourceId}`, {
      method: 'POST',
    });
    return res.data;
  },
};

// Response Teams API
export const teamsApi = {
  getAll: async (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/teams${query ? `?${query}` : ''}`);
    return res.data?.teams || res.data || [];
  },

  getById: async (id: string) => {
    const res = await apiRequest(`/teams/${id}`);
    return res.data?.team || res.data;
  },

  create: async (data: any) => {
    const res = await apiRequest('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.team || res.data;
  },

  assign: async (id: string, assignment: { incidentId: string; assignedRole?: string; assignedBy?: string }) => {
    const res = await apiRequest(`/teams/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(assignment),
    });
    return res.data?.team || res.data;
  },

  release: async (id: string) => {
    const res = await apiRequest(`/teams/${id}/release`, {
      method: 'PATCH',
    });
    return res.data?.team || res.data;
  },

  updateStatus: async (id: string, status: string) => {
    const res = await apiRequest(`/teams/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data?.team || res.data;
  },
};

// Facilities API
export const facilitiesApi = {
  getAll: async (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: any;
    }>(`/facilities${query ? `?${query}` : ''}`);
    return res.data?.facilities || res.data || [];
  },

  getById: async (id: string) => {
    const res = await apiRequest(`/facilities/${id}`);
    return res.data?.facility || res.data;
  },

  create: async (data: any) => {
    const res = await apiRequest('/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.facility || res.data;
  },

  updateCapacity: async (id: string, capacityData: { capacity?: number; availableCapacity?: number }) => {
    const res = await apiRequest(`/facilities/${id}/capacity`, {
      method: 'PATCH',
      body: JSON.stringify(capacityData),
    });
    return res.data?.facility || res.data;
  },

  updateEmergencyStatus: async (id: string, emergencyStatus: string) => {
    const res = await apiRequest(`/facilities/${id}/emergency-status`, {
      method: 'PATCH',
      body: JSON.stringify({ emergencyStatus }),
    });
    return res.data?.facility || res.data;
  },

  getCapacity: async (): Promise<HospitalCapacityItem[]> => {
    const res = await apiRequest<{ success: boolean; data: HospitalCapacityItem[] }>('/facilities/capacity');
    return res.data;
  },
};

// Audit Logs API
export interface AuditLogItem {
  _id: string;
  userId?: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

export const auditLogsApi = {
  getAll: async (params?: { page?: number; limit?: number; action?: string; entityType?: string }) => {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const res = await apiRequest<{
      status: string;
      data: {
        logs: AuditLogItem[];
        pagination?: any;
      };
    }>(`/audit-logs${query ? `?${query}` : ''}`);
    return res.data?.logs || [];
  },
};

// ==========================================
// PHASES 16-20 API CLIENT EXTENSIONS
// ==========================================

export interface EscalationItem {
  _id?: string;
  escalationId: string;
  incidentId: string;
  level: number;
  ruleId: string;
  reason: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
  targetRole: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: { userId?: string; name?: string; role?: string };
  resolvedAt?: string;
  resolvedBy?: { userId?: string; name?: string; role?: string };
  metadata?: Record<string, any>;
}

export const escalationsApi = {
  getAll: async (params?: { status?: string; level?: number; targetRole?: string; incidentId?: string }) => {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const res = await apiRequest<{ success: boolean; data: { escalations: EscalationItem[]; total: number } }>(
      `/escalations${query ? `?${query}` : ''}`
    );
    return res.data?.escalations || [];
  },

  getActive: async (targetRole?: string) => {
    const query = targetRole ? `?targetRole=${encodeURIComponent(targetRole)}` : '';
    const res = await apiRequest<{ success: boolean; data: { escalations: EscalationItem[] } }>(
      `/escalations/active${query}`
    );
    return res.data?.escalations || [];
  },

  getByIncident: async (incidentId: string) => {
    const res = await apiRequest<{ success: boolean; data: { escalations: EscalationItem[] } }>(
      `/escalations/incident/${incidentId}`
    );
    return res.data?.escalations || [];
  },

  acknowledge: async (escalationId: string) => {
    const res = await apiRequest<{ success: boolean; data: { escalation: EscalationItem } }>(
      `/escalations/${escalationId}/acknowledge`,
      { method: 'POST' }
    );
    return res.data?.escalation;
  },

  resolve: async (escalationId: string, resolutionNotes?: string) => {
    const res = await apiRequest<{ success: boolean; data: { escalation: EscalationItem } }>(
      `/escalations/${escalationId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes }),
      }
    );
    return res.data?.escalation;
  },
};

export interface NotificationApiItem {
  _id?: string;
  notificationId: string;
  userId?: string;
  targetRole: string;
  type: string;
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityType: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export const notificationsApi = {
  getAll: async (params?: { isRead?: boolean; limit?: number; page?: number }) => {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const res = await apiRequest<{
      success: boolean;
      data: {
        notifications: NotificationApiItem[];
        total: number;
        unreadCount: number;
      };
    }>(`/notifications${query ? `?${query}` : ''}`);
    return res.data;
  },

  markAsRead: async (notificationId: string) => {
    const res = await apiRequest<{
      success: boolean;
      data: { success: boolean; notificationId: string; unreadCount: number };
    }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await apiRequest<{
      success: boolean;
      data: { success: boolean; unreadCount: number };
    }>('/notifications/read-all', {
      method: 'PATCH',
    });
    return res.data;
  },
};

export interface AiSummaryResult {
  situation: string;
  currentResponse: string[];
  resourceStatus: string[];
  risks: string[];
  delays: string[];
  recommendedActions: string[];
  generatedAt: string;
}

export interface AiChatResult {
  intent: string;
  answer: string;
  data: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    link?: string | null;
  }>;
  executedTools?: string[];
  verifiedData?: boolean;
  sources: string[];
  generatedAt: string;
}

export const aiApi = {
  getIncidentSummary: async (incidentId: string): Promise<AiSummaryResult> => {
    const res = await apiRequest<{ success: boolean; data: AiSummaryResult }>(
      '/ai/incident-summary',
      {
        method: 'POST',
        body: JSON.stringify({ incidentId }),
      }
    );
    return res.data;
  },

  chat: async (payload: {
    message: string;
    history?: Array<{ sender: string; text: string }>;
    contextIncidentId?: string;
  }): Promise<AiChatResult> => {
    const res = await apiRequest<{ success: boolean; data: AiChatResult }>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },
};

// Phase 15: Alerts API
export const alertsApi = {
  getAll: async (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await apiRequest<{ success: boolean; data: { alerts: any[]; total: number } }>(
      `/alerts${qs ? `?${qs}` : ''}`
    );
    return res.data?.alerts || [];
  },
  getById: async (id: string) => {
    const res = await apiRequest<{ success: boolean; data: { alert: any } }>(`/alerts/${id}`);
    return res.data?.alert;
  },
  acknowledge: async (id: string, note: string = '') => {
    const res = await apiRequest<{ success: boolean; data: { alert: any } }>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    return res.data?.alert;
  },
  resolve: async (id: string, resolution: string = '') => {
    const res = await apiRequest<{ success: boolean; data: { alert: any } }>(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
    return res.data?.alert;
  },
};

// Analytics Interfaces & API (Phase 22, 23, 24)
export interface AnalyticsOverview {
  period: string;
  totalIncidents: number;
  activeIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
  averageArrivalTime: string;
  averageArrivalMinutes: number;
  aiTriageAccuracy: number;
  deduplicationRate: number;
  slaAdherence: number;
  dispatchLatency: string;
  generatedAt: string;
}

export interface AnalyticsCategory {
  name: string;
  value: number;
  color: string;
}

export interface AnalyticsSeverityItem {
  level: string;
  count: number;
  color: string;
}

export interface AnalyticsResponseTime {
  hourlyData: Array<{ hour: string; incidents: number; resolved: number }>;
  responseTimeData: Array<{ zone: string; actual: number; target: number }>;
}

export interface AnalyticsFleetItem {
  category: string;
  active: number;
  reserve: number;
  activeCount?: number;
  reserveCount?: number;
  totalCount?: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  incidentId: string;
  title: string;
  type: string;
  severity: string;
  status: string;
}

export interface ResourceShortageItem {
  resourceType: string;
  required: number;
  available: number;
  shortage: number;
  severity: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface ResourceShortageAnalysis {
  shortages: ResourceShortageItem[];
  criticalCount: number;
  totalDemand: number;
  totalSupply: number;
  activeIncidentsCount: number;
  evaluatedAt: string;
}

export interface HospitalCapacityItem {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  occupancyPercentage: number;
  divertStatus: boolean;
  emergencyStatus: string;
  status?: string;
  icu: {
    total: number;
    available: number;
    occupied: number;
  } | null;
  burn: {
    total: number;
    available: number;
    occupied: number;
  } | null;
  location: string;
}

export const analyticsApi = {
  getOverview: async (params?: { period?: string; from?: string; to?: string }): Promise<AnalyticsOverview> => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: AnalyticsOverview }>(`/analytics/overview${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getIncidents: async (params?: { period?: string; from?: string; to?: string }): Promise<{ total: number; categories: AnalyticsCategory[] }> => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: { total: number; categories: AnalyticsCategory[] } }>(`/analytics/incidents${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getSeverity: async (params?: { period?: string; from?: string; to?: string }): Promise<{ severity: AnalyticsSeverityItem[]; total: number }> => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: { severity: AnalyticsSeverityItem[]; total: number } }>(`/analytics/severity${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getResponseTime: async (params?: { period?: string; from?: string; to?: string }): Promise<AnalyticsResponseTime> => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: AnalyticsResponseTime }>(`/analytics/response-time${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getResources: async (): Promise<{ fleetData: AnalyticsFleetItem[] }> => {
    const res = await apiRequest<{ success: boolean; data: { fleetData: AnalyticsFleetItem[] } }>('/analytics/resources');
    return res.data;
  },

  getDelays: async (params?: { period?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: any }>(`/analytics/delays${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getAreas: async (params?: { period?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: any }>(`/analytics/areas${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getHeatmap: async (params?: { from?: string; to?: string; type?: string; severity?: string }): Promise<HeatmapPoint[]> => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.type) qs.set('type', params.type);
    if (params?.severity) qs.set('severity', params.severity);
    const qStr = qs.toString();
    const res = await apiRequest<{ success: boolean; data: HeatmapPoint[] }>(`/analytics/heatmap${qStr ? `?${qStr}` : ''}`);
    return res.data;
  },

  getResourceShortages: async (): Promise<ResourceShortageAnalysis> => {
    const res = await apiRequest<{ success: boolean; data: ResourceShortageAnalysis }>('/analytics/resource-shortages');
    return res.data;
  },
};
