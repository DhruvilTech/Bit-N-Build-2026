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
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data?.incident || res.data;
  },

  updateStatus: async (id: string, status: string) => {
    const res = await apiRequest(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data?.incident || res.data;
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
