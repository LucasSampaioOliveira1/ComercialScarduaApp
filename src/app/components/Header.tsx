'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Package, Users, Menu, X, ChevronDown,
  Camera, LogOut, AlertTriangle, Building, Settings, ChevronRight, UserCog
} from "lucide-react";
import React from "react";
import { useAuth } from './AuthProviderWrapper';

// Componente ClientOnly simplificado e corrigido
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

// Interfaces para navegação
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

export default function Header() {
  return (
    <ClientOnly>
      <HeaderContent />
    </ClientOnly>
  );
}

function HeaderContent() {
  const { user, logout, checkPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Estados
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("/default-avatar.png");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Refs
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Verificar scroll para mudar estilo do header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Carregar detalhes do usuário
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!token) {
          console.warn("Token não encontrado, redirecionando para login");
          router.push("/");
          return;
        }

        // Carregar dados do localStorage
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log("Dados do usuário:", user);
          setUserName(user.nome || "Usuário");
          setUserPhoto(user.foto || "/default-avatar.png");
          setIsAdmin(user.role === 'ADMIN');
          console.log("Usuário é admin:", user.role === 'ADMIN');
        }

        // Buscar dados atualizados
        const response = await fetch("/api/usuarios", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Erro ${response.status}`);

        const { usuarios } = await response.json();
        const storedUserId = JSON.parse(storedUser || '{}').id;
        const currentUser = usuarios.find((u: any) => u.id === storedUserId);

        if (currentUser) {
          setUserPhoto(currentUser.foto || "/default-avatar.png");
          setUserName(currentUser.nome || "Usuário");
          setIsAdmin(currentUser.role === 'ADMIN');
          
          // Atualizar localStorage
          localStorage.setItem("user", JSON.stringify({
            id: currentUser.id,
            email: currentUser.email,
            nome: currentUser.nome,
            foto: currentUser.foto || "/default-avatar.png",
            role: currentUser.role
          }));
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };

    fetchUserDetails();
  }, [router]);

  // Fechar menus quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && menuOpen) {
        setMenuOpen(false);
      }
      
      if (activeDropdown) {
        const currentRef = dropdownRefs.current[activeDropdown];
        if (currentRef && !currentRef.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef, mobileMenuRef, menuOpen, activeDropdown]);

  // Handlers
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleProfile = () => setProfileOpen(!profileOpen);
  
  const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
      logout();
      router.push("/");
      setLoading(false);
    }, 500);
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification('error', 'Sessão expirada. Por favor, faça login novamente.');
        router.push("/");
        return;
      }

      const files = event.target.files;
      if (!files || !files[0]) return;

      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'A imagem deve ter no máximo 5MB');
        return;
      }

      setLoading(true);
      
      const formData = new FormData();
      formData.append("foto", file);

      const response = await fetch("/api/usuario/foto", {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar foto");
      
      if (data.foto) {
        setUserPhoto(data.foto);
        setProfileOpen(false);

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.foto = data.foto;
          localStorage.setItem("user", JSON.stringify(user));
        }

        showNotification('success', 'Foto atualizada com sucesso!');
      }
    } catch (error) {
      console.error("Erro:", error);
      showNotification('error', error instanceof Error ? error.message : 'Erro ao atualizar foto');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: string, message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 3000);
  };

  const toggleDropdown = (key: string) => {
    setActiveDropdown(prev => prev === key ? null : key);
  };

  // Navegação simplificada e corrigida
  const handleNavigate = (path: string) => {
    console.log("Navegando para:", path);
    setActiveDropdown(null);
    setMenuOpen(false);
    router.push(path);
  };

  // Estrutura de navegação
  const navigationStructure: NavigationItem[] = [
    {
      key: 'home',
      name: 'Home',
      path: '/home',
      icon: <Home size={18} />,
      type: 'single',
      pageName: 'home'
    },
    {
      key: 'patrimonio',
      name: 'Patrimônio',
      path: '/controlepatrimonio',
      icon: <Package size={18} />,
      type: 'single',
      pageName: 'patrimonio'
    },
    {
      key: 'empresas',
      name: 'Empresas',
      path: '/empresas',
      icon: <Building size={18} />,
      type: 'single',
      adminOnly: true,
      pageName: 'empresas'
    },
    {
      key: 'pessoas',
      name: 'Pessoas',
      icon: <Users size={18} />,
      type: 'dropdown',
      children: [
        { 
          name: 'Colaboradores', 
          path: '/colaboradores', 
          icon: <Users size={16} />, 
          pageName: 'colaboradores' 
        },
        { 
          name: 'Controle de Usuários', 
          path: '/controleusuarios', 
          icon: <UserCog size={16} />, 
          adminOnly: true, 
          pageName: 'usuarios' 
        }
      ]
    }
    // Item de Relatórios removido aqui
  ];

  // Renderização dos itens de menu
  const renderMenuItems = () => {
    return navigationStructure.map(item => {
      // Skip para não-admins
      if (item.adminOnly && !isAdmin) return null;
      
      // Skip para usuários sem permissão
      if (!isAdmin && item.pageName && !checkPermission(item.pageName, 'canAccess')) return null;
      
      // Link simples
      if (item.type === 'single') {
        const isActive = pathname === item.path;
        return (
          <div key={item.key} className="relative">
            <button
              onClick={() => handleNavigate(item.path || '#')}
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
            </button>
          </div>
        );
      }
      
      // Dropdown
      if (item.type === 'dropdown' && item.children) {
        // Se for usuário comum, verifique se tem permissão para algum item filho
        if (!isAdmin) {
          const hasPermission = item.children.some(child => 
            (!child.adminOnly && checkPermission(child.pageName || '', 'canAccess'))
          );
          if (!hasPermission) return null;
        }
        
        // Verificar se o caminho atual está dentro deste dropdown
        const isActive = item.children.some(child => pathname === child.path);
        
        return (
          <div 
            key={item.key} 
            className="relative" 
            ref={el => { dropdownRefs.current[item.key] = el; }}
          >
            <button
              onClick={() => toggleDropdown(item.key)}
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
              <ChevronDown 
                size={16} 
                className={`ml-1 transition-transform ${activeDropdown === item.key ? 'transform rotate-180' : ''}`} 
              />
            </button>
            
            {activeDropdown === item.key && (
              <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {item.children.map((childItem) => {
                    // Skip para não-admins
                    if (childItem.adminOnly && !isAdmin) return null;
                    
                    // Skip para usuários sem permissão
                    if (!isAdmin && childItem.pageName && !checkPermission(childItem.pageName, 'canAccess')) {
                      return null;
                    }
                    
                    return (
                      <button 
                        key={childItem.path}
                        onClick={() => handleNavigate(childItem.path)}
                        className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ${
                          pathname === childItem.path ? 'bg-gray-100 font-medium' : ''
                        }`}
                      >
                        <span className="mr-2">{childItem.icon}</span>
                        <span>{childItem.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }
      
      return null;
    });
  };

  return (
    <header 
      className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-white text-[#344893] shadow-lg' 
          : 'bg-[#344893] text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button 
              onClick={() => handleNavigate('/home')}
              className="flex items-center cursor-pointer"
            >
              <img src="/logo.png" alt="Logo" className="h-10 w-10" />
              <span className="ml-2 text-lg font-semibold">Gestão de Patrimônio</span>
            </button>
          </div>
          
          {/* Menu principal - versão desktop */}
          <div className="hidden md:flex items-center space-x-2">
            {renderMenuItems()}
          </div>
          
          {/* Perfil do usuário */}
          <div className="flex items-center">
            {/* Notificações */}
            <AnimatePresence>
              {notification.show && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`fixed top-20 right-4 p-3 rounded-md shadow-lg flex items-center space-x-2 z-50 ${
                    notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {notification.type === 'success' ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center mr-2">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <span>{notification.message}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertTriangle size={18} className="text-red-600 mr-2" />
                      <span>{notification.message}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão do menu mobile */}
            <button 
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-current hover:bg-opacity-10 hover:bg-gray-700 focus:outline-none md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Menu do perfil */}
            <div className="ml-3 relative hidden md:block">
              <div>
                <button
                  onClick={toggleProfile}
                  className={`flex items-center space-x-2 focus:outline-none rounded-md ${
                    profileOpen 
                      ? scrolled 
                          ? 'ring-2 ring-blue-200 bg-blue-50 px-2 py-1' 
                          : 'ring-2 ring-blue-400 bg-[#4762c7] px-2 py-1' 
                      : 'px-2 py-1'
                  } transition-all duration-200`}
                >
                  <div className="flex flex-col items-end mr-2">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs opacity-75">{isAdmin ? "Administrador" : "Usuário"}</span>
                  </div>
                  <img
                    className={`h-8 w-8 rounded-full object-cover border ${
                      profileOpen 
                        ? scrolled 
                            ? 'border-blue-400 shadow-sm' 
                            : 'border-white shadow-sm'
                        : 'border-gray-300'
                    }`}
                    src={userPhoto}
                    alt={`Foto de ${userName}`}
                  />
                </button>
              </div>
              
              {/* Resto do código continua igual... */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    ref={profileRef}
                    className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                      scrolled ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="px-4 py-3 border-b relative">
                      {/* Botão X para fechar */}
                      <button 
                        onClick={() => setProfileOpen(false)} 
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Fechar menu"
                      >
                        <X size={14} />
                      </button>
                      {/* Email do usuário */}
                      <p className="text-xs truncate text-gray-500 pr-5">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <label className={`px-4 py-2 text-sm flex items-center cursor-pointer hover:bg-gray-100 ${scrolled ? 'text-gray-700' : 'text-gray-800'}`}>
                        <Camera size={16} className="mr-2" />
                        <span>Trocar foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                          disabled={loading}
                        />
                      </label>
                    </div>
                    
                    <div className="border-t">
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center ${loading ? 'opacity-60' : 'hover:bg-gray-100'} ${scrolled ? 'text-red-600' : 'text-red-500'}`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent mr-2"></div>
                            <span>Saindo...</span>
                          </>
                        ) : (
                          <>
                            <LogOut size={16} className="mr-2" />
                            <span>Sair</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            ref={mobileMenuRef}
            className={`md:hidden ${
              scrolled ? 'bg-white' : 'bg-[#344893] bg-opacity-95'
            }`}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigationStructure.map((item) => {
                // Skip para não-admins
                if (item.adminOnly && !isAdmin) return null;
                
                // Skip para usuários sem permissão
                if (!isAdmin && item.pageName && !checkPermission(item.pageName, 'canAccess')) return null;
                
                // Link simples
                if (item.type === 'single') {
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavigate(item.path || '#')}
                      className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? scrolled 
                              ? 'bg-blue-100 text-[#344893]' 
                              : 'bg-[#4762c7] text-white'
                          : scrolled 
                              ? 'text-[#344893] hover:bg-gray-100' 
                              : 'text-white hover:bg-[#3a5083]'
                      } flex items-center`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                }
                
                // Dropdown para versão móvel
                if (item.type === 'dropdown' && item.children) {
                  // Verifique se tem permissão para algum filho
                  if (!isAdmin) {
                    const hasPermission = item.children.some(child => 
                      (!child.adminOnly && checkPermission(child.pageName || '', 'canAccess'))
                    );
                    if (!hasPermission) return null;
                  }
                  
                  // Dropdown mobile simplificado - exibe todos os itens filhos diretamente
                  return (
                    <div key={item.key} className="space-y-1 pl-3 border-l-2 border-gray-300 border-opacity-50">
                      <div className={`text-sm font-medium mb-1 ${scrolled ? 'text-gray-600' : 'text-gray-300'}`}>
                        <div className="flex items-center">
                          <span className="mr-2">{item.icon}</span>
                          <span>{item.name}</span>
                        </div>
                      </div>
                      
                      {item.children.map(child => {
                        if (child.adminOnly && !isAdmin) return null;
                        if (!isAdmin && child.pageName && !checkPermission(child.pageName, 'canAccess')) return null;
                        
                        const isChildActive = pathname === child.path;
                        return (
                          <button
                            key={child.path}
                            onClick={() => handleNavigate(child.path)}
                            className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium ${
                              isChildActive
                                ? scrolled 
                                    ? 'bg-blue-100 text-[#344893]' 
                                    : 'bg-[#4762c7] text-white'
                                : scrolled 
                                    ? 'text-[#344893] hover:bg-gray-100' 
                                    : 'text-white hover:bg-[#3a5083]'
                            } flex items-center`}
                          >
                            <span className="mr-2">{child.icon}</span>
                            <span>{child.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
            
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="flex items-center px-5 py-2">
                <div className="flex-shrink-0">
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={userPhoto}
                    alt={`Foto de ${userName}`}
                  />
                </div>
                <div className="ml-3">
                  <div className={`text-base font-medium ${scrolled ? 'text-gray-800' : 'text-white'}`}>{userName}</div>
                  <div className={`text-sm ${scrolled ? 'text-gray-500' : 'text-gray-300'}`}>{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={handleLogout}
                  className={`w-full rounded-md text-left block px-3 py-2 text-base font-medium ${
                    scrolled 
                      ? 'text-red-600 hover:bg-gray-100' 
                      : 'text-red-300 hover:bg-[#3a5083]'
                  } flex items-center`}
                >
                  <LogOut size={16} className="mr-2" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}