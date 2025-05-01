'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, Filter, Grid, List, Download, X, DollarSign, ArrowDownCircle, 
  ArrowUpCircle, Users, Calendar, Building, ChevronDown, Plus, Check, 
  AlertCircle, Info, FileSpreadsheet, Wallet, User, Landmark, Briefcase, Eye, Edit, Trash2, 
  Database,
  ChevronRight, SearchX, FileText, BarChart as ChartBarIcon, PieChart as ChartPieIcon 
} from 'lucide-react';

import Header from '../components/Header';
import ContaCorrenteCard from '../components/ContaCorrenteCard';
import ContaCorrenteModal from '../components/ContaCorrenteModal';
import ProtectedRoute from '../components/ProtectedRoute';
import PermissionGuard from '../components/PermissionGuard';

// Implementação simples do DashboardPieChart
const DashboardPieChart = ({ data }: { data: { name: string; value: number; color: string }[] }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className="w-12 h-12 rounded-full mb-2" 
              style={{ backgroundColor: item.color }}
            ></div>
            <div className="text-sm font-medium">{item.name}: {item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Implementação simples do DashboardBarChart
const DashboardBarChart = ({ data }: { data: { name: string; value: number; color: string }[] }) => {
  // Encontrar o valor máximo para escala
  const maxValue = Math.max(...data.map(item => Math.abs(item.value)), 1);
  
  return (
    <div className="w-full h-full flex flex-col justify-center p-4">
      {data.map((item, index) => (
        <div key={index} className="mb-4">
          <div className="flex items-center mb-1">
            <div className="w-24 text-xs truncate mr-2">{item.name}</div>
            <div className="flex-grow h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  backgroundColor: item.color,
                  width: `${Math.abs(item.value) / maxValue * 80}%` 
                }}
              ></div>
            </div>
            <div className="ml-2 text-xs font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(item.value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// INTERFACES
interface ContaCorrente {
  id: number;
  fornecedorCliente: string;
  data: string;
  tipo: string;
  observacao?: string;
  setor?: string;
  userId: string;
  empresaId?: number;
  colaboradorId?: number;
  empresa?: Empresa;
  colaborador?: Colaborador;
  user?: User;
  lancamentos: Lancamento[];
  oculto: boolean;
  saldo?: number;
  createdAt: string;
  updatedAt: string;
}

interface Lancamento {
  id?: number;
  contaCorrenteId?: number;
  data: string;
  numeroDocumento?: string;
  observacao?: string;
  credito?: string;
  debito?: string;
}

interface Empresa {
  id: number;
  nome: string;
  numero: string;
}

interface Colaborador {
  id: number;
  nome: string;
  cargo: string;
}

interface User {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
}

export default function ContaCorrentePage() {
  const [contasCorrente, setContasCorrente] = useState<ContaCorrente[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [setores, setSetores] = useState<string[]>([]);
  const [selectedConta, setSelectedConta] = useState<ContaCorrente | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<ContaCorrente | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState(0);
  const [filterDateRange, setFilterDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterPositiveSaldo, setFilterPositiveSaldo] = useState<boolean | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    totalPositivo: 0,
    totalNegativo: 0,
    totalCredito: 0,
    totalDebito: 0,
    porEmpresa: {} as Record<string, number>
  });
  
  // Paginação
  const [visibleItems, setVisibleItems] = useState<number>(12);
  const [itemsPerLoad, setItemsPerLoad] = useState<number>(12);

  const router = useRouter();
  const viewModalRef = useRef<HTMLDivElement>(null);

  // Verificar autenticação
  useEffect(() => {
    console.log("Verificando autenticação...");
    const token = localStorage.getItem("token");
    
    if (!token) {
      console.log("Token não encontrado no localStorage");
      router.push("/");
      return;
    }
    
    console.log("Token encontrado no localStorage");
    setToken(token);
    
    try {
      const userStr = localStorage.getItem("user");
      console.log("Dados do usuário encontrados:", userStr ? "Sim" : "Não");
      
      const user = JSON.parse(userStr || "{}");
      setUserId(user.id);
      setIsAdmin(user.role === "ADMIN");
      
      console.log("ID do usuário:", user.id);
      console.log("Papel do usuário:", user.role);
      
      if (user.id) {
        // Antes de chamar as funções
        console.log("Iniciando carregamento de dados...");
        fetchMinhasContas();
        fetchDadosAuxiliares(token);
      } else {
        console.error("ID do usuário não encontrado nos dados");
      }
    } catch (error) {
      console.error("Erro ao processar dados do usuário:", error);
      if (!userId) {
        console.log("Redirecionando para login devido a erro crítico");
      }
    }
  }, [router]);
  
  // Efeito para fechar modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewModalRef.current && !viewModalRef.current.contains(event.target as Node) && isViewModalOpen) {
        setIsViewModalOpen(false);
        setSelectedConta(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewModalOpen]);

  // Efeito para calcular estatísticas quando as contas mudam
  useEffect(() => {
    if (contasCorrente.length > 0) {
      // Resetar para o valor inicial quando as contas mudam
      setVisibleItems(itemsPerLoad);
      
      // Calcular estatísticas gerais
      let totalPositivo = 0;
      let totalNegativo = 0;
      let totalCredito = 0;
      let totalDebito = 0;
      const porEmpresa: Record<string, number> = {};
      
      contasCorrente.forEach(conta => {
        // Garantir que lancamentos é um array
        const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
        
        // Calcular totais de crédito e débito
        const creditos = lancamentos
          .filter(l => l && l.credito && !isNaN(parseFloat(String(l.credito))))
          .reduce((sum, item) => sum + parseFloat(String(item.credito || "0")), 0);
        
        const debitos = lancamentos
          .filter(l => l && l.debito && !isNaN(parseFloat(String(l.debito))))
          .reduce((sum, item) => sum + parseFloat(String(item.debito || "0")), 0);
        
        // Calcular saldo
        const saldo = creditos - debitos;
        
        // Incrementar totais
        totalCredito += creditos;
        totalDebito += debitos;
        
        if (saldo >= 0) {
          totalPositivo++;
        } else {
          totalNegativo++;
        }
        
        // Contar por empresa
        if (conta.empresa?.nome) {
          porEmpresa[conta.empresa.nome] = (porEmpresa[conta.empresa.nome] || 0) + 1;
        }
      });
      
      // Atualizar estatísticas
      setStats({
        total: contasCorrente.length,
        totalPositivo,
        totalNegativo,
        totalCredito,
        totalDebito,
        porEmpresa
      });
      
      // Extrair setores únicos
      const uniqueSetores = Array.from(
        new Set(contasCorrente.filter(c => c.setor).map(c => c.setor as string))
      );
      
      setSetores(['Todos', ...uniqueSetores.sort()]);
    }
  }, [contasCorrente, itemsPerLoad]);

  // Resetar itens visíveis quando os filtros mudam
  useEffect(() => {
    setVisibleItems(itemsPerLoad);
  }, [searchTerm, filterTipo, filterSetor, filterEmpresa, filterDateRange, filterUsuario, filterPositiveSaldo, itemsPerLoad]);

  const fetchMinhasContas = async () => {
    setLoading(true);
    try {
      console.log("Iniciando busca de contas correntes...");
      
      // Garantir que token está definido
      const currentToken = token || localStorage.getItem("token");
      
      // Verificar se há token
      if (!currentToken) {
        console.error("Token não encontrado");
        toast.error("Sessão expirada, faça login novamente");
        router.push('/');
        return [];
      }

      // Obter userId do estado ou do localStorage (mais seguro)
      let userIdParam = userId;
      if (!userIdParam) {
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const userData = JSON.parse(userStr);
            userIdParam = userData.id;
            console.log("UserId obtido do localStorage:", userIdParam);
          }
        } catch (e) {
          console.error("Erro ao obter userId do localStorage:", e);
        }
      }
      
      // Construir URL
      let url = '/api/contacorrente';
      if (userIdParam) {
        url += `?userId=${userIdParam}`;
        console.log("URL da requisição com userId:", url);
      } else {
        console.log("URL da requisição sem userId - usando ID do token:", url);
      }
      
      // Fazer requisição com token atualizado
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        cache: 'no-store'
      });
      
      console.log("Status da resposta:", response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error("Erro na resposta:", responseText);
        
        // Se for erro de autenticação (401), atualizar token e tentar novamente
        if (response.status === 401) {
          console.log("Erro de autenticação. Verificando sessão...");
          toast.error("Sessão expirada, faça login novamente");
          router.push('/');
          return [];
        } else {
          throw new Error(`Erro ao buscar contas: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log("Resposta da API contasCorrente:", data);
      
      // Tratar diferentes formatos de resposta
      let contasArray = Array.isArray(data) ? data : Array.isArray(data.contas) ? data.contas : [];
      
      if (!Array.isArray(contasArray)) {
        console.log("API retornou formato inesperado - convertido para array:", data);
        contasArray = [];
      }
      
      // Processar contas para garantir saldo correto
      const contasProcessadas = contasArray.map((conta: any) => {
        // Garantir que lancamentos é array
        const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
        
        // Calcular créditos com validação
        const creditos = lancamentos
          .filter((l: any) => l && l.credito && !isNaN(parseFloat(String(l.credito))))
          .reduce((sum: number, item: any) => sum + parseFloat(String(item.credito || "0")), 0);
        
        // Calcular débitos com validação
        const debitos = lancamentos
          .filter((l: any) => l && l.debito && !isNaN(parseFloat(String(l.debito))))
          .reduce((sum: number, item: any) => sum + parseFloat(String(item.debito || "0")), 0);
        
        // Usar saldo existente ou calcular
        const saldo = conta.saldo !== undefined && !isNaN(Number(conta.saldo))
          ? Number(conta.saldo)
          : creditos - debitos;
        
        // Retornar conta com dados seguros
        return {
          ...conta,
          saldo,
          lancamentos // Garantir que lancamentos é sempre um array acessível
        };
      });
      
      setContasCorrente(contasProcessadas);
      return contasProcessadas;
      
    } catch (error) {
      console.error("Erro ao buscar contas correntes:", error);
      toast.error("Erro ao carregar contas correntes");
      setContasCorrente([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchDadosAuxiliares = async (token: string) => {
    try {
      // Fetch empresas
      const empresasResponse = await fetch('/api/empresas/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (empresasResponse.ok) {
        const empresasData = await empresasResponse.json();
        setEmpresas(empresasData);
      }
      
      // Fetch colaboradores
      const colaboradoresResponse = await fetch('/api/colaboradores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colaboradoresResponse.ok) {
        const colaboradoresData = await colaboradoresResponse.json();
        setColaboradores(colaboradoresData);
      }
      
      // Fetch usuários (somente para admins)
      if (isAdmin) {
        const usuariosResponse = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usuariosResponse.ok) {
          const usuariosData = await usuariosResponse.json();
          setUsuarios(usuariosData);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados auxiliares:", error);
      toast.error("Erro ao carregar dados complementares");
    }
  };

  const handleOpenNewContaModal = () => {
    setSelectedConta(null);
    setIsEditMode(false);
    setIsContaModalOpen(true);
  };

  const handleOpenEditModal = (conta: ContaCorrente) => {
    setSelectedConta(conta);
    setIsEditMode(true);
    setIsContaModalOpen(true);
  };

  const handleViewDetails = (conta: ContaCorrente) => {
    setSelectedConta(conta);
    setIsViewModalOpen(true);
  };

  const handleToggleVisibility = (conta: ContaCorrente) => {
    setContaToDelete(conta);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contaToDelete) return;
    
    try {
      setLoadingAction(true);
      
      const response = await fetch('/api/contacorrente', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: contaToDelete.id })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar conta corrente');
      }
      
      // Atualizar a lista de contas localmente
      await fetchMinhasContas();
      
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <Check size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium">Conta excluída com sucesso!</p>
            <p className="text-sm text-gray-600">
              A conta{' '}
              <strong>{contaToDelete.fornecedorCliente || `#${contaToDelete.id}`}</strong>{' '}
              foi excluída.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-red-500"
        }
      );
      
      setIsConfirmDeleteModalOpen(false);
      setContaToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveContaCorrente = async (dados: { contaCorrente: any, lancamentos: any[] }) => {
    try {
      setLoadingAction(true);
      console.log("Salvando conta corrente:", dados);
      
      // 1. Salvar a conta corrente primeiro
      const responseCC = await fetch('/api/contacorrente', {
        method: dados.contaCorrente.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dados.contaCorrente)
      });

      if (!responseCC.ok) {
        const errorData = await responseCC.json();
        throw new Error(errorData.error || `Erro ao salvar conta corrente: ${responseCC.status}`);
      }

      const contaSalva = await responseCC.json();
      console.log("Conta corrente salva com sucesso:", contaSalva);
      
      // 2. Salvar os lançamentos associados à conta corrente
      if (dados.lancamentos && dados.lancamentos.length > 0) {
        const responseLanc = await fetch('/api/lancamento', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            contaCorrenteId: contaSalva.id,
            lancamentos: dados.lancamentos,
            replace: !!dados.contaCorrente.id // Se tem ID, atualiza; se não tem, é novo
          })
        });
    
        if (!responseLanc.ok) {
          const errorData = await responseLanc.json();
          throw new Error(errorData.error || `Erro ao salvar lançamentos: ${responseLanc.status}`);
        }
    
        console.log("Lançamentos salvos com sucesso");
      }

      // Exibir mensagem, fechar modal e atualizar lista
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-green-100 p-2 rounded-full">
            <Check size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">Conta corrente salva com sucesso!</p>
            <p className="text-sm text-gray-600">
              {dados.contaCorrente.id ? "Dados atualizados" : "Nova conta criada"} com sucesso.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-green-500"
        }
      );
      
      setIsContaModalOpen(false);
      fetchMinhasContas(); // Recarregar lista
      
    } catch (error) {
      console.error("Erro ao salvar conta corrente:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const loadMoreItems = () => {
    setVisibleItems(prev => prev + itemsPerLoad);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterTipo('');
    setFilterSetor('');
    setFilterEmpresa(0);
    setFilterDateRange({start: '', end: ''});
    setFilterUsuario('');
    setFilterPositiveSaldo(null);
    setIsFilterOpen(false);
    
    toast.info(
      <div className="flex items-center">
        <div className="mr-3 bg-blue-100 p-2 rounded-full">
          <X size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium">Filtros limpos</p>
          <p className="text-sm text-gray-600">
            Todos os filtros foram removidos.
          </p>
        </div>
      </div>,
      {
        icon: false,
        closeButton: true,
        className: "border-l-4 border-blue-500"
      }
    );
  };

  // Função para verificar se há filtros ativos
  const isFilterActive = searchTerm || filterTipo || filterSetor || filterEmpresa > 0 || 
                        filterDateRange.start || filterDateRange.end || 
                        filterUsuario || filterPositiveSaldo !== null;

  // Função aprimorada para exportar para Excel
  const exportToExcel = async (advanced = false) => {
    try {
      setIsExportModalOpen(true);
      
      if (filteredContas.length === 0) {
        toast.error("Não há dados para exportar.");
        setIsExportModalOpen(false);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Obter dados básicos ou detalhados
      const dataToExport = filteredContas.map(conta => {
        // Calcular totais
        const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
        const creditos = lancamentos
          .filter(l => l?.credito && !isNaN(parseFloat(String(l.credito))))
          .reduce((sum, item) => sum + parseFloat(String(item.credito || "0")), 0);
        
        const debitos = lancamentos
          .filter(l => l?.debito && !isNaN(parseFloat(String(l.debito))))
          .reduce((sum, item) => sum + parseFloat(String(item.debito || "0")), 0);
        
        const saldo = creditos - debitos;
        
        // Dados básicos da conta
        const baseData = {
          'ID': conta.id,
          'Fornecedor/Cliente': conta.fornecedorCliente || '',
          'Data': formatDate(conta.data),
          'Tipo': conta.tipo || '',
          'Setor': conta.setor || '',
          'Observação': conta.observacao || '',
          'Usuário': `${conta.user?.nome || ''} ${conta.user?.sobrenome || ''}`.trim(),
          'Empresa': conta.empresa?.nome || '',
          'Total Créditos': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditos),
          'Total Débitos': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debitos),
          'Saldo': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo),
          'Data de Criação': formatDate(conta.createdAt)
        };
        
        // Se for exportação avançada, adicionar detalhes dos lançamentos
        if (advanced && lancamentos.length > 0) {
          // Criar um objeto com lançamentos detalhados
          return {
            ...baseData,
            'Número de Lançamentos': lancamentos.length,
            'Detalhes Lançamentos': lancamentos.map((l, idx) => (
              `${idx + 1}. ${formatDate(l.data)} - ${l.numeroDocumento || 'S/N'} - ` +
              `${l.credito ? 'CRÉDITO: ' + formatCurrency(parseFloat(String(l.credito))) : ''}` +
              `${l.debito ? 'DÉBITO: ' + formatCurrency(parseFloat(String(l.debito))) : ''}` +
              `${l.observacao ? ' - ' + l.observacao : ''}`
            )).join('\n')
          };
        }
        
        return baseData;
      });
      
      // Criar uma planilha
      const wb = XLSX.utils.book_new();
      
      // Adicionar folha principal com dados da conta
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, 'Contas Correntes');
      
      // Se for exportação avançada, adicionar uma planilha separada com todos os lançamentos
      if (advanced) {
        // Extrair todos os lançamentos de todas as contas
        const allLancamentos = filteredContas
          .flatMap(conta => {
            const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
            return lancamentos.map(l => ({
              'ID Conta': conta.id,
              'Fornecedor/Cliente': conta.fornecedorCliente || '',
              'Empresa': conta.empresa?.nome || '',
              'Data': formatDate(l.data),
              'Documento': l.numeroDocumento || '',
              'Crédito': l.credito ? formatCurrency(parseFloat(String(l.credito))) : '',
              'Débito': l.debito ? formatCurrency(parseFloat(String(l.debito))) : '',
              'Observação': l.observacao || ''
            }));
          });
        
        if (allLancamentos.length > 0) {
          const wsLancamentos = XLSX.utils.json_to_sheet(allLancamentos);
          XLSX.utils.book_append_sheet(wb, wsLancamentos, 'Lançamentos');
        }
      }
      
      // Gerar nome do arquivo com filtros aplicados
      let fileNameParts = ['relatorio-contas-correntes'];
      
      if (filterTipo) fileNameParts.push(`tipo-${filterTipo}`);
      if (filterSetor) fileNameParts.push(`setor-${filterSetor}`);
      if (filterEmpresa > 0) {
        const empresa = empresas.find(e => e.id === filterEmpresa);
        if (empresa) fileNameParts.push(`empresa-${empresa.nome.replace(/[\/\\:*?"<>|]/g, '_')}`);
      }
      if (filterDateRange.start) fileNameParts.push(`de-${filterDateRange.start}`);
      if (filterDateRange.end) fileNameParts.push(`ate-${filterDateRange.end}`);
      if (filterUsuario) fileNameParts.push(`usuario-${filterUsuario}`);
      if (filterPositiveSaldo !== null) fileNameParts.push(filterPositiveSaldo ? 'saldo-positivo' : 'saldo-negativo');
      if (searchTerm) fileNameParts.push(`busca-${searchTerm.replace(/[\/\\:*?"<>|]/g, '_')}`);
      if (advanced) fileNameParts.push('detalhado');
      
      let fileName = fileNameParts.join('-').slice(0, 100);
      fileName += `-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, fileName);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsExportModalOpen(false);
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-green-100 p-2 rounded-full">
            <Download size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">Relatório exportado</p>
            <p className="text-sm text-gray-600">
              {filteredContas.length} contas {advanced && '(com detalhes)'} exportadas com sucesso.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-green-500"
        }
      );
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('Erro ao gerar relatório');
      setIsExportModalOpen(false);
    }
  };

  // Filtrar contas
  const filteredContas = contasCorrente.filter(conta => {
    // Busca por termo
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      (conta.fornecedorCliente?.toLowerCase().includes(search) || false) ||
      (conta.observacao?.toLowerCase().includes(search) || false) ||
      (conta.tipo?.toLowerCase().includes(search) || false) ||
      (conta.setor?.toLowerCase().includes(search) || false) ||
      (conta.empresa?.nome?.toLowerCase().includes(search) || false) ||
      (conta.user?.nome?.toLowerCase().includes(search) || false) ||
      (conta.user?.sobrenome?.toLowerCase().includes(search) || false) ||
      String(conta.id).includes(search);

    // Filtros específicos
    if (filterTipo && conta.tipo !== filterTipo) return false;
    if (filterSetor && filterSetor !== 'Todos' && conta.setor !== filterSetor) return false;
    if (filterEmpresa > 0 && conta.empresaId !== filterEmpresa) return false;
    
    if (filterDateRange.start || filterDateRange.end) {
      const contaDate = new Date(conta.data);
      
      if (filterDateRange.start) {
        const startDate = new Date(filterDateRange.start);
        if (contaDate < startDate) return false;
      }
      
      if (filterDateRange.end) {
        const endDate = new Date(filterDateRange.end);
        endDate.setHours(23, 59, 59); // Final do dia
        if (contaDate > endDate) return false;
      }
    }
    
    if (filterUsuario && conta.user?.id !== filterUsuario) return false;
    
    if (filterPositiveSaldo !== null) {
      const saldo = conta.saldo || 0;
      if (filterPositiveSaldo && saldo < 0) return false;
      if (!filterPositiveSaldo && saldo >= 0) return false;
    }
    
    return matchesSearch;
  });

  // Ordenar contas (mais recentes primeiro)
  const sortedContas = [...filteredContas].sort((a, b) => {
    return new Date(b.data).getTime() - new Date(a.data).getTime();
  });

  return (
    <ProtectedRoute pageName="contacorrente">
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8 mt-16 mb-8">
          {/* Header da página */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Wallet size={28} className="mr-2 text-[#344893]" />
                  Conta Corrente
                </h1>
                <p className="text-gray-600 mt-1">
                  Gerencie lançamentos financeiros da empresa
                </p>
              </div>

              <div className="mt-4 md:mt-0 flex space-x-3">
                <PermissionGuard pageName="contacorrente" permission="canEdit">
                  <button
                    onClick={handleOpenNewContaModal}
                    className="bg-[#344893] text-white px-4 py-2 rounded-lg hover:bg-[#2a3a74] transition-colors flex items-center"
                  >
                    <Plus size={18} className="mr-1.5" />
                    Nova Conta
                  </button>
                </PermissionGuard>
              </div>
            </div>
            
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total de Contas</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</h3>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                    <FileText size={24} />
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Entradas</p>
                    <h3 className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalCredito)}</h3>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <ArrowDownCircle size={24} />
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Saídas</p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalDebito)}</h3>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <ArrowUpCircle size={24} />
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Balanço</p>
                    <div className={`text-2xl font-bold mt-1 ${stats.totalCredito - stats.totalDebito >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.totalCredito - stats.totalDebito)}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.totalCredito - stats.totalDebito >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                    <DollarSign size={24} />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Resumo financeiro atual */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Info size={20} className="mr-2 text-[#344893]" />
                Resumo Financeiro
              </h2>
              <div className="text-xs bg-blue-50 text-blue-700 py-1 px-2 rounded-full">
                {filteredContas.length} de {contasCorrente.length} contas
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Distribuição por tipo */}
              <div className="rounded-lg bg-gray-50 p-3">
                <h3 className="text-xs font-medium text-gray-500 mb-2">Por Tipo</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Extra Caixa:</span>
                    <span className="font-medium">{filteredContas.filter(c => c.tipo === 'EXTRA_CAIXA').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>A Pagar:</span>
                    <span className="font-medium">{filteredContas.filter(c => c.tipo === 'CONTA_PAGAR').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>A Receber:</span>
                    <span className="font-medium">{filteredContas.filter(c => c.tipo === 'CONTA_RECEBER').length}</span>
                  </div>
                </div>
              </div>

              {/* Distribuição por saldo */}
              <div className="rounded-lg bg-gray-50 p-3">
                <h3 className="text-xs font-medium text-gray-500 mb-2">Por Saldo</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Positivo:</span>
                    <span className="font-medium text-green-600">{stats.totalPositivo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Negativo:</span>
                    <span className="font-medium text-red-600">{stats.totalNegativo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                </div>
              </div>

              {/* Top empresas (por quantidade) */}
              <div className="rounded-lg bg-gray-50 p-3">
                <h3 className="text-xs font-medium text-gray-500 mb-2">Top Empresas</h3>
                <div className="space-y-1">
                  {Object.entries(stats.porEmpresa)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([empresa, count], idx) => (
                      <div key={idx} className="flex justify-between text-sm truncate">
                        <span className="truncate">{empresa}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))
                  }
                  {Object.keys(stats.porEmpresa).length === 0 && (
                    <div className="text-sm text-gray-500">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Totais financeiros */}
              <div className="rounded-lg bg-gray-50 p-3">
                <h3 className="text-xs font-medium text-gray-500 mb-2">Totais</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Entradas:</span>
                    <span className="font-medium text-green-600">{formatCurrency(stats.totalCredito)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Saídas:</span>
                    <span className="font-medium text-red-600">{formatCurrency(stats.totalDebito)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Balanço:</span>
                    <span className={stats.totalCredito - stats.totalDebito >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(stats.totalCredito - stats.totalDebito)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de busca e filtros */}
          <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar contas correntes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex space-x-2 w-full sm:w-auto">
                <div className="relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center px-3 py-2 rounded-lg border ${
                      isFilterActive
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <Filter size={16} className="mr-1.5" />
                    {isFilterActive ? `${Object.values({filterTipo, filterSetor, filterEmpresa, filterDateRange, filterUsuario, filterPositiveSaldo}).filter(Boolean).length} filtros` : "Filtrar"}
                    <ChevronDown size={16} className="ml-1.5" />
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg border ${
                      viewMode === "grid"
                        ? 'bg-[#344893] text-white border-[#344893]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Visualização em grade"
                  >
                    <Grid size={20} />
                  </button>
                  
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg border ${
                      viewMode === "table"
                        ? 'bg-[#344893] text-white border-[#344893]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Visualização em tabela"
                  >
                    <List size={20} />
                  </button>
                </div>

                {isFilterActive && (
                  <div className="relative">
                    <button
                      onClick={() => setShowExportOptions(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Exportar para Excel"
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Exportar</span>
                    </button>
                    
                    {/* Modal de opções de exportação */}
                    {showExportOptions && (
                      <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30 w-64">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-800">Opções de exportação</h3>
                          <button 
                            onClick={() => setShowExportOptions(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              setShowExportOptions(false);
                              exportToExcel(false);
                            }}
                            className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-sm"
                          >
                            <div className="flex items-center">
                              <FileSpreadsheet size={16} className="mr-2 text-green-600" />
                              <span>Exportação Simples</span>
                            </div>
                            <ChevronRight size={14} className="text-gray-400" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowExportOptions(false);
                              exportToExcel(true);
                            }}
                            className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-sm"
                          >
                            <div className="flex items-center">
                              <Database size={16} className="mr-2 text-blue-600" />
                              <span>Exportação Detalhada</span>
                            </div>
                            <ChevronRight size={14} className="text-gray-400" />
                          </button>
                          
                          <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                            A exportação detalhada inclui informações individuais de cada lançamento.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Painel de filtros expansível */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 mt-5 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Filtro por Tipo */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Tipo</label>
                        <select
                          value={filterTipo}
                          onChange={(e) => setFilterTipo(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="">Todos os tipos</option>
                          <option value="EXTRA_CAIXA">Extra Caixa</option>
                          <option value="CONTA_PAGAR">Conta a Pagar</option>
                          <option value="CONTA_RECEBER">Conta a Receber</option>
                        </select>
                      </div>

                      {/* Filtro por Setor */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Setor/Veículo</label>
                        <select
                          value={filterSetor}
                          onChange={(e) => setFilterSetor(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="">Todos os setores</option>
                          {setores.map((setor, idx) => (
                            <option key={idx} value={setor === 'Todos' ? '' : setor}>
                              {setor}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro por Empresa */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Empresa</label>
                        <select
                          value={filterEmpresa}
                          onChange={(e) => setFilterEmpresa(Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="0">Todas as empresas</option>
                          {empresas.map((empresa) => (
                            <option key={empresa.id} value={empresa.id}>
                              {empresa.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro por Usuário */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Usuário</label>
                        <select
                          value={filterUsuario}
                          onChange={(e) => setFilterUsuario(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="">Todos os usuários</option>
                          {usuarios.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome} {usuario.sobrenome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro por Período */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Data Inicial</label>
                        <input
                          type="date"
                          value={filterDateRange.start}
                          onChange={(e) => setFilterDateRange({...filterDateRange, start: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Data Final</label>
                        <input
                          type="date"
                          value={filterDateRange.end}
                          onChange={(e) => setFilterDateRange({...filterDateRange, end: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        />
                      </div>

                      {/* Filtro por Saldo */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Saldo</label>
                        <select
                          value={filterPositiveSaldo === null ? '' : filterPositiveSaldo ? 'positivo' : 'negativo'}
                          onChange={(e) => setFilterPositiveSaldo(e.target.value === 'positivo' ? true : e.target.value === 'negativo' ? false : null)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="">Todos os saldos</option>
                          <option value="positivo">Saldo Positivo</option>
                          <option value="negativo">Saldo Negativo</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleClearFilters}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Visualização de contas */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedContas.slice(0, visibleItems).map((conta) => (
                <ContaCorrenteCard
                  key={conta.id}
                  conta={conta}
                  onViewDetails={() => handleViewDetails(conta)}
                  onEdit={() => handleOpenEditModal(conta)}
                  onToggleVisibility={() => handleToggleVisibility(conta)}
                  canEdit={isAdmin || conta.userId === userId}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Créditos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Débitos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContas.slice(0, visibleItems).map((conta) => {
                    const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
                    const creditos = lancamentos
                      .filter((l) => l?.credito && !isNaN(parseFloat(String(l.credito))))
                      .reduce((sum, item) => sum + parseFloat(String(item.credito || "0")), 0);
                    const debitos = lancamentos
                      .filter((l) => l?.debito && !isNaN(parseFloat(String(l.debito))))
                      .reduce((sum, item) => sum + parseFloat(String(item.debito || "0")), 0);
                    const saldo = creditos - debitos;

                    return (
                      <tr key={conta.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`mr-2 flex-shrink-0 h-4 w-4 rounded-full ${conta.oculto ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                            <div className="text-sm font-medium text-gray-900">
                              {conta.fornecedorCliente || `Conta #${conta.id}`}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {conta.id}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(conta.data)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(conta.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{conta.tipo}</div>
                          <div className="text-xs text-gray-500">
                            {conta.setor || '-'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{conta.empresa?.nome || '-'}</div>
                          <div className="text-xs text-gray-500">
                            {conta.empresa?.numero || ''}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-green-600">{formatCurrency(creditos)}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-red-600">{formatCurrency(debitos)}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(saldo)}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewDetails(conta)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            
                            {(isAdmin || conta.userId === userId) && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(conta)}
                                  className="text-orange-600 hover:text-orange-800"
                                  title="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                                
                                <button
                                  onClick={() => handleToggleVisibility(conta)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Botão "Ver Mais" */}
          {sortedContas.length > visibleItems && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreItems}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893]"
              >
                Carregar mais
                <ChevronDown size={16} className="ml-2" />
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Mostrando {visibleItems} de {sortedContas.length} contas
              </p>
            </div>
          )}

          {/* Nenhum resultado encontrado após filtro */}
          {isFilterActive && filteredContas.length === 0 && !loading && (
            <div className="bg-white rounded-xl p-10 shadow-sm mt-6 text-center border border-gray-100">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <SearchX size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma conta encontrada</h3>
              <p className="text-gray-600 mb-6">
                Não encontramos contas que correspondam aos filtros selecionados.
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter size={16} className="mr-2" />
                Limpar filtros
              </button>
            </div>
          )}
        </main>

        {/* Modais */}
        <ContaCorrenteModal
          isOpen={isContaModalOpen}
          onClose={() => setIsContaModalOpen(false)}
          onSave={handleSaveContaCorrente}
          isEditMode={isEditMode}
          conta={selectedConta}
          empresas={empresas}
          colaboradores={colaboradores}
          usuarios={usuarios}
        />

        <AnimatePresence>
          {isConfirmDeleteModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="text-center mb-5">
                  <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={28} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Confirmar exclusão
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Você está prestes a excluir a conta
                    <br />
                    <strong>{contaToDelete?.fornecedorCliente || `#${contaToDelete?.id}`}</strong>.
                    <br />
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirmDeleteModalOpen(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={loadingAction}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    disabled={loadingAction}
                  >
                    {loadingAction ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processando...
                      </div>
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isExportModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-800">Exportando...</h3>
                <p className="text-gray-600 mt-2">Aguarde enquanto o relatório está sendo gerado.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de visualização de detalhes */}
        {isViewModalOpen && selectedConta && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              ref={viewModalRef}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <DollarSign size={20} className="mr-2 text-[#344893]" />
                    Detalhes da Conta Corrente
                  </h3>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Informações gerais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Informações Gerais</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID:</span>
                        <span className="font-medium">{selectedConta.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fornecedor/Cliente:</span>
                        <span className="font-medium">{selectedConta.fornecedorCliente || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data:</span>
                        <span className="font-medium">{formatDate(selectedConta.data)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">{selectedConta.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Setor/Veículo:</span>
                        <span className="font-medium">{selectedConta.setor || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${selectedConta.oculto ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedConta.oculto ? 'Oculto' : 'Visível'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Dados Adicionais</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Empresa:</span>
                        <span className="font-medium">{selectedConta.empresa?.nome || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Usuário:</span>
                        <span className="font-medium">{selectedConta.user?.nome} {selectedConta.user?.sobrenome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Criado em:</span>
                        <span className="font-medium">{formatDate(selectedConta.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Atualizado em:</span>
                        <span className="font-medium">{formatDate(selectedConta.updatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Observação:</span>
                        <span className="font-medium">{selectedConta.observacao || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resumo financeiro */}
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Resumo Financeiro</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      // Calcular valores
                      const lancamentos = Array.isArray(selectedConta.lancamentos) ? selectedConta.lancamentos : [];
                      const creditos = lancamentos
                        .filter(l => l?.credito && !isNaN(parseFloat(String(l.credito))))
                        .reduce((sum, item) => sum + parseFloat(String(item.credito || "0")), 0);
                      
                      const debitos = lancamentos
                        .filter(l => l?.debito && !isNaN(parseFloat(String(l.debito))))
                        .reduce((sum, item) => sum + parseFloat(String(item.debito || "0")), 0);
                      
                      const saldo = creditos - debitos;
                      
                      return (
                        <>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-green-600 text-sm font-medium mb-1">Total Entradas</div>
                            <div className="text-green-700 text-lg font-bold">{formatCurrency(creditos)}</div>
                          </div>
                          
                          <div className="bg-red-50 rounded-lg p-4 text-center">
                            <div className="text-red-600 text-sm font-medium mb-1">Total Saídas</div>
                            <div className="text-red-700 text-lg font-bold">{formatCurrency(debitos)}</div>
                          </div>
                          
                          <div className={`rounded-lg p-4 text-center ${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                            <div className={`text-sm font-medium mb-1 ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              Saldo Final
                            </div>
                            <div className={`text-lg font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                              {formatCurrency(saldo)}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Tabela de lançamentos */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Lançamentos</h4>
                  {selectedConta.lancamentos && selectedConta.lancamentos.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Documento
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Observação
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Crédito
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Débito
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedConta.lancamentos.map((lancamento, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(lancamento.data)}
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                {lancamento.numeroDocumento || '-'}
                              </td>
                              <td className="px-6 py-2 text-sm text-gray-900 max-w-xs truncate">
                                {lancamento.observacao || '-'}
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-medium text-green-600">
                                {lancamento.credito ? formatCurrency(parseFloat(String(lancamento.credito))) : '-'}
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-medium text-red-600">
                                {lancamento.debito ? formatCurrency(parseFloat(String(lancamento.debito))) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                              Total:
                            </td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                              {formatCurrency(
                                selectedConta.lancamentos
                                  .filter(l => l?.credito && !isNaN(parseFloat(String(l.credito))))
                                  .reduce((sum, item) => sum + parseFloat(String(item.credito || "0")), 0)
                              )}
                            </td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-red-600">
                              {formatCurrency(
                                selectedConta.lancamentos
                                  .filter(l => l?.debito && !isNaN(parseFloat(String(l.debito))))
                                  .reduce((sum, item) => sum + parseFloat(String(item.debito || "0")), 0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-gray-500">Esta conta não possui lançamentos registrados.</p>
                    </div>
                  )}
                </div>
                
                {/* Botões de ação */}
                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                  {(isAdmin || selectedConta.userId === userId) && (
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleOpenEditModal(selectedConta);
                      }}
                      className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Edit size={16} className="mr-1" />
                      Editar Conta
                    </button>
                  )}
                  
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-4 py-2 bg-[#344893] text-white rounded-lg text-sm font-medium hover:bg-[#2a3a74]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}