import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Radio, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#05070D] flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 mb-4 shadow-[0_0_30px_rgba(0,217,255,0.2)]">
          <Radio className="w-8 h-8 animate-pulse text-cyan-400" />
          <span className="absolute -inset-1 rounded-2xl border border-cyan-500/20 animate-ping" />
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-semibold animate-pulse">
          AUTHENTICATING BIOMETRIC CLEARANCE...
        </div>
        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
          EmergenX SECURE MESH // NODE APEX-METRO-01
        </div>
      </div>
    );
  }

  // If unauthenticated, redirect to /login preserving intended path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role check fails, redirect to unauthorized
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" state={{ from: location, requiredRoles: allowedRoles }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
