'use client';

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { motion } from 'framer-motion';
import { Users, Search, Grid, List, Edit, Eye, EyeOff, Plus, UserPlus, 
  Filter, ChevronDown, ArrowRight, MoreHorizontal, AlertCircle, Lock as LockIcon, Info as InfoIcon } from 'lucide-react';

interface User {
  id: string;
  nome: string;
  sobrenome: string;
  foto: string;
  role: 'ADMIN' | 'USER';
  email: string;
  oculto: boolean;
}

export default function ControleUsuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleUsuarios, setVisibleUsuarios] = useState(6);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    role: 'USER' as 'ADMIN' | 'USER',
    newPassword: '' // Campo adicionado para nova senha
  });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    userId: '',
    action: '',
    message: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admins: 0
  });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Páginas disponíveis no sistema
  const availablePages = [
    { id: 'home', name: 'Home' },
    { id: 'patrimonio', name: 'Controle de Patrimônio' },
    { id: 'empresas', name: 'Empresas' },
    { id: 'colaboradores', name: 'Colaboradores' },
    { id: 'usuarios', name: 'Controle de Usuários' }
  ];

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Primeiro verifica o status do usuário
        const statusResponse = await fetch("/api/status", {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!statusResponse.ok) {
          throw new Error("Falha ao verificar autenticação");
        }

        const statusData = await statusResponse.json();
        
        if (!statusData.success) {
          throw new Error(statusData.message || "Erro na autenticação");
        }

        setIsAdmin(statusData.isAdmin);

        if (!statusData.isAdmin) {
          router.push("/dashboard");
          return;
        }

        // Se for admin, busca os usuários
        const usuariosResponse = await fetch("/api/usuarios", {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!usuariosResponse.ok) {
          throw new Error("Falha ao carregar usuários");
        }

        const usuariosData = await usuariosResponse.json();
        
        if (!usuariosData.usuarios) {
          throw new Error("Formato de dados inválido");
        }

        setUsuarios(usuariosData.usuarios);

        // Calcular estatísticas
        const total = usuariosData.usuarios.length;
        const active = usuariosData.usuarios.filter((user: User) => !user.oculto).length;
        const admins = usuariosData.usuarios.filter((user: User) => user.role === 'ADMIN').length;
        setStats({ total, active, admins });

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        
        // Se o token for inválido, redireciona para login
        if (err instanceof Error && err.message.includes("Token")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const toggleUserVisibility = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: userId,
          action: "toggleVisibility"
        })
      });

      if (!response.ok) throw new Error("Falha ao atualizar usuário");

      const data = await response.json();
      
      if (data.success) {
        const updatedUsers = usuarios.map(user => 
          user.id === userId ? { ...user, oculto: !user.oculto } : user
        );
        setUsuarios(updatedUsers);
        
        // Atualizar estatísticas
        const total = updatedUsers.length;
        const active = updatedUsers.filter(user => !user.oculto).length;
        const admins = updatedUsers.filter(user => user.role === 'ADMIN').length;
        setStats({ total, active, admins });
      }
    } catch (error) {
      console.error("Erro:", error);
      alert(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setConfirmModal({ show: false, userId: '', action: '', message: '' });
    }
  };

  const showConfirmationModal = (userId: string, isHidden: boolean) => {
    setConfirmModal({
      show: true,
      userId,
      action: isHidden ? 'mostrar' : 'excluir',
      message: `Tem certeza que deseja ${isHidden ? 'mostrar' : 'excluir'} este usuário?`
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      nome: user.nome,
      sobrenome: user.sobrenome,
      email: user.email,
      role: user.role,
      newPassword: '' // Inicializa vazio
    });
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const token = localStorage.getItem("token");
      
      // Dados a serem enviados (removendo senha se estiver vazia)
      const dataToSend = {
        ...editForm
      };
      
      // Se não houver nova senha, remova o campo antes de enviar
      if (!editForm.newPassword) {
        delete (dataToSend as { newPassword?: string }).newPassword;
      }

      const response = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingUser.id,
          action: "update",
          data: dataToSend
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar usuário");
      }

      const data = await response.json();
      
      if (data.success) {
        const updatedUsers = usuarios.map(user => 
          user.id === editingUser.id ? { 
            ...user, 
            nome: editForm.nome,
            sobrenome: editForm.sobrenome,
            email: editForm.email,
            role: editForm.role
          } : user
        );
        setUsuarios(updatedUsers);
        
        // Atualizar estatísticas
        const admins = updatedUsers.filter(user => user.role === 'ADMIN').length;
        setStats(prev => ({...prev, admins}));
        
        // Mensagem de feedback específica caso a senha tenha sido alterada
        if (editForm.newPassword) {
          alert(`Senha do usuário ${editForm.nome} alterada com sucesso!`);
        }
        
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Erro:", error);
      alert(error instanceof Error ? error.message : "Erro desconhecido");
    }
  };

  // Função para abrir o modal de permissões
  const openPermissionModal = async (userId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        router.push('/');
        return;
      }
      
      // Valores padrão para todas as páginas
      const defaultPermissions = {
        home: { canAccess: true, canEdit: false, canDelete: false },
        patrimonio: { canAccess: false, canEdit: false, canDelete: false },
        empresas: { canAccess: false, canEdit: false, canDelete: false },
        colaboradores: { canAccess: false, canEdit: false, canDelete: false },
        usuarios: { canAccess: false, canEdit: false, canDelete: false }
      };
      
      console.log("Buscando permissões para userId:", userId);
      
      try {
        // Buscar permissões atuais do usuário
        const response = await fetch(`/api/usuarios/permissions?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log("Status da resposta:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Dados recebidos:", data);
          
          if (data && data.permissions) {
            // Sobrescrever os valores padrão com os valores da API
            Object.keys(data.permissions).forEach(key => {
              defaultPermissions[key as keyof typeof defaultPermissions] = data.permissions[key];
            });
          }
        } else {
          console.warn(`API retornou erro: ${response.status}`);
          // Continua usando defaultPermissions
        }
      } catch (fetchError) {
        console.error("Erro ao buscar permissões:", fetchError);
        // Continua usando defaultPermissions
      }
      
      // Define as permissões (padrão ou obtidas da API)
      setUserPermissions(defaultPermissions);
      
      const user = usuarios.find((usuario) => usuario.id === userId);
      setSelectedUser(user || null);
      setShowPermissionModal(true);
    } catch (error) {
      console.error("Erro no processo:", error);
      toast.error("Erro ao processar permissões");
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar as permissões
const savePermissions = async () => {
  if (!selectedUser) return;
  
  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    // Usar o endpoint específico de permissões
    const response = await fetch("/api/usuarios/permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: selectedUser.id,
        permissions: userPermissions
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      toast.success("Permissões atualizadas com sucesso!");
      setShowPermissionModal(false);
    } else {
      throw new Error(data.error || "Erro desconhecido ao salvar permissões");
    }
  } catch (error) {
    console.error("Erro ao salvar permissões:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao salvar permissões");
  } finally {
    setLoading(false);
  }
};

  // Função para atualizar uma permissão específica
  const updatePermission = (page: string, permission: 'canAccess' | 'canEdit' | 'canDelete', value: boolean) => {
    setUserPermissions((prev: Record<string, { canAccess: boolean; canEdit: boolean; canDelete: boolean }>) => ({
      ...prev,
      [page]: {
      ...prev[page],
      [permission]: value
      }
    }));
    
    // Se estiver removendo acesso à página, remover também as permissões de edição e exclusão
    if (permission === 'canAccess' && !value) {
      setUserPermissions((prev: Record<string, { canAccess: boolean; canEdit: boolean; canDelete: boolean }>) => ({
        ...prev,
        [page]: {
          ...prev[page],
          canEdit: false,
          canDelete: false
        }
      }));
    }
    
    // Se estiver adicionando permissão de edição ou exclusão, garantir que tenha acesso à página
    if ((permission === 'canEdit' || 'canDelete') && value) {
      setUserPermissions((prev: Record<string, { canAccess: boolean; canEdit: boolean; canDelete: boolean }>) => ({
        ...prev,
        [page]: {
          ...prev[page],
          canAccess: true
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-[#344893] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Carregando...
              </span>
            </div>
            <p className="mt-4 text-[#344893] text-xl font-light">Carregando usuários</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center"
          >
            <div className="flex justify-center text-red-500 mb-4">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Ocorreu um erro</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
            >
              Tentar novamente
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center"
          >
            <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-600 mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Acesso restrito</h3>
            <p className="text-gray-600 mb-6">Você não tem permissão para acessar esta página.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition duration-200 shadow-md flex items-center justify-center mx-auto"
            >
              <span>Voltar ao Dashboard</span>
              <ArrowRight size={18} className="ml-2" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const filteredUsuarios = usuarios.filter(usuario => 
    `${usuario.nome} ${usuario.sobrenome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadMore = () => setVisibleUsuarios(prev => prev + 6);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <main className="flex-grow p-4 md:p-6 mt-20 max-w-7xl mx-auto w-full">
        {/* Header com título e estatísticas */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Controle de Usuários</h1>
              <p className="text-gray-600">Gerencie todos os usuários registrados no sistema</p>
            </div>
            
            {/* Badge informativo no lugar do botão */}
            <div className="mt-4 md:mt-0">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-700">Os usuários são criados ao se registrarem</span>
              </span>
            </div>
          </div>
          
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl shadow-sm p-5"
            >
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-blue-100 text-blue-600 mr-4">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Usuários</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl shadow-sm p-5"
            >
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-green-100 text-green-600 mr-4">
                  <Eye size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl shadow-sm p-5"
            >
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-indigo-100 text-indigo-600 mr-4">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Administradores</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Área de filtro e controles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar usuários por nome ou login"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893] shadow-sm"
              />
            </div>

            <div className="flex space-x-2">
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2.5 text-sm font-medium rounded-l-lg flex items-center ${
                    viewMode === 'grid'
                      ? 'bg-[#344893] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <Grid size={16} className="mr-2" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2.5 text-sm font-medium rounded-r-lg flex items-center ${
                    viewMode === 'table'
                      ? 'bg-[#344893] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <List size={16} className="mr-2" />
                  Tabela
                </button>
              </div>
            </div>
          </div>

          {/* Resultados da busca */}
          {searchTerm && (
            <div className="bg-blue-50 mb-4 p-3 rounded-lg flex items-center">
              <Search className="text-blue-500 mr-2" size={16} />
              <span className="text-sm text-blue-700">
                {filteredUsuarios.length} resultados para "{searchTerm}"
              </span>
              <button 
                onClick={() => setSearchTerm('')}
                className="ml-auto text-xs bg-blue-200 hover:bg-blue-300 text-blue-700 py-1 px-2 rounded transition-colors"
              >
                Limpar
              </button>
            </div>
          )}

          {filteredUsuarios.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <div className="mx-auto bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                <Users className="text-gray-400" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Não encontramos nenhum usuário com os critérios de busca especificados.
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-sm bg-[#344893] text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredUsuarios.slice(0, visibleUsuarios).map(usuario => (
                <motion.div 
                  key={usuario.id} 
                  variants={item}
                  whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white rounded-xl border overflow-hidden transform transition-all duration-200 ${
                    usuario.oculto ? 'border-gray-200 bg-gray-50' : 'border-transparent shadow-sm'
                  }`}
                >
                  <div className="relative">
                    <div className="absolute top-0 right-0 mt-3 mr-3">
                      {usuario.oculto && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <EyeOff size={12} className="mr-1" />
                          Oculto
                        </span>
                      )}
                    </div>
                    <div className="h-24 bg-gradient-to-r from-[#344893] to-blue-700 flex items-center justify-center">
                      <div className="h-20 w-20 rounded-full border-4 border-white bg-white shadow-md">
                        <img
                          src={usuario.foto || "/default-avatar.png"}
                          alt={`${usuario.nome} ${usuario.sobrenome}`}
                          className="h-full w-full rounded-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-4">
                    <div className="text-center mb-4">
                      <h3 className="font-medium text-lg text-gray-900">
                        {usuario.nome} {usuario.sobrenome}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{usuario.email}</p>
                    </div>
                    <div className="flex justify-center mb-5">
                      <span className={`px-2.5 py-1 text-xs rounded-full ${
                        usuario.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {usuario.role === 'ADMIN' ? 'Administrador' : 'Usuário comum'}
                      </span>
                    </div>
                    
                    <div className="flex justify-center space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openEditModal(usuario)}
                        className="flex items-center px-3 py-1.5 text-xs bg-[#344893] text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Edit size={12} className="mr-1" />
                        Editar
                      </button>
                      
                      {usuario.role !== 'ADMIN' && (
                        <button
                          onClick={() => openPermissionModal(usuario.id)}
                          className="flex items-center px-3 py-1.5 text-xs bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                        >
                          <LockIcon size={12} className="mr-1" />
                          Permissões
                        </button>
                      )}
                      
                      <button
                        onClick={() => showConfirmationModal(usuario.id, usuario.oculto)}
                        className={`flex items-center px-3 py-1.5 text-xs rounded-md ${
                          usuario.oculto 
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        } transition-colors`}
                      >
                        {usuario.oculto ? (
                          <>
                            <Eye size={12} className="mr-1" />
                            Mostrar
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} className="mr-1" />
                            Excluir
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="overflow-x-auto"
            >
              <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsuarios.slice(0, visibleUsuarios).map((usuario, index) => (
                    <motion.tr 
                      key={usuario.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={usuario.oculto ? 'bg-gray-50' : 'hover:bg-blue-50 transition-colors'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              src={usuario.foto || "/default-avatar.png"}
                              alt={`${usuario.nome} ${usuario.sobrenome}`}
                              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.nome} {usuario.sobrenome}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs rounded-full ${
                          usuario.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {usuario.role === 'ADMIN' ? 'Administrador' : 'Usuário comum'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {usuario.oculto ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <EyeOff size={12} className="mr-1" />
                            Oculto
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye size={12} className="mr-1" />
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(usuario)}
                            className="inline-flex items-center px-2.5 py-1.5 bg-[#344893] text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                          >
                            <Edit size={12} className="mr-1" />
                            Editar
                          </button>
                          
                          {/* Adicione este botão de permissões aqui */}
                          {usuario.role !== 'ADMIN' && (
                            <button
                              onClick={() => openPermissionModal(usuario.id)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors text-xs"
                            >
                              <LockIcon size={12} className="mr-1" />
                              Permissões
                            </button>
                          )}
                          
                          <button
                            onClick={() => showConfirmationModal(usuario.id, usuario.oculto)}
                            className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs ${
                              usuario.oculto 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-red-500 text-white hover:bg-red-600'
                            } transition-colors`}
                          >
                            {usuario.oculto ? (
                              <>
                                <Eye size={12} className="mr-1" />
                                Mostrar
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} className="mr-1" />
                                Excluir
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {filteredUsuarios.length > visibleUsuarios && (
            <div className="mt-6 text-center">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={loadMore}
                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#344893] hover:bg-blue-700 focus:outline-none transition-colors"
              >
                <ChevronDown size={16} className="mr-1" />
                Carregar mais usuários
              </motion.button>
            </div>
          )}
        </motion.div>
      </main>

      {/* Modal de Confirmação */}
      {confirmModal.show && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirmar ação</h3>
            <p className="mb-6 text-gray-600">{confirmModal.message}</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal({ show: false, userId: '', action: '', message: '' })}
                className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleUserVisibility(confirmModal.userId)}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium ${
                  confirmModal.action === 'mostrar' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } transition-colors`}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Edição */}
      {editingUser && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Editar Usuário</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({...editForm, nome: e.target.value})}
                  className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#344893] focus:border-[#344893] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                <input
                  type="text"
                  value={editForm.sobrenome}
                  onChange={(e) => setEditForm({...editForm, sobrenome: e.target.value})}
                  className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#344893] focus:border-[#344893] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                <input
                  type="text"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#344893] focus:border-[#344893] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value as 'ADMIN' | 'USER'})}
                  className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#344893] focus:border-[#344893] transition-colors"
                >
                  <option value="USER">Usuário comum</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              
              {/* Nova seção para alteração de senha */}
              <div className="pt-2">
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <LockIcon size={14} className="text-gray-500 mr-1.5" />
                    Alterar Senha
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Como administrador, você pode definir uma nova senha para este usuário.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                    placeholder="Deixe em branco para não alterar"
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#344893] focus:border-[#344893] transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo 6 caracteres. Deixe em branco para manter a senha atual.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={saveUserEdit}
                className="px-4 py-2 text-sm bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Salvar alterações
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Gerenciamento de Permissões */}
      {showPermissionModal && selectedUser && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Gerenciar Permissões: {selectedUser.nome} {selectedUser.sobrenome}
              </h3>
              <button 
                onClick={() => setShowPermissionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                Defina as permissões de acesso para cada área do sistema.
              </p>
              <div className="flex items-center bg-blue-50 p-3 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <InfoIcon className="text-blue-500" size={18} />
                </div>
                <p className="text-sm text-blue-700">
                  <strong>Como funciona:</strong> Marque as caixas para conceder permissões. 
                  A opção "Acessar" permite que o usuário visualize a página. 
                  "Criar/Editar" permite criar novos itens e editar existentes. 
                  "Excluir" permite remover itens.
                </p>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Página
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acessar
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criar/Editar
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Excluir
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availablePages.map((page) => (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {page.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={userPermissions[page.id]?.canAccess || false}
                            onChange={(e) => updatePermission(page.id, 'canAccess', e.target.checked)}
                            className="h-4 w-4 text-[#344893] focus:ring-[#344893] border-gray-300 rounded"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={userPermissions[page.id]?.canEdit || false}
                            onChange={(e) => updatePermission(page.id, 'canEdit', e.target.checked)}
                            disabled={!userPermissions[page.id]?.canAccess}
                            className={`h-4 w-4 focus:ring-[#344893] border-gray-300 rounded ${
                              userPermissions[page.id]?.canAccess 
                                ? 'text-[#344893]' 
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={userPermissions[page.id]?.canDelete || false}
                            onChange={(e) => updatePermission(page.id, 'canDelete', e.target.checked)}
                            disabled={!userPermissions[page.id]?.canAccess}
                            className={`h-4 w-4 focus:ring-[#344893] border-gray-300 rounded ${
                              userPermissions[page.id]?.canAccess 
                                ? 'text-[#344893]' 
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={savePermissions}
                className="px-4 py-2 text-sm bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Salvar permissões
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}