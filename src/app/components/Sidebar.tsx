'use client';

import { useAuth } from './AuthProviderWrapper';
import Link from "next/link";
import { Home, Package, Users, Truck } from "lucide-react";
import ClientOnly from './ClientOnly';

export default function Sidebar() {
  return (
    <ClientOnly>
      <SidebarContent />
    </ClientOnly>
  );
}

function SidebarContent() {
  const { checkPermission } = useAuth();
  
  const menuItems = [
    {
      name: "Dashboard",
      icon: <Home size={20} />,
      href: "/dashboard",
      pageName: "dashboard" 
    },
    {
      name: "Controle de Patrimônio",
      icon: <Package size={20} />,
      href: "/controlepatrimonio",
      pageName: "patrimonio"
    },
    {
      name: "Colaboradores",
      icon: <Users size={20} />,
      href: "/colaboradores",
      pageName: "colaboradores"
    },
    {
      name: "Fornecedores",
      icon: <Truck size={20} />,
      href: "/fornecedores",
      pageName: "fornecedores"
    }
  ];
  
  return (
    <aside>
      <nav>
        {menuItems.map((item) => (
          // Só mostrar se tiver permissão de acesso ou for a página Dashboard
          (item.pageName === "dashboard" || checkPermission(item.pageName, "canAccess")) && (
            <Link
              key={item.href}
              href={item.href}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          )
        ))}
      </nav>
    </aside>
  );
}