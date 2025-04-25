'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Defina os tipos
interface PermissionSettings {
  canAccess: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Permissions {
  [key: string]: PermissionSettings;
}

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  permissions?: Permissions;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  checkPermission: (page: string, permission: 'canAccess' | 'canEdit' | 'canDelete') => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Crie o contexto
const AuthContext = createContext<AuthContextType | null>(null);

// Hook para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// Componente wrapper
export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carrega o usuário do localStorage quando o componente é montado
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!storedUser || !token) {
          setIsLoading(false);
          return;
        }
        
        const user = JSON.parse(storedUser);
        
        // ADICIONE ESTE TRECHO - Buscar permissões do usuário
        if (user.role !== 'ADMIN') {
          try {
            const permissionsResponse = await fetch(`/api/usuarios/permissions?userId=${user.id}`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (permissionsResponse.ok) {
              const { permissions } = await permissionsResponse.json();
              setUser({
                ...user,
                permissions: permissions
              });
              return; // Return após setar o usuário com permissões
            }
          } catch (error) {
            console.error('Erro ao carregar permissões:', error);
          }
        }
        
        setUser(user);
        
      } catch (error) {
        console.error('Erro ao carregar usuário do localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Função para verificar permissões
  const checkPermission = (page: string, permission: 'canAccess' | 'canEdit' | 'canDelete'): boolean => {
    console.log('checkPermission chamado:', {page, permission, userRole: user?.role, isAdmin: user?.role === 'ADMIN'});
    
    // Se não estiver logado, não tem permissão
    if (!user) return false;
    
    // Administradores têm todas as permissões
    if (user.role === 'ADMIN') {
      console.log('É administrador, permitindo acesso');
      return true;
    }
    
    // Se for 'home', permitir acesso a todos os usuários logados
    if (page === 'home' && permission === 'canAccess') {
      return true;
    }
    
    // Verifica na lista de permissões do usuário
    const hasPermission = !!user.permissions?.[page]?.[permission];
    console.log('Permissão do usuário:', hasPermission);
    return hasPermission;
  };

  // Função simplificada de login
  const login = async (email: string, password: string): Promise<boolean> => {
    // Implementação real de login...
    return true;
  };

  // Função de logout
  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      checkPermission,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}