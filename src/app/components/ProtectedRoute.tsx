'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProviderWrapper'; // Atualize o caminho da importação

interface ProtectedRouteProps {
  children: React.ReactNode;
  pageName: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, pageName }) => {
  const { user, isLoading, checkPermission } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading) {
      // Se não estiver logado, redireciona para login
      if (!user) {
        router.push('/');
        return;
      }
      
      // Se não tiver permissão de acesso, redireciona para dashboard
      if (!checkPermission(pageName, 'canAccess')) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pageName, checkPermission, router]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-[#344893] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Carregando...
          </span>
        </div>
      </div>
    );
  }
  
  // Se não estiver logado ou não tiver permissão, não renderiza nada
  if (!user || !checkPermission(pageName, 'canAccess')) {
    return null;
  }
  
  // Se tiver permissão, renderiza os filhos
  return <>{children}</>;
};

export default ProtectedRoute;