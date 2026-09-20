/**
 * RoleGate — Reusable permission-based render guard (Phase 30 RBAC)
 *
 * Usage:
 *   <RoleGate permission="SIMULATION_START">
 *     <SimulateButton />
 *   </RoleGate>
 *
 *   <RoleGate roles={['ADMIN', 'OPERATOR']} fallback={<ReadOnlyView />}>
 *     <EditableView />
 *   </RoleGate>
 */
import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface RoleGateProps {
  /** Require a specific permission string from the RBAC matrix */
  permission?: string;
  /** OR: require one of these roles directly */
  roles?: string[];
  /** Rendered when access is denied (default: null = render nothing) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  permission,
  roles,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole } = useAuth();

  const hasAccess = (() => {
    if (permission) return hasPermission(permission);
    if (roles && roles.length > 0) return hasRole(...roles);
    return true;
  })();

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
};

export default RoleGate;
