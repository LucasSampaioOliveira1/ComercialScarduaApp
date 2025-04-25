'use client';

import { ReactNode } from 'react';
import { useAuth } from './AuthProviderWrapper'; // Atualize o caminho da importação

interface PermissionGuardProps {
  children: ReactNode;
  pageName: string;
  permission: 'canEdit' | 'canDelete';
  fallback?: ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  pageName,
  permission,
  fallback = null
}) => {
  const { checkPermission } = useAuth();
  
  if (!checkPermission(pageName, permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

export default PermissionGuard;