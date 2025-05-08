import React, { createContext, useContext, useState, useEffect } from 'react';

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
  permissions: Permissions;
  // ... outros campos que você já tenha
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  checkPermission: (page: string, permission: 'canAccess' | 'canEdit' | 'canDelete') => boolean;
  // ... outros métodos existentes
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Função para verificar permissões
  const checkPermission = (page: string, permission: 'canAccess' | 'canEdit' | 'canDelete'): boolean => {
    // Administradores têm todas as permissões
    if (user?.role === 'ADMIN') return true;
    
    // Se não estiver logado, não tem permissão
    if (!user) return false;
    
    // Verifica na lista de permissões do usuário
    return !!user.permissions?.[page]?.[permission];
  };
  
  // Implementação da função de login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        
        // Buscar informações do usuário, incluindo permissões
        const userResponse = await fetch('/api/status', {
          headers: {
            Authorization: `Bearer ${data.token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Buscar permissões
          if (userData.user) {
            try {
              const permissionsResponse = await fetch(`/api/usuarios?userId=${userData.user.id}`, {
                headers: {
                  Authorization: `Bearer ${data.token}`
                }
              });
              
              if (permissionsResponse.ok) {
                const permissionsData = await permissionsResponse.json();
                setUser({
                  ...userData.user,
                  permissions: permissionsData.user.permissions || {}
                });
              } else {
                setUser(userData.user);
              }
            } catch (error) {
              console.error("Erro ao buscar permissões:", error);
              setUser(userData.user);
            }
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      // Limpar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Outras limpezas
      sessionStorage.clear();
      
      // Limpar estado
      setUser(null);
      
      // Chamar API de logout (opcional, se já estiver fazendo isso no Header)
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }
  };
  
  // Verifica o token ao inicializar
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/status', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.user) {
            // Buscar as permissões do usuário
            try {
              const permissionsResponse = await fetch(`/api/usuarios?userId=${data.user.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              
              if (permissionsResponse.ok) {
                const permissionsData = await permissionsResponse.json();
                
                setUser({
                  ...data.user,
                  permissions: permissionsData.user.permissions || {}
                });
              } else {
                setUser(data.user);
              }
            } catch (error) {
              console.error("Erro ao buscar permissões:", error);
              setUser(data.user);
            }
          }
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyToken();
  }, []);
  
  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      checkPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};