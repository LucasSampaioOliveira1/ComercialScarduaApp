"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { 
  Plus, Search, FileText, Edit, Trash2, Eye, 
  EyeOff, Building, ArrowLeft, ArrowRight, Filter, X, Check, XCircle, RefreshCw,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Empresa {
  id: number;
  numero: string | null;
  nomeEmpresa: string;
  cnpj: string | null;
  cidade: string | null;
  oculto: boolean;
  criadoPorId?: string;
  criadoPor?: {
    id: string;
    nome: string;
    email?: string;
  };
  colaboradores?: { id: number; nome: string; sobrenome: string }[];
  createdAt?: string;
}

interface Pagination {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState({
    id: 0,
    numero: '',
    nomeEmpresa: '',
    cnpj: '',
    cidade: ''
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    pages: 0,
    page: 1,
    limit: 10
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  // Verificação de Autenticação e de Admin
  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }

    // Verificar se o usuário é admin
    const checkAdmin = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.role === 'ADMIN') {
            setIsAdmin(true);
            // Carrega empresas se for admin
            await fetchEmpresas();
          } else {
            // Redireciona se não for admin
            toast.error("Acesso restrito a administradores");
            router.push('/home');
          }
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error("Erro ao verificar permissões:", err);
        setError("Erro ao verificar permissões");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [token, router, refreshTrigger]);

  // Buscar empresas com filtros e paginação
  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        mostrarOcultos: mostrarOcultos.toString()
      });
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/empresas?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao carregar empresas');
      }
      
      const data = await response.json();
      setEmpresas(data.empresas);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar empresas:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar empresas");
      toast.error("Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  };

  // Fechar modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Formatar CNPJ
  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const formatted = digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
    return formatted;
  };

  // Manipular mudanças nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Tratamento especial para CNPJ
    if (name === 'cnpj') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 14) {
        if (digits.length === 14) {
          setFormData({ ...formData, cnpj: formatCNPJ(digits) });
        } else {
          setFormData({ ...formData, cnpj: digits });
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Abrir modal para criar nova empresa
  const openCreateModal = () => {
    setFormData({
      id: 0,
      numero: '',
      nomeEmpresa: '',
      cnpj: '',
      cidade: ''
    });
    setModalMode('create');
    setShowModal(true);
  };

  // Abrir modal para editar empresa existente
  const openEditModal = (empresa: Empresa) => {
    setCurrentEmpresa(empresa);
    setFormData({
      id: empresa.id,
      numero: empresa.numero || '',
      nomeEmpresa: empresa.nomeEmpresa,
      cnpj: empresa.cnpj || '',
      cidade: empresa.cidade || ''
    });
    setModalMode('edit');
    setShowModal(true);
  };

  // Salvar empresa (criar ou editar)
  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeEmpresa.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    
    try {
      const url = '/api/empresas';
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ao ${modalMode === 'create' ? 'criar' : 'atualizar'} empresa`);
      }
      
      const result = await response.json();
      
      if (modalMode === 'create') {
        toast.success(
          <div className="flex items-center">
            <div className="mr-3 bg-green-100 p-2 rounded-full">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium">Empresa criada com sucesso!</p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{result.nomeEmpresa}</span> foi adicionada ao sistema.
              </p>
            </div>
          </div>,
          {
            icon: false,
            closeButton: true,
            className: "border-l-4 border-green-500"
          }
        );
      } else {
        toast.success(
          <div className="flex items-center">
            <div className="mr-3 bg-blue-100 p-2 rounded-full">
              <RefreshCw size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Empresa atualizada!</p>
              <p className="text-sm text-gray-600">
                As informações de <span className="font-medium">{result.nomeEmpresa}</span> foram atualizadas com sucesso.
              </p>
            </div>
          </div>,
          {
            icon: false,
            closeButton: true,
            className: "border-l-4 border-blue-500"
          }
        );
      }
      setShowModal(false);
      setRefreshTrigger(prev => prev + 1); // Recarregar lista
    } catch (error: any) {
      console.error("Erro ao salvar empresa:", error);
      toast.error(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium">Falha ao {modalMode === 'create' ? 'criar' : 'atualizar'} empresa</p>
            <p className="text-sm text-gray-600">{error.message}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-red-500"
        }
      );
    }
  };

  // Excluir (ocultar) empresa
  const handleDeleteEmpresa = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/empresas?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir empresa");
      }
      
      const empresaExcluida = empresas.find(e => e.id === id);
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium">Empresa excluída</p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{empresaExcluida?.nomeEmpresa}</span> foi removida com sucesso.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-red-500"
        }
      );
      setRefreshTrigger(prev => prev + 1); // Recarregar lista
    } catch (error: any) {
      console.error("Erro ao excluir empresa:", error);
      toast.error(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium">Falha ao excluir empresa</p>
            <p className="text-sm text-gray-600">{error.message}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-red-500"
        }
      );
    }
  };

  // Lidar com mudança de página
  const changePage = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  // Gerar links de paginação
  const renderPaginationLinks = () => {
    const links = [];
    const { page, pages } = pagination;
    
    // Anterior
    links.push(
      <button
        key="prev"
        onClick={() => changePage(page - 1)}
        disabled={page === 1}
        className={`px-3 py-1 rounded-md ${
          page === 1
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-[#344893] hover:bg-blue-50'
        }`}
        aria-label="Página anterior"
      >
        <ArrowLeft size={18} />
      </button>
    );
    
    // Links numéricos
    const maxLinks = 5;
    let startPage = Math.max(1, page - Math.floor(maxLinks / 2));
    let endPage = Math.min(pages, startPage + maxLinks - 1);
    
    if (endPage - startPage + 1 < maxLinks) {
      startPage = Math.max(1, endPage - maxLinks + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <button
          key={i}
          onClick={() => changePage(i)}
          className={`px-3 py-1 rounded-md ${
            page === i
              ? 'bg-[#344893] text-white'
              : 'text-[#344893] hover:bg-blue-50'
          }`}
        >
          {i}
        </button>
      );
    }
    
    // Próximo
    links.push(
      <button
        key="next"
        onClick={() => changePage(page + 1)}
        disabled={page === pages}
        className={`px-3 py-1 rounded-md ${
          page === pages
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-[#344893] hover:bg-blue-50'
        }`}
        aria-label="Próxima página"
      >
        <ArrowRight size={18} />
      </button>
    );
    
    return links;
  };

  // Renderizar página de erro caso não seja admin
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h1>
            <p className="text-gray-600 mb-6">
              Esta página é exclusiva para administradores do sistema.
            </p>
            <button 
              onClick={() => router.push('/home')}
              className="bg-[#344893] text-white px-4 py-2 rounded-md hover:bg-[#2d3f7a] transition-colors"
            >
              Voltar para o Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Estados de UI
  const emptyState = !loading && empresas.length === 0;

  const handleSearch = () => {
    if (searchTerm.trim()) {
      // Mostrar toast indicando a pesquisa
      toast.info(
        <div className="flex items-center">
          <div className="mr-3 bg-blue-100 p-2 rounded-full">
            <Search size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Pesquisando empresas</p>
            <p className="text-sm text-gray-600">
              Buscando por: <span className="font-medium">"{searchTerm}"</span>
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-blue-500",
          autoClose: 3000
        }
      );
    }
    
    // Resetar a página para 1 em nova busca
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24"> {/* Aumentei o padding-top para 24 */}
        {/* Cabeçalho da página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Building size={24} className="mr-2 text-[#344893]" />
              Gerenciamento de Empresas
            </h1>
            <p className="text-gray-600 mt-1">
              Cadastre e gerencie as empresas do sistema
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <button
              onClick={openCreateModal}
              className="bg-[#344893] text-white px-4 py-2 rounded-md hover:bg-[#2d3f7a] transition-colors flex items-center"
            >
              <Plus size={18} className="mr-1" />
              Nova Empresa
            </button>
          </div>
        </div>
        
        {/* Filtros e busca */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#344893] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  fetchEmpresas();
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setMostrarOcultos(!mostrarOcultos)}
            className={`px-4 py-2 rounded-md flex items-center ${
              mostrarOcultos
                ? 'bg-blue-100 text-[#344893] border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {mostrarOcultos ? <Eye size={18} className="mr-2" /> : <EyeOff size={18} className="mr-2" />}
            {mostrarOcultos ? 'Mostrar Todos' : 'Mostrar Ocultos'}
          </button>
          
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center"
          >
            <RefreshCw size={18} className="mr-2" />
            Atualizar
          </button>
        </div>
        
        {/* Se necessário, exibir erro */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 mb-6 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <p>{error}</p>
          </div>
        )}
        
        {/* Tabela de empresas */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nº
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome da Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado Por
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#344893] border-r-transparent"></div>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">Carregando empresas...</p>
                    </td>
                  </tr>
                ) : emptyState ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="text-gray-500">
                        <Building size={36} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-lg font-medium">Nenhuma empresa encontrada</p>
                        <p className="text-sm mt-1">
                          {searchTerm ? 'Tente ajustar sua busca' : 'Adicione sua primeira empresa clicando no botão "Nova Empresa"'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  empresas.map((empresa) => (
                    <tr 
                      key={empresa.id} 
                      className={`hover:bg-gray-50 ${empresa.oculto ? 'bg-gray-50 text-gray-400' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {empresa.numero || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {empresa.oculto && <EyeOff size={14} className="inline mr-1 text-gray-400" />}
                        {empresa.nomeEmpresa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {empresa.cnpj || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {empresa.cidade || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {empresa.criadoPor?.nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-1">
                        <button
                          onClick={() => openEditModal(empresa)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Editar empresa"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmpresa(empresa.id)}
                          className={`text-red-600 hover:text-red-900 p-1 ${empresa.oculto ? 'hidden' : ''}`}
                          title="Excluir empresa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginação */}
          {!emptyState && !loading && pagination.pages > 1 && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Mostrando <span className="font-medium">{empresas.length}</span> de{' '}
                <span className="font-medium">{pagination.total}</span> empresas
              </div>
              <div className="flex space-x-1">
                {renderPaginationLinks()}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Modal de criação/edição */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              ref={modalRef}
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-800 flex items-center">
                  <Building size={20} className="text-[#344893] mr-2" />
                  {modalMode === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveEmpresa} className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                      Número
                    </label>
                    <input
                      type="text"
                      id="numero"
                      name="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                      placeholder="Número/Código da empresa"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#344893] focus:border-[#344893]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="nomeEmpresa" className="block text-sm font-medium text-gray-700">
                      Nome da Empresa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="nomeEmpresa"
                      name="nomeEmpresa"
                      value={formData.nomeEmpresa}
                      onChange={handleInputChange}
                      placeholder="Nome da empresa"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#344893] focus:border-[#344893]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      id="cnpj"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleInputChange}
                      placeholder="00.000.000/0000-00"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#344893] focus:border-[#344893]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                      Cidade
                    </label>
                    <input
                      type="text"
                      id="cidade"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      placeholder="Cidade da empresa"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#344893] focus:border-[#344893]"
                    />
                  </div>

                  {/* Exibir quem criou a empresa, apenas na edição */}
                  {modalMode === 'edit' && currentEmpresa?.criadoPor && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Criado por:</span> {currentEmpresa.criadoPor.nome} 
                        {currentEmpresa.criadoPor.email && ` (${currentEmpresa.criadoPor.email})`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Adicionado em: {currentEmpresa.createdAt ? new Date(currentEmpresa.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#344893] hover:bg-[#2d3f7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893] flex items-center"
                  >
                    <Check size={18} className="mr-1" />
                    {modalMode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
        toastStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      />
    </div>
  );
}