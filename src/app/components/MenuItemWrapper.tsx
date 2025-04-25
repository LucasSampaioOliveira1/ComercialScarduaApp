'use client';

import { useAuth } from './AuthProviderWrapper';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import ClientOnly from './ClientOnly';

interface NavigationChild {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  pageName?: string;
}

interface NavigationItem {
  key: string;
  name: string;
  path?: string;
  icon: React.ReactNode;
  type: 'single' | 'dropdown';
  children?: NavigationChild[];
  adminOnly?: boolean;
  pageName?: string;
}

export default function MenuItemWrapper({ 
  item, 
  isAdmin, 
  scrolled 
}: { 
  item: NavigationItem, 
  isAdmin: boolean,
  scrolled: boolean
}) {
  return (
    <ClientOnly>
      <MenuItemContent item={item} isAdmin={isAdmin} scrolled={scrolled} />
    </ClientOnly>
  );
}

function MenuItemContent({ 
  item, 
  isAdmin, 
  scrolled 
}: { 
  item: NavigationItem, 
  isAdmin: boolean,
  scrolled: boolean
}) {
  const { checkPermission } = useAuth();
  const pathname = usePathname();
  
  // Skip admin-only sections for non-admins
  if (item.adminOnly && !isAdmin) return null;
  
  // Se tiver pageName, verificar permissão
  if (item.pageName && !isAdmin && !checkPermission(item.pageName, 'canAccess')) {
    return null;
  }

  // O resto do código para renderizar o item...
  if (item.type === 'single') {
    const isActive = pathname === item.path;
    return (
      <Link 
        href={item.path || '#'}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-all hover:bg-opacity-80 flex items-center ${
          isActive
            ? scrolled 
                ? 'bg-blue-100 text-[#344893] font-semibold' 
                : 'bg-[#4762c7] text-white font-semibold'
            : scrolled 
                ? 'text-[#344893] hover:bg-blue-50' 
                : 'text-white hover:bg-[#4762c7]'
        }`}
      >
        <span className="mr-1.5">{item.icon}</span>
        <span>{item.name}</span>
      </Link>
    );
  }
  
  // Para dropdown
  return null;
}