"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';
import ContaCorrenteCard from '../components/ContaCorrenteCard';
import ContaCorrenteModal from '../components/ContaCorrenteModal';
import ContaCorrenteDetalhesModal from '../components/ContaCorrenteDetalhesModal';
import { format } from 'date-fns';
import { 
  PlusCircle, DollarSign, Search, ArrowDownCircle, ArrowUpCircle, 
  ChevronDown, ChevronUp, Calendar, X, Check, Filter as FilterIcon,
  User, Building, RefreshCw, Download, Clock, FileText, Loader2,
  Eye, EyeOff, Edit, Trash, UserCircle, Users, Grid, List
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// INTERFACES
interface ContaCorrente {
  id: number;
  userId: string;
  empresaId?: number;
  colaboradorId?: number;
  descricao?: string;
  data?: string;
  fornecedorCliente?: string;
  observacao?: string;
  setor?: string;
  tipo?: string;
  oculto: boolean;
  createdAt?: string;
  updatedAt?: string;
  saldo: number;
  lancamentos: Lancamento[];
  user?: {
    id: string;
    nome: string;
    sobrenome?: string;
    email: string;
  };
  empresa?: {
    id: number;
    nome: string;
  };
  colaborador?: {
    id: number;
    nome: string;
    sobrenome?: string;
    setor?: string;
  };
}

interface Lancamento {
  id: number;
  contaCorrenteId: number;
  data: string;
  numeroDocumento?: string;
  observacao?: string;
  credito?: string;
  debito?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Empresa {
  id: number;
  nomeEmpresa?: string;
  nome?: string;  // Para compatibilidade
}

interface Colaborador {
  id: number;
  nome: string;
  sobrenome?: string;
  cargo?: string;
  setor?: string;
}

interface User {
  id: string;
  nome: string;
  sobrenome?: string;
  email: string;
  role?: string;
}

// Função para garantir que os dados são arrays
function ensureArray<T>(data: any, fallback: T[] = []): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    // Tenta encontrar a primeira propriedade que seja um array
    for (const key in data) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return fallback;
}

export default function ContaCorrenteTodosPage() {
  const router = useRouter();
  const [contasCorrente, setContasCorrente] = useState<ContaCorrente[]>([]);
  interface Stats {
    totalContas: number;
    saldoGeral: number;
    creditosMes: number;
    debitosMes: number;
  }
  
  const [estatisticas, setEstatisticas] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>({
    isAdmin: false,
    canAccess: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });
  
  // Estados para dados auxiliares (para formulários)
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [setores, setSetores] = useState<any[]>([]);

  // Estados para filtros e visualização
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterUsuario, setFilterUsuario] = useState<string>("");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("");
  const [showHidden, setShowHidden] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Estados para modais
  const [isNovaContaModalOpen, setIsNovaContaModalOpen] = useState(false);
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaCorrente | null>(null);
  
  // Formulário para nova conta
  const [contaForm, setContaForm] = useState({
    userId: '',
    descricao: '',
    tipo: 'PESSOAL',
    fornecedorCliente: '',
    observacao: '',
    setor: '',
    empresaId: '',
    colaboradorId: '',
    oculto: false
  });

  // Formulário para novo lançamento
  const [lancamentoForm, setLancamentoForm] = useState({
    contaCorrenteId: '',
    tipo: 'CREDITO',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    numeroDocumento: '',
    observacao: ''
  });

  // Verificar autenticação e permissões
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      router.push("/login");
      return;
    }
    
    setToken(token);
    fetchPermissions(token);
  }, [router]);

  // Buscar permissões e validar acesso à página
  const fetchPermissions = async (authToken: string) => {
    try {
      setLoading(true);
      
      // Primeiro verifica o status do usuário
      const statusResponse = await fetch("/api/status", {
        headers: { 
          Authorization: `Bearer ${authToken}`,
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

      // Armazenar o ID do usuário atual
      setCurrentUserId(statusData.userId);
      
      const isAdmin = statusData.isAdmin;

      // Buscar permissões específicas se não for admin
      if (!isAdmin) {
        const permissionsResponse = await fetch("/api/usuarios/permissions?page=contacorrente", {
          headers: { 
            Authorization: `Bearer ${authToken}`
          }
        });
        
        if (!permissionsResponse.ok) {
          throw new Error("Falha ao verificar permissões");
        }
        
        const permissionsData = await permissionsResponse.json();
        
        // Se não for admin e não tiver permissão, redireciona
        if (!permissionsData.permissions?.contacorrente?.canAccess) {
          toast.error("Você não tem permissão para acessar esta página");
          router.push("/dashboard");
          return;
        }
        
        // Define as permissões específicas baseado nos dados recebidos
        setUserPermissions({
          isAdmin: false,
          canAccess: true,
          canCreate: permissionsData.permissions?.contacorrente?.canCreate || false,
          canEdit: permissionsData.permissions?.contacorrente?.canEdit || false,
          canDelete: permissionsData.permissions?.contacorrente?.canDelete || false
        });
      } else {
        // Se for admin, tem todas as permissões
        setUserPermissions({
          isAdmin: true,
          canAccess: true,
          canCreate: true,
          canEdit: true,
          canDelete: true
        });
      }
      
      // Carregar os dados iniciais
      fetchInitialData(authToken);
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      toast.error("Erro ao verificar suas permissões");
      // Em caso de erro, redireciona para o dashboard
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Buscar todos os dados iniciais
  const fetchInitialData = async (authToken: string) => {
    setLoading(true);
    
    try {
      // Buscar dados em paralelo
      await Promise.all([
        fetchContasCorrente(authToken).catch(() => []),
        fetchEstatisticas(authToken).catch(() => null),
        fetchEmpresas(authToken).catch(() => []),
        fetchColaboradores(authToken).catch(() => []),
        fetchUsuarios(authToken).catch(() => [])
      ]);
      
      // Os estados já são atualizados nas funções individuais
    } catch (error) {
      console.error("Erro ao buscar dados iniciais:", error);
      toast.error("Ocorreu um erro ao carregar os dados");
    } finally {
      setLoading(false);
    }
  };

  // Buscar todas as contas corrente
  const fetchContasCorrente = async (authToken: string) => {
    try {
      const url = `/api/contacorrente/todos?showHidden=${showHidden}`;
      
      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar contas corrente");
      }
      
      const data = await response.json();
      console.log("Resposta API contasCorrente:", data);
      
      // Garantir que data seja um array
      const contasArray = ensureArray<ContaCorrente>(data);
      setContasCorrente(contasArray);
      return contasArray;
    } catch (error) {
      console.error("Erro ao buscar contas corrente:", error);
      toast.error("Erro ao buscar contas corrente");
      setContasCorrente([]);
      return [];
    }
  };

  // Buscar estatísticas
  const fetchEstatisticas = async (authToken: string) => {
    try {
      const response = await fetch("/api/contacorrente/stats", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar estatísticas");
      }
      
      const data = await response.json();
      setEstatisticas(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      // Não mostrar toast para não sobrecarregar o usuário com mensagens de erro
      throw error;
    }
  };

  // Buscar empresas
  const fetchEmpresas = async (authToken: string) => {
    try {
      const response = await fetch("/api/empresas", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar empresas");
      }
      
      const data = await response.json();
      console.log("Resposta API empresas:", data);
      
      // Garantir que data seja um array e normalizar os nomes de campos
      const empresasArray = ensureArray<any>(data).map(empresa => ({
        id: empresa.id,
        nomeEmpresa: empresa.nomeEmpresa || empresa.nome || `Empresa ${empresa.id}`,
        nome: empresa.nome || empresa.nomeEmpresa || `Empresa ${empresa.id}`
      }));
      
      setEmpresas(empresasArray);
      return empresasArray;
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      setEmpresas([]);
      return [];
    }
  };

  // Adicione esta função para extrair setores únicos
  const extrairSetoresDosColaboradores = (colaboradores: Colaborador[]) => {
    if (!Array.isArray(colaboradores)) return [];
    
    // Extrai os setores não vazios e remove duplicados
    const setoresUnicos = [...new Set(
      colaboradores
        .filter(col => col.setor && col.setor.trim() !== '')
        .map(col => col.setor!)
    )].sort();
    
    return setoresUnicos;
  };

  // No fetchColaboradores, adicione a extração de setores
  const fetchColaboradores = async (authToken: string) => {
    try {
      const response = await fetch("/api/colaboradores", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar colaboradores");
      }
      
      const data = await response.json();
      
      // Garantir que data seja um array
      const colaboradoresArray = ensureArray<Colaborador>(data);
      setColaboradores(colaboradoresArray);
      
      // Extrair e definir setores
      const setoresUnicos = extrairSetoresDosColaboradores(colaboradoresArray);
      setSetores(setoresUnicos);
      
      return colaboradoresArray;
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      setColaboradores([]);
      return [];
    }
  };

  // Função para buscar usuários
  const fetchUsuarios = async (authToken: string) => {
    try {
      const response = await fetch("/api/usuarios", {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar usuários");
      }
      
      const data = await response.json();
      
      // Garantir que data seja um array
      const usuariosArray = ensureArray<User>(data);
      setUsuarios(usuariosArray);
      return usuariosArray;
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      setUsuarios([]);
      return [];
    }
  };
  
  // Atualizar quando o filtro de ocultos mudar
  useEffect(() => {
    if (token) {
      fetchContasCorrente(token);
    }
  }, [showHidden, token]);

  // Criar nova conta corrente usando o modal de componente
  const handleCreateConta = async (formData: any) => {
    setLoadingAction(true);
    
    try {
      // Preparar payload conforme API
      const payload: any = {
        userId: formData.userId || '',
        descricao: formData.descricao || '',
        tipo: formData.tipo || 'PESSOAL',
        fornecedorCliente: formData.fornecedorCliente || '',
        observacao: formData.observacao || '',
        setor: formData.setor || '',
        empresaId: formData.empresaId ? Number(formData.empresaId) : null,
        colaboradorId: formData.colaboradorId ? Number(formData.colaboradorId) : null,
        oculto: formData.oculto || false,
        data: formData.data || new Date().toISOString()
      };
      
      // Processar lançamentos se existirem
      if (formData.lancamentos && Array.isArray(formData.lancamentos)) {
        payload.lancamentos = formData.lancamentos
          .filter((l: any) => l.credito || l.debito)
          .map((l: any) => ({
            data: l.data || new Date().toISOString(),
            numeroDocumento: l.numeroDocumento || '',
            observacao: l.observacao || '',
            credito: l.credito || null,
            debito: l.debito || null
          }));
      }
      
      console.log("Payload enviado para API:", payload);
      
      // Se tem ID, é uma edição
      const url = formData.id ? `/api/contacorrente/${formData.id}` : "/api/contacorrente/todos";
      
      const response = await fetch(url, {
        method: formData.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Erro ao criar/editar conta corrente");
      }
      
      // Recarregar dados
      await Promise.all([
        fetchContasCorrente(token!),
        fetchEstatisticas(token!)
      ]);
      
      setIsNovaContaModalOpen(false);
      toast.success("Conta corrente criada/atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar/editar conta corrente:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar/editar conta corrente");
    } finally {
      setLoadingAction(false);
    }
  };

  // Adicionar novo lançamento
  const handleAddLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!lancamentoForm.contaCorrenteId) {
      toast.error("Selecione uma conta corrente");
      return;
    }
    
    if (!lancamentoForm.valor || !lancamentoForm.data) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    
    if (isNaN(parseFloat(lancamentoForm.valor)) || parseFloat(lancamentoForm.valor) <= 0) {
      toast.error("Digite um valor válido");
      return;
    }
    
    setLoadingAction(true);
    
    try {
      // Preparar payload conforme a API espera
      const payload = {
        contaCorrenteId: parseInt(lancamentoForm.contaCorrenteId),
        data: lancamentoForm.data,
        numeroDocumento: lancamentoForm.numeroDocumento,
        observacao: lancamentoForm.observacao,
        credito: lancamentoForm.tipo === 'CREDITO' ? lancamentoForm.valor : null,
        debito: lancamentoForm.tipo === 'DEBITO' ? lancamentoForm.valor : null
      };
      
      const response = await fetch("/api/lancamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Erro ao adicionar lançamento");
      }
      
      // Recarregar dados
      await Promise.all([
        fetchContasCorrente(token!),
        fetchEstatisticas(token!)
      ]);
      
      // Resetar formulário
      setLancamentoForm({
        contaCorrenteId: '',
        tipo: 'CREDITO',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        observacao: ''
      });
      
      setIsLancamentoModalOpen(false);
      toast.success("Lançamento adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar lançamento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar lançamento");
    } finally {
      setLoadingAction(false);
    }
  };

  // Alternar visibilidade de conta corrente (ocultar/mostrar)
  const toggleContaVisibility = async (id: number) => {
    if (!userPermissions.canEdit) {
      toast.error("Você não tem permissão para realizar esta ação");
      return;
    }
    
    setLoadingAction(true);
    
    try {
      const response = await fetch("/api/contacorrente/todos", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Erro ao alterar visibilidade");
      }
      
      const data = await response.json();
      
      // Recarregar dados
      await fetchContasCorrente(token!);
      
      toast.success(data.message || "Visibilidade alterada com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar visibilidade:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao alterar visibilidade");
    } finally {
      setLoadingAction(false);
    }
  };

  // Ver detalhes de uma conta
  const handleVerDetalhes = (conta: ContaCorrente) => {
    setContaSelecionada(conta);
    setIsDetalhesModalOpen(true);
  };

  // Editar uma conta
  const handleEditarConta = () => {
    setIsDetalhesModalOpen(false);
    setIsNovaContaModalOpen(true);
  };

  // Formatar valor para moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };

  // Verificar se algum filtro está ativo
  const isFilterActive = 
    searchTerm !== "" || 
    filterTipo !== "" || 
    filterUsuario !== "" || 
    filterEmpresa !== "";

  // Exportar dados para Excel
  const exportToExcel = () => {
    try {
      // Preparar dados para exportação
      const dataToExport = filteredContas.map(conta => ({
        'ID': conta.id,
        'Usuário': `${conta.user?.nome || ''} ${conta.user?.sobrenome || ''}`,
        'Tipo': conta.tipo || '',
        'Descrição': conta.descricao || '',
        'Fornecedor/Cliente': conta.fornecedorCliente || '',
        'Empresa': conta.empresa?.nome || '',
        'Setor': conta.setor || '',
        'Saldo': conta.saldo,
        'Total Créditos': conta.lancamentos.reduce((total, l) => total + (l.credito ? parseFloat(l.credito) || 0 : 0), 0),
        'Total Débitos': conta.lancamentos.reduce((total, l) => total + (l.debito ? parseFloat(l.debito) || 0 : 0), 0),
        'Qtd. Lançamentos': conta.lancamentos.length,
        'Data Criação': conta.createdAt ? formatDate(conta.createdAt) : '',
        'Status': conta.oculto ? 'Oculto' : 'Visível'
      }));
      
      // Criar planilha
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contas Corrente");
      
      // Converter para binário e salvar
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      saveAs(data, `contas-corrente-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Dados exportados com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar para Excel:", error);
      toast.error("Erro ao exportar dados");
    }
  };

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterTipo("");
    setFilterUsuario("");
    setFilterEmpresa("");
  };

  // Filtrar contas corrente
  const filteredContas = useMemo(() => {
    if (!Array.isArray(contasCorrente)) {
      console.warn("contasCorrente não é um array:", contasCorrente);
      return [];
    }
    
    return contasCorrente.filter(conta => {
      // Filtro por termo de busca (nome, fornecedor/cliente, descrição)
      const matchesSearch = 
        (conta.user?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (conta.fornecedorCliente?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (conta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (conta.setor?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (formatCurrency(conta.saldo).includes(searchTerm.toLowerCase()));
      
      // Filtro por tipo
      const matchesTipo = filterTipo === "" ? true : conta.tipo === filterTipo;
      
      // Filtro por usuário
      const matchesUsuario = filterUsuario === "" ? true : conta.userId === filterUsuario;
      
      // Filtro por empresa
      const matchesEmpresa = filterEmpresa === "" ? 
        true : 
        (filterEmpresa === "null" ? !conta.empresaId : conta.empresaId?.toString() === filterEmpresa);
      
      return matchesSearch && matchesTipo && matchesUsuario && matchesEmpresa;
    });
  }, [contasCorrente, searchTerm, filterTipo, filterUsuario, filterEmpresa]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow p-4 md:p-6 lg:p-8 mt-20 max-w-7xl mx-auto w-full">
        {/* Cabeçalho da página */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Gestão de Contas Corrente
              </h1>
              <p className="text-gray-600">
                Visualize e gerencie todas as contas corrente do sistema
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
              {userPermissions.canCreate && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setContaSelecionada(null); // Reset para criar nova
                    setIsNovaContaModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  disabled={loadingAction}
                >
                  <PlusCircle size={18} className="mr-2" />
                  Nova Conta
                </motion.button>
              )}
              
              {userPermissions.canCreate && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsLancamentoModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  disabled={loadingAction}
                >
                  <DollarSign size={18} className="mr-2" />
                  Novo Lançamento
                </motion.button>
              )}
            </div>
          </div>

          {/* Cards com estatísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total de Contas */}
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 15px -5px rgba(0, 0, 0, 0.1)' }}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start">
                <div className="rounded-full p-2 bg-blue-100 text-blue-600">
                  <Users size={18} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total de Contas</p>
                  <p className="text-lg font-bold text-gray-900">
                    {loading ? "..." : estatisticas?.totalContas || 0}
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Saldo Geral */}
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 15px -5px rgba(0, 0, 0, 0.1)' }}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start">
                <div className={`rounded-full p-2 ${estatisticas?.saldoGeral && estatisticas.saldoGeral >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <DollarSign size={18} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Saldo Geral</p>
                  <p className={`text-lg font-bold ${estatisticas?.saldoGeral && estatisticas.saldoGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {loading ? "..." : formatCurrency(estatisticas?.saldoGeral || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Créditos do Mês */}
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 15px -5px rgba(0, 0, 0, 0.1)' }}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start">
                <div className="rounded-full p-2 bg-green-100 text-green-600">
                  <ArrowDownCircle size={18} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Créditos do Mês</p>
                  <p className="text-lg font-bold text-green-600">
                    {loading ? "..." : formatCurrency(estatisticas?.creditosMes || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Débitos do Mês */}
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 15px -5px rgba(0, 0, 0, 0.1)' }}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start">
                <div className="rounded-full p-2 bg-red-100 text-red-600">
                  <ArrowUpCircle size={18} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Débitos do Mês</p>
                  <p className="text-lg font-bold text-red-600">
                    {loading ? "..." : formatCurrency(estatisticas?.debitosMes || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Barra de pesquisa e filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white p-4 rounded-lg shadow-sm mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, fornecedor, descrição..."
                className="pl-10 pr-3 py-2 block w-full rounded-md border-gray-300 border focus:ring-[#344893] focus:border-[#344893]"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  isFilterActive ? 
                  'bg-blue-50 text-blue-700 border-blue-200' : 
                  'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FilterIcon size={16} className="mr-1" />
                Filtros
                {showFilters ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                {isFilterActive && (
                  <span className="ml-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full px-2 py-0.5">
                    {(searchTerm ? 1 : 0) + (filterTipo ? 1 : 0) + (filterUsuario ? 1 : 0) + (filterEmpresa ? 1 : 0)}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setShowHidden(!showHidden)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  showHidden ? 
                  'bg-purple-50 text-purple-700 border-purple-200' : 
                  'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={showHidden ? "Ocultar contas inativas" : "Mostrar contas ocultas"}
              >
                {showHidden ? (
                  <>
                    <EyeOff size={16} className="mr-1" />
                    Mostrar Ocultos
                  </>
                ) : (
                  <>
                    <Eye size={16} className="mr-1" />
                    Apenas Visíveis
                  </>
                )}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                    viewMode === 'cards' ? 
                    'bg-gray-100 text-gray-800 border-gray-300' : 
                    'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Visualizar em cards"
                >
                  <Grid size={16} />
                </button>
                
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                    viewMode === 'table' ? 
                    'bg-gray-100 text-gray-800 border-gray-300' : 
                    'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Visualizar em tabela"
                >
                  <List size={16} />
                </button>
              </div>
              
              {filteredContas.length > 0 && (
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-green-600 text-sm font-medium text-white hover:bg-green-700"
                  title="Exportar para Excel"
                >
                  <Download size={16} className="mr-1" />
                  <span className="hidden md:inline">Exportar</span>
                </button>
              )}
            </div>
          </div>

          {/* Área de filtros expandida */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Conta
                  </label>
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#344893] focus:border-[#344893] sm:text-sm rounded-md"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="PESSOAL">Pessoal</option>
                    <option value="EMPRESA">Empresa</option>
                    <option value="COLABORADOR">Colaborador</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuário
                  </label>
                  <select
                    value={filterUsuario}
                    onChange={(e) => setFilterUsuario(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#344893] focus:border-[#344893] sm:text-sm rounded-md"
                  >
                    <option value="">Todos os usuários</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} {usuario.sobrenome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <select
                    value={filterEmpresa}
                    onChange={(e) => setFilterEmpresa(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#344893] focus:border-[#344893] sm:text-sm rounded-md"
                  >
                    <option value="">Todas as empresas</option>
                    <option value="null">Sem empresa</option>
                    {empresas.map(empresa => (
                      <option key={empresa.id} value={empresa.id.toString()}>
                        {empresa.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {isFilterActive && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X size={16} className="mr-1" />
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Chips de filtros aplicados */}
          {isFilterActive && (
            <div className="flex flex-wrap gap-2 mt-3">
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Busca: {searchTerm}
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              
              {filterTipo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Tipo: {filterTipo}
                  <button 
                    onClick={() => setFilterTipo('')}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              
              {filterUsuario && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Usuário: {usuarios.find(u => u.id === filterUsuario)?.nome || 'Selecionado'}
                  <button 
                    onClick={() => setFilterUsuario('')}
                    className="ml-1 text-purple-500 hover:text-purple-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              
              {filterEmpresa && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Empresa: {filterEmpresa === 'null' ? 'Sem empresa' : empresas.find(e => e.id.toString() === filterEmpresa)?.nome || 'Selecionada'}
                  <button 
                    onClick={() => setFilterEmpresa('')}
                    className="ml-1 text-green-500 hover:text-green-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Lista de contas corrente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow-sm">
              <Loader2 size={40} className="animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Carregando dados...</span>
            </div>
          ) : filteredContas.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-lg shadow-sm">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
                <DollarSign size={32} />
              </div>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                Nenhuma conta corrente encontrada
              </h3>
              <p className="mt-1 text-gray-500 max-w-md mx-auto">
                {isFilterActive 
                  ? "Tente remover alguns filtros para ver mais resultados."
                  : showHidden 
                    ? "Não há contas corrente cadastradas no sistema."
                    : "Não há contas corrente visíveis. Tente mostrar contas ocultas."}
              </p>
              <div className="mt-6">
                {isFilterActive ? (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Limpar Filtros
                  </button>
                ) : !showHidden ? (
                  <button
                    onClick={() => setShowHidden(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye size={16} className="mr-1" />
                    Mostrar Ocultos
                  </button>
                ) : userPermissions.canCreate ? (
                  <button
                    onClick={() => setIsNovaContaModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#344893] hover:bg-blue-700"
                  >
                    <PlusCircle size={16} className="mr-1" />
                    Criar Nova Conta
                  </button>
                ) : null}
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContas.map(conta => (
                <ContaCorrenteCard
                  key={conta.id}
                  conta={conta}
                  onViewDetails={() => handleVerDetalhes(conta)}
                  onToggleVisibility={() => toggleContaVisibility(conta.id)}
                  canEdit={userPermissions.canEdit}
                />
              ))}
            </div>
          ) : (
            // Visualização em tabela
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa/Fornecedor
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lançamentos
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContas.map((conta) => (
                      <tr key={conta.id} className={`hover:bg-gray-50 ${conta.oculto ? 'bg-gray-50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                              <UserCircle size={20} />
                            </div>
                            <div className="ml-2">
                              <div className="font-medium text-gray-900">
                                {conta.user?.nome} {conta.user?.sobrenome}
                              </div>
                              <div className="text-xs text-gray-500">
                                {conta.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {conta.descricao || `Conta #${conta.id}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {conta.tipo || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {conta.empresa?.nome || conta.fornecedorCliente || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                          <span className={conta.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(conta.saldo)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {conta.lancamentos.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {conta.oculto ? (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                              Oculto
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Visível
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleVerDetalhes(conta)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            
                            {userPermissions.canEdit && (
                              <button
                                onClick={() => toggleContaVisibility(conta.id)}
                                className="text-gray-500 hover:text-gray-700"
                                title={conta.oculto ? "Mostrar conta" : "Ocultar conta"}
                                disabled={loadingAction}
                              >
                                {conta.oculto ? <Eye size={18} /> : <EyeOff size={18} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Modal para criar nova conta corrente - Usando o componente */}
      {isNovaContaModalOpen && (
        <ContaCorrenteModal
          isOpen={isNovaContaModalOpen}
          onClose={() => setIsNovaContaModalOpen(false)}
          onSave={handleCreateConta}
          initialData={contaSelecionada}
          empresas={empresas}
          colaboradores={colaboradores}
          usuarios={usuarios}
          setores={setores}
          isLoading={loadingAction}
          isAdminMode={userPermissions.isAdmin} // Modo admin conforme permissões
          currentUserId={currentUserId} // ID do usuário atual
        />
      )}

      {/* Modal para Detalhes da Conta Corrente - Usando o componente */}
      {isDetalhesModalOpen && contaSelecionada && (
        <ContaCorrenteDetalhesModal
          conta={contaSelecionada}
          onClose={() => setIsDetalhesModalOpen(false)}
          onEdit={handleEditarConta}
        />
      )}

      {/* Manter o Modal para Lançamentos como estava, pois não criamos um componente específico para ele */}
      {isLancamentoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Novo Lançamento</h2>
              <button
                onClick={() => setIsLancamentoModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleAddLancamento}>
                {/* Conta Corrente */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta Corrente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={lancamentoForm.contaCorrenteId}
                    onChange={e => setLancamentoForm({...lancamentoForm, contaCorrenteId: e.target.value})}
                    required
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#344893] focus:border-[#344893] sm:text-sm rounded-md"
                  >
                    <option value="">Selecione uma conta</option>
                    {contasCorrente.map(conta => (
                      <option key={conta.id} value={conta.id}>
                        {conta.descricao || `Conta #${conta.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={lancamentoForm.tipo}
                    onChange={e => setLancamentoForm({...lancamentoForm, tipo: e.target.value})}
                    required
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#344893] focus:border-[#344893] sm:text-sm rounded-md"
                  >
                    <option value="CREDITO">Crédito</option>
                    <option value="DEBITO">Débito</option>
                  </select>
                </div>

                {/* Valor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={lancamentoForm.valor}
                      onChange={e => setLancamentoForm({...lancamentoForm, valor: e.target.value})}
                      required
                      placeholder="0.00"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                    />
                  </div>
                </div>

                {/* Data */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={lancamentoForm.data}
                      onChange={e => setLancamentoForm({...lancamentoForm, data: e.target.value})}
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                    />
                  </div>
                </div>

                {/* Número do Documento */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Documento
                  </label>
                  <input
                    type="text"
                    value={lancamentoForm.numeroDocumento}
                    onChange={e => setLancamentoForm({...lancamentoForm, numeroDocumento: e.target.value})}
                    placeholder="Número do documento"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                  />
                </div>

                {/* Observação */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observação
                  </label>
                  <textarea
                    value={lancamentoForm.observacao}
                    onChange={e => setLancamentoForm({...lancamentoForm, observacao: e.target.value})}
                    placeholder="Observações adicionais"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#344893] hover:bg-blue-700"
                  >
                    {loadingAction ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check size={18} className="mr-2" />
                        Adicionar Lançamento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

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