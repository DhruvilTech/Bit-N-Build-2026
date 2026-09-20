import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getToken, setToken, removeToken, UserProfile } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<UserProfile>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    badgeNumber?: string;
    phone?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session from token
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = getToken();
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getMe();
        if (isMounted) {
          setUser(currentUser);
          setTokenState(storedToken);
        }
      } catch (err: any) {
        console.warn('Auth token verification failed:', err.message);
        removeToken();
        if (isMounted) {
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen to unauthorized event dispatched from apiRequest
    const handleUnauthorized = () => {
      setUser(null);
      setTokenState(null);
      setError('Session expired. Please log in again.');
    };

    window.addEventListener('ps9:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('ps9:unauthorized', handleUnauthorized);
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login(credentials);
      setUser(result.user);
      setTokenState(result.token);
      window.dispatchEvent(new Event('ps9:auth-change'));
      return result.user;
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    badgeNumber?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.register(data);
      setUser(result.user);
      setTokenState(result.token);
      window.dispatchEvent(new Event('ps9:auth-change'));
      return result.user;
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      window.dispatchEvent(new Event('ps9:auth-change'));
    }
  }, []);

  const hasRole = useCallback((...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;

    const permissionsMap: Record<string, string[]> = {
      OPERATOR: [
        'INCIDENT_CREATE', 'INCIDENT_READ', 'INCIDENT_UPDATE', 'INCIDENT_RESOLVE',
        'RESOURCE_READ', 'RESOURCE_ASSIGN', 'RESOURCE_RELEASE',
        'TEAM_READ', 'TEAM_ASSIGN',
        'FACILITY_READ', 'FACILITY_UPDATE',
        'ESCALATION_READ', 'ESCALATION_TRIGGER', 'ESCALATION_ACKNOWLEDGE', 'ESCALATION_RESOLVE',
        'NOTIFICATION_READ', 'NOTIFICATION_CREATE',
        'AI_ANALYZE', 'AI_OVERRIDE', 'AI_CHAT',
        'SIMULATION_READ', 'SIMULATION_START', 'SIMULATION_ADVANCE', 'SIMULATION_STOP',
        'AUDIT_READ', 'ANALYTICS_READ',
      ],
      FIELD_COORDINATOR: [
        'INCIDENT_READ', 'INCIDENT_UPDATE', 'RESOURCE_READ', 'RESOURCE_UPDATE',
        'TEAM_READ', 'TEAM_UPDATE', 'FACILITY_READ', 'ESCALATION_READ',
        'NOTIFICATION_READ', 'ANALYTICS_READ', 'SIMULATION_READ',
      ],
      MEDICAL_COORDINATOR: [
        'INCIDENT_READ', 'RESOURCE_READ', 'TEAM_READ', 'FACILITY_READ',
        'FACILITY_UPDATE', 'ESCALATION_READ', 'NOTIFICATION_READ',
        'ANALYTICS_READ', 'SIMULATION_READ',
      ],
      RESPONDER: [
        'INCIDENT_READ', 'RESOURCE_READ', 'RESOURCE_UPDATE', 'TEAM_READ',
        'TEAM_UPDATE', 'FACILITY_READ', 'ESCALATION_READ', 'NOTIFICATION_READ',
        'SIMULATION_READ',
      ],
      VIEWER: [
        'INCIDENT_READ', 'RESOURCE_READ', 'TEAM_READ', 'FACILITY_READ',
        'ESCALATION_READ', 'NOTIFICATION_READ', 'ANALYTICS_READ',
        'SIMULATION_READ',
      ],
    };

    const allowed = permissionsMap[user.role] || [];
    return allowed.includes(permission);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
