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
  ChevronRight, SearchX, FileText, BarChart as ChartBarIcon, PieChart as ChartPieIcon, FilePen, PlusCircle, MinusCircle, RefreshCw 
} from 'lucide-react';

import Header from '../components/Header';
import ContaCorrenteCard from '../components/ContaCorrenteCard';
import ContaCorrenteModal from '../components/ContaCorrenteModal';
import ContaCorrenteDetalhesModal from '../components/ContaCorrenteDetalhesModal';
import ProtectedRoute from '../components/ProtectedRoute';
import PermissionGuard from '../components/PermissionGuard';
import CardResumo from '../components/CardResumo';

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
  nomeEmpresa?: string;  // Add optional nomeEmpresa property
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
  cpf: string; // <-- Adicione isso!
}

// Atualizar a interface Stats
interface Stats {
  total: number;
  totalPositivo: number;
  totalNegativo: number;
  totalNeutro: number; // Nova propriedade para contas com saldo zero
  totalCredito: number;
  totalDebito: number;
  porEmpresa: Record<string, number>;
  porFornecedor: Record<string, number>;
}

const calculateStats = (contas: ContaCorrente[]) => {
  const stats = {
    totalCredito: 0,
    totalDebito: 0,
    totalPositivo: 0,
    totalNegativo: 0,
    totalNeutro: 0, // Inicializar nova categoria
    total: 0,
    porTipo: {
      EXTRA_CAIXA: 0,
      PERMUTA: 0,
      DEVOLUCAO: 0
    },
    porEmpresa: {} as Record<string, number>
  };

  contas.forEach(conta => {
    // Contagem por tipo
    if (conta.tipo) {
      if (stats.porTipo.hasOwnProperty(conta.tipo)) {
        stats.porTipo[conta.tipo as keyof typeof stats.porTipo]++;
      }
    }

    // Resto do código...
  });

  return stats;
};

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
  const [filterTipo, setFilterTipo] = useState<string | null>('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState(0);
  const [filterDateRange, setFilterDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [filterPositiveSaldo, setFilterPositiveSaldo] = useState<boolean | null>(null);
  const [filterSaldo, setFilterSaldo] = useState<string>(''); // Novo estado para saldo neutro
  const [showDashboard, setShowDashboard] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Estatísticas
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalPositivo: 0,
    totalNegativo: 0,
    totalNeutro: 0, // Inicializar como 0
    totalCredito: 0,
    totalDebito: 0,
    porEmpresa: {},
    porFornecedor: {}
  });
  
  // Paginação
  const [visibleItems, setVisibleItems] = useState<number>(12);
  const [itemsPerLoad, setItemsPerLoad] = useState<number>(12);

  // Adicione estados para armazenar os dados de resumo
  const [totalCreditos, setTotalCreditos] = useState<number>(0);
  const [totalDebitos, setTotalDebitos] = useState<number>(0);
  const [balancoGeral, setBalancoGeral] = useState<number>(0);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<any>(null);

  const [userPermissions, setUserPermissions] = useState({
    isAdmin: false,
    canAccess: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    hasAllDataAccess: false
  });

  const router = useRouter();
  const viewModalRef = useRef<HTMLDivElement>(null);

  // Modifique a função fetchPermissions para buscar e configurar as permissões corretamente
  const fetchPermissions = async (authToken: string) => {
    try {
      setLoading(true);
      
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

      const userId = statusData.user?.id;
      setUserId(userId);
      
      const isAdmin = statusData.isAdmin;
      setIsAdmin(isAdmin);

      // Configurar permissões com base na resposta da API
      if (isAdmin) {
        // Admins têm todas as permissões
        setUserPermissions({
          isAdmin: true,
          canAccess: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          hasAllDataAccess: true
        });
      } else {
        // Para usuários normais, verificar permissões específicas
        const permissionsResponse = await fetch(`/api/usuarios/permissions?userId=${userId}&page=contacorrente`, {
          headers: { 
            Authorization: `Bearer ${authToken}`
          }
        });
        
        if (!permissionsResponse.ok) {
          throw new Error("Falha ao verificar permissões");
        }
        
        const permissionsData = await permissionsResponse.json();
        
        setUserPermissions({
          isAdmin: false,
          canAccess: true, // Se chegou aqui, já tem acesso
          canCreate: permissionsData.permissions?.contacorrente?.canCreate || false,
          canEdit: permissionsData.permissions?.contacorrente?.canEdit || false,
          canDelete: permissionsData.permissions?.contacorrente?.canDelete || false,
          hasAllDataAccess: false
        });
      }
      
      // Buscar dados após configurar permissões
      buscarContasDoUsuario(userId);
      calcularResumoFinanceiro(userId);
      fetchDadosAuxiliares();
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  // No useEffect principal, substituir pelo fetchPermissions
  useEffect(() => {
    // Verificar se o localStorage está disponível no cliente
    if (typeof window === 'undefined') return;
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("Token não encontrado");
        router.push('/');
        return;
      }
      
      fetchPermissions(token);
    } catch (error) {
      console.error("Erro ao processar dados:", error);
      router.push('/');
    }
  }, [router]);

  // Adicione esta função para buscar contas diretamente com o ID do usuário
  const buscarContasDoUsuario = async (id: string) => {
    try {
      setLoading(true);
      
      console.log("Buscando contas correntes para o usuário:", id);
      
      const response = await fetch(`/api/contacorrente/usuario/${id}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Erro ${response.status} ao buscar contas correntes`);
        setContasCorrente([]);
        return;
      }
      
      const data = await response.json();
      console.log(`Recebidas ${data.length} contas correntes`);
      setContasCorrente(Array.isArray(data) ? data : []);
      
      // Forçar recálculo do resumo financeiro
      await calcularResumoFinanceiro(id);
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
      setContasCorrente([]);
    } finally {
      setLoading(false);
    }
  };

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
      
      // Filtrar apenas contas não ocultas antes de calcular estatísticas
      const contasVisiveis = contasCorrente.filter(conta => !conta.oculto);
      
      // Calcular estatísticas gerais
      let totalPositivo = 0;
      let totalNegativo = 0;
      let totalNeutro = 0; // Nova categoria para saldo zero
      let totalCredito = 0;
      let totalDebito = 0;
      const porEmpresa: Record<string, number> = {};
      const porFornecedor: Record<string, number> = {};
      
      contasVisiveis.forEach(conta => {
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
        
        // Classificar por saldo com a nova categoria "neutro"
        if (saldo > 0) {
          totalPositivo++;
        } else if (saldo < 0) {
          totalNegativo++;
        } else {
          totalNeutro++; // Incrementar contador de saldo zero
        }
        
        // Contar por empresa e fornecedor
        if (conta.empresa?.nome) {
          porEmpresa[conta.empresa.nome] = (porEmpresa[conta.empresa.nome] || 0) + 1;
        }
        
        const fornecedor = conta.fornecedorCliente || `Conta #${conta.id}`;
        porFornecedor[fornecedor] = (porFornecedor[fornecedor] || 0) + 1;
      });
      
      // Atualizar estatísticas incluindo a nova categoria
      setStats({
        total: contasVisiveis.length,
        totalPositivo,
        totalNegativo,
        totalNeutro, // Adicionar à interface Stats
        totalCredito,
        totalDebito,
        porEmpresa,
        porFornecedor
      });
      
      // Extrair setores únicos apenas das contas visíveis
      const uniqueSetores = Array.from(
        new Set(contasVisiveis.filter(c => c.setor).map(c => c.setor as string))
      );
      
      setSetores(['Todos', ...uniqueSetores.sort()]);
    }
  }, [contasCorrente, itemsPerLoad]);

  // Resetar itens visíveis quando os filtros mudam
  useEffect(() => {
    setVisibleItems(itemsPerLoad);
  }, [searchTerm, filterTipo, filterSetor, filterEmpresa, filterDateRange, filterPositiveSaldo, filterSaldo, itemsPerLoad]);

  // No fetchDadosAuxiliares, sempre busque o usuário logado (não só para admin)
  const fetchDadosAuxiliares = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch empresas
      console.log("Buscando lista de empresas...");
      const empresasResponse = await fetch('/api/empresas/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (empresasResponse.ok) {
        const empresasData = await empresasResponse.json();
        console.log(`Encontradas ${empresasData.length} empresas`);
        
        // Normalizar os dados das empresas para garantir que todos tenham a propriedade nome
        const empresasNormalizadas = empresasData.map((empresa: any) => ({
          ...empresa,
          nome: empresa.nome || empresa.nomeEmpresa || `Empresa ${empresa.id}`
        }));
        
        setEmpresas(empresasNormalizadas);
      } else {
        console.error("Erro ao buscar empresas:", empresasResponse.status);
      }
      
      // Fetch colaboradores
      const colaboradoresResponse = await fetch('/api/colaboradores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colaboradoresResponse.ok) {
        const colaboradoresData = await colaboradoresResponse.json();
        setColaboradores(colaboradoresData);
      }
      
      // Buscar usuário logado
      const statusResponse = await fetch("/api/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.user) {
          setUsuarios([statusData.user]); // Array com apenas o usuário logado
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
    // Verificação mais rígida - somente com permissão explícita
    if (!userPermissions.canEdit) {
      toast.error("Você não tem permissão para editar esta conta.");
      return;
    }
    
    setSelectedConta(conta);
    setIsEditMode(true);
    setIsContaModalOpen(true);
  };

  const handleEditarContaCorrente = (conta: any) => {
    // Certificar-se de que os lançamentos têm IDs definidos
    const contaCompleta = {
      ...conta,
      lancamentos: conta.lancamentos?.map((l: any) => ({
        ...l,
        id: l.id || undefined  // Garantir que o ID está definido para lançamentos existentes
      })) || []
    };
    
    console.log('Abrindo modal de edição com conta:', contaCompleta);
    setSelectedConta(contaCompleta);
    setIsContaModalOpen(true);
  };

  const handleViewDetails = (conta: ContaCorrente) => {
    setSelectedConta(conta);
    setIsViewModalOpen(true);
  };

  const handleToggleVisibility = (conta: ContaCorrente) => {
    // Verificação mais rígida - somente com permissão explícita  
    if (!userPermissions.canDelete) {
      toast.error("Você não tem permissão para excluir esta conta.");
      return;
    }
    
    setContaToDelete(conta);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contaToDelete) return;
    
    try {
      setLoadingAction(true);
      
      // Registrar mais informações para depuração
      console.log("Tentando ocultar conta:", contaToDelete.id);
      console.log("Usando userId:", userId);
      
      // Enviar userId diretamente no corpo da requisição
      const response = await fetch('/api/contacorrente/ocultar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          id: contaToDelete.id,
          userId: userId  // Enviar o userId junto
        })
      });
      
      // Para depuração - registrar o código de status da resposta
      console.log("Código de status da resposta:", response.status);
      
      // Capture o texto da resposta para depuração, independente de ser OK ou não
      const responseText = await response.text();
      console.log("Resposta completa:", responseText);
      
      let responseData;
      try {
        // Tenta converter o texto para JSON
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Erro ao parsear resposta como JSON:", e);
        throw new Error("A resposta da API não está em formato JSON válido");
      }
      
      if (!response.ok) {
        throw new Error(responseData.error || "Erro ao atualizar conta corrente");
      }
      
      // Atualizar a lista de contas localmente
      await buscarContasDoUsuario(userId || '');
      await calcularResumoFinanceiro(userId || '');
      
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <Check size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium text-red-600">Conta excluída com sucesso!</p>
            <p className="text-sm text-red-500">
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
      toast.error(`Falha ao excluir conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveContaCorrente = async (dados: { 
    contaCorrente: any, 
    lancamentos: any[], 
    preserveExistingEntries?: boolean,
    modificacoesContaCorrente?: boolean
  }) => {
    try {
      setLoadingAction(true);
      
      // Verificar se o usuário está disponível
      if (!userId) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        router.push('/');
        return;
      }
      
      let contaSalvaId = dados.contaCorrente.id;
      
      // Se a conta corrente foi modificada ou é uma nova conta, salvar os dados da conta
      const contaFoiModificada = dados.modificacoesContaCorrente || !dados.contaCorrente.id;
      
      if (contaFoiModificada) {
        // IMPORTANTE: Validação de dados da conta corrente
        const dadosProcessados = {
          ...dados.contaCorrente,
          id: dados.contaCorrente.id ? Number(dados.contaCorrente.id) : undefined,
          empresaId: dados.contaCorrente.empresaId ? Number(dados.contaCorrente.empresaId) : null,
          colaboradorId: dados.contaCorrente.colaboradorId ? Number(dados.contaCorrente.colaboradorId) : null,
          userId: dados.contaCorrente.id ? dados.contaCorrente.userId : userId,
          data: dados.contaCorrente.data || new Date().toISOString().split('T')[0]
        };
        
        console.log("Dados da conta corrente modificados, enviando para API:", dadosProcessados);
        
        try {
          // Usar a API que já está funcionando (por ID de usuário)
          const responseCC = await fetch(`/api/contacorrente/usuario/${userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosProcessados)
          });
          
          if (!responseCC.ok) {
            let errorMessage = "Erro ao salvar conta corrente";
            try {
              const errorData = await responseCC.json();
              if (errorData.error) errorMessage += `: ${errorData.error}`;
            } catch (e) {
              console.error("Erro ao processar resposta de erro:", e);
            }
            throw new Error(errorMessage);
          }
          
          const contaSalva = await responseCC.json();
          contaSalvaId = contaSalva.id;
          console.log("Conta corrente salva com sucesso:", contaSalva);
        } catch (error) {
          console.error("Erro ao salvar conta corrente:", error);
          throw error; // Repassar o erro para ser tratado pelo catch externo
        }
      } else {
        console.log("Nenhuma alteração na conta corrente, usando ID existente:", contaSalvaId);
      }
      
      // Processar lançamentos (independente de alterações na conta)
      if (dados.lancamentos && dados.lancamentos.length > 0) {
        // Filtrar lançamentos válidos
        const lancamentosValidos = dados.lancamentos.filter(l => {
          const temCredito = l.credito && l.credito.toString().trim() !== '';
          const temDebito = l.debito && l.debito.toString().trim() !== '';
          return temCredito || temDebito;
        });
        
        // Se não houver lançamentos válidos, não precisamos fazer nada
        if (lancamentosValidos.length === 0) {
          console.warn("Nenhum lançamento válido para processar");
        } else {
          // Processar e normalizar lançamentos
          const lancamentosProcessados = lancamentosValidos.map(l => ({
            // IMPORTANTE: Preservar o ID para identificar lançamentos existentes vs. novos
            id: l.id, // Manter o ID se existir
            data: l.data || new Date().toISOString().split('T')[0],
            numeroDocumento: l.numeroDocumento || '',
            observacao: l.observacao || '',
            credito: l.credito ? l.credito.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null,
            debito: l.debito ? l.debito.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null
          }));
          
          console.log("Lançamentos processados para envio:", lancamentosProcessados);
          console.log("Preservar lançamentos existentes?", dados.preserveExistingEntries === true ? "Sim" : "Não");
          
          try {
            const lancamentosResponse = await fetch(`/api/lancamento/usuario/${userId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contaCorrenteId: contaSalvaId,
                lancamentos: lancamentosProcessados,
                clearExisting: !dados.preserveExistingEntries // Inverter a lógica para maior clareza
              })
            });
            
            if (!lancamentosResponse.ok) {
              console.error("Erro ao salvar lançamentos:", await lancamentosResponse.text());
              toast.warn("Houve um problema ao salvar os lançamentos");
            } else {
              const resultadoLancamentos = await lancamentosResponse.json();
              console.log("Lançamentos salvos com sucesso:", resultadoLancamentos);
            }
          } catch (error) {
            console.error("Erro ao salvar lançamentos:", error);
            toast.warn("Erro ao processar lançamentos");
          }
        }
      }
      
      toast.success("Conta corrente salva com sucesso!");
      setIsContaModalOpen(false);
      
      // IMPORTANTE: Forçar atualização completa dos dados após salvar
      if (userId) {
        await buscarContasDoUsuario(userId);
        await calcularResumoFinanceiro(userId);
      }
    } catch (error) {
      console.error("Erro ao salvar conta corrente:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Adicione esta função para recalcular o resumo financeiro
  const calcularResumoFinanceiro = async (userId: string) => {
    try {
      // Buscar todas as contas correntes com seus lançamentos
      const response = await fetch(`/api/contacorrente/resumo/${userId}`);
      
      if (!response.ok) {
        console.error("Erro ao buscar resumo financeiro:", await response.text());
        return;
      }
      
      const resumo = await response.json();
      
      // Atualizar os estados com os dados do resumo
      setTotalCreditos(resumo.totalEntradas);
      setTotalDebitos(resumo.totalSaidas);
      setBalancoGeral(resumo.balanco);
      // Atualize outros estados de resumo se existirem
      
      console.log("Resumo financeiro atualizado:", resumo);
    } catch (error) {
      console.error("Erro ao calcular resumo financeiro:", error);
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
    setFilterPositiveSaldo(null);
    setFilterSaldo('');
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
                        filterPositiveSaldo !== null || filterSaldo;

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
          'Tipo': conta.tipo === 'EXTRA_CAIXA' ? 'Extra Caixa' : 
                  conta.tipo === 'PERMUTA' ? 'Permuta' : 
                  conta.tipo === 'DEVOLUCAO' ? 'Devolução' : conta.tipo || '',
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
      if (filterPositiveSaldo !== null) fileNameParts.push(filterPositiveSaldo ? 'saldo-positivo' : 'saldo-negativo');
      if (filterSaldo) fileNameParts.push(`saldo-${filterSaldo}`);
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
    // Primeiro, filtrar contas ocultadas
    if (conta.oculto) return false;
    
    // Calcular o saldo para aplicar o filtro
    const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
    const creditos = lancamentos
      .filter(l => l?.credito && !isNaN(parseFloat(String(l.credito))))
      .reduce((sum, item) => sum + parseFloat(String(item.credito || "0")), 0);
    
    const debitos = lancamentos
      .filter(l => l?.debito && !isNaN(parseFloat(String(l.debito))))
      .reduce((sum, item) => sum + parseFloat(String(item.debito || "0")), 0);
    
    const saldo = creditos - debitos;

    // Aplicar filtro de saldo
    if (filterSaldo === 'positivo' && saldo <= 0) return false;
    if (filterSaldo === 'negativo' && saldo >= 0) return false;
    if (filterSaldo === 'neutro' && saldo !== 0) return false;

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
    
    if (filterPositiveSaldo !== null) {
      if (filterPositiveSaldo && saldo < 0) return false;
      if (!filterPositiveSaldo && saldo >= 0) return false;
    }
    
    return matchesSearch;
  });

  // Ordenar contas (mais recentes primeiro)
  const sortedContas = [...filteredContas].sort((a, b) => {
    return new Date(b.data).getTime() - new Date(a.data).getTime();
  });

  // Adicionar no início do componente junto com os outros estados
  const [isConfirmPdfModalOpen, setIsConfirmPdfModalOpen] = useState(false);
  const [contaForPdf, setContaForPdf] = useState<ContaCorrente | null>(null);

  // Adicionar com as outras funções de manipulação
  const handleGeneratePdfRequest = (conta: ContaCorrente) => {
    setContaForPdf(conta);
    setIsConfirmPdfModalOpen(true);
  };

  // Função para gerar o PDF após confirmação
  const handleConfirmGeneratePdf = async () => {
    if (!contaForPdf) return;
    
    try {
      setLoadingAction(true);
      
      const response = await fetch('/api/contacorrente/generate-termo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contaId: contaForPdf.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao gerar termo: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const fornecedorCliente = contaForPdf.fornecedorCliente 
        ? contaForPdf.fornecedorCliente.replace(/\s+/g, '_')
        : `conta_${contaForPdf.id}`;
        
      const empresaNome = contaForPdf.empresa?.nome
        ? contaForPdf.empresa.nome.replace(/\s+/g, '_')
        : 'sem_empresa';
      
      const nomeArquivo = `termo_${fornecedorCliente}_${empresaNome}.pdf`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-orange-100 p-2 rounded-full">
            <FileText size={18} className="text-orange-600" />
          </div>
          <div>
            <p className="font-medium">Termo gerado com sucesso</p>
            <p className="text-sm text-gray-600">
              O download do termo de conta corrente foi iniciado.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-orange-500"
        }
      );
    } catch (error) {
      console.error('Erro ao gerar termo:', error);
      toast.error(`Erro ao gerar termo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsConfirmPdfModalOpen(false);
      setContaForPdf(null);
      setLoadingAction(false);
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <CardResumo 
                titulo="Total de Contas" 
                valor={filteredContas.length} 
                icone={<FilePen size={24} />} 
                cor="blue"
              />
              <CardResumo 
                titulo="Total Entradas" 
                valor={formatCurrency(totalCreditos)} 
                icone={<PlusCircle size={24} />} 
                cor="green"
              />
              <CardResumo 
                titulo="Total Saídas" 
                valor={formatCurrency(totalDebitos)} 
                icone={<MinusCircle size={24} />} 
                cor="red"
              />
              <CardResumo 
                titulo="Balanço" 
                valor={formatCurrency(balancoGeral)} 
                icone={<DollarSign size={24} />} 
                cor={balancoGeral >= 0 ? "green" : "red"}
              />
            </div>
          </div>

          {/* Resumo financeiro atual */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Info size={20} className="mr-2 text-[#344893]" />
                Resumo Financeiro
              </h2>
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
                    <span>Permuta:</span>
                    <span className="font-medium">{filteredContas.filter(c => c.tipo === 'PERMUTA').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Devolução:</span>
                    <span className="font-medium">{filteredContas.filter(c => c.tipo === 'DEVOLUCAO').length}</span>
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
                    <span>Neutro:</span>
                    <span className="font-medium text-blue-600">{stats.totalNeutro}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                </div>
              </div>

              {/* Top fornecedores/clientes (por quantidade) */}
              <div className="rounded-lg bg-gray-50 p-3">
                <h3 className="text-xs font-medium text-gray-500 mb-2">Top Fornecedores/Clientes</h3>
                <div className="space-y-1">
                  {Object.entries(stats.porFornecedor)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([fornecedor, count], idx) => (
                      <div key={idx} className="flex justify-between text-sm truncate">
                        <span className="truncate max-w-[70%]" title={fornecedor}>{fornecedor}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))
                  }
                  {Object.keys(stats.porFornecedor).length === 0 && (
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
                    <div className={`text-sm font-medium ${
                      stats.totalCredito - stats.totalDebito > 0 
                        ? 'text-green-600' 
                        : stats.totalCredito - stats.totalDebito < 0 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                    }`}>
                      {formatCurrency(stats.totalCredito - stats.totalDebito)}
                    </div>
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
                    {isFilterActive ? `${Object.values({filterTipo, filterSetor, filterEmpresa, filterDateRange, filterPositiveSaldo, filterSaldo}).filter(Boolean).length} filtros` : "Filtrar"}
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
                      {/* Filtro por tipo */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Tipo
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
                          value={filterTipo || ""}
                          onChange={(e) => setFilterTipo(e.target.value === '' ? null : e.target.value)}
                        >
                          <option value="">Todos</option>
                          <option value="EXTRA_CAIXA">Extra Caixa</option>
                          <option value="PERMUTA">Permuta</option>
                          <option value="DEVOLUCAO">Devolução</option>
                        </select>
                      </div>

                      {/* Filtro por Setor */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Setor</label>
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

                      {/* Filtro por Empresa - Corrigido */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Empresa</label>
                        <select
                          value={filterEmpresa}
                          onChange={(e) => setFilterEmpresa(Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="0">Todas as empresas</option>
                          {Array.isArray(empresas) && empresas.length > 0 ? (
                            empresas.map((empresa) => (
                              <option key={empresa.id} value={empresa.id}>
                                {empresa.nome || `Empresa ${empresa.id}`}
                              </option>
                            ))
                          ) : (
                            <option disabled>Carregando empresas...</option>
                          )}
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
                          value={filterSaldo}
                          onChange={(e) => setFilterSaldo(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893]"
                        >
                          <option value="">Todos os saldos</option>
                          <option value="positivo">Saldo Positivo</option>
                          <option value="negativo">Saldo Negativo</option>
                          <option value="neutro">Saldo Neutro</option>
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
          {loading && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h3 className="font-medium text-gray-700">Verificando acesso...</h3>
              <div className="text-sm text-gray-500 mt-2">
                <div>Por favor, aguarde enquanto verificamos suas permissões.</div>
              </div>
            </div>
          )}

          {!loading && contasCorrente.length === 0 && (
            <div className="bg-white rounded-xl p-8 shadow-md mb-6 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Wallet size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">Nenhuma conta corrente encontrada</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Você ainda não possui nenhuma conta corrente cadastrada. 
                Crie sua primeira conta para começar a controlar seus lançamentos financeiros.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handleOpenNewContaModal}
                  className="px-6 py-3 bg-[#344893] text-white rounded-lg hover:bg-[#2a3a74] transition-colors flex items-center"
                >
                  <Plus size={18} className="mr-2" />
                  Criar nova conta
                </button>
                <button 
                  onClick={() => userId ? buscarContasDoUsuario(userId) : null}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <RefreshCw size={18} className="mr-2" />
                  Atualizar dados
                </button>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-500">
                <p className="mb-1">Se você acredita que deveria ter acesso a contas existentes, verifique suas permissões.</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Informações de diagnóstico</summary>
                  <div className="p-3 bg-gray-50 rounded-lg mt-2 text-left">
                    <div><strong>User ID:</strong> {userId || 'Não disponível'}</div>
                    <div><strong>Admin:</strong> {isAdmin ? 'Sim' : 'Não'}</div>
                    <div><strong>Token presente:</strong> {localStorage.getItem("token") ? 'Sim' : 'Não'}</div>
                  </div>
                </details>
              </div>
            </div>
          )}

          {viewMode === "table" ? (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
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
                      Setor
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                      <tr key={conta.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {conta.fornecedorCliente || `Conta #${conta.id}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {lancamentos.length} lançamento(s)
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(conta.data)}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {conta.tipo === 'EXTRA_CAIXA' ? 'Extra Caixa' : 
                             conta.tipo === 'PERMUTA' ? 'Permuta' : 
                             conta.tipo === 'DEVOLUCAO' ? 'Devolução' : conta.tipo}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{conta.setor || '-'}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(() => {
                              // Tentar obter o nome da empresa de todas as formas possíveis
                              const empresaNome = conta.empresa?.nome || 
                                                 conta.empresa?.nomeEmpresa || 
                                                 (conta.empresaId ? `Empresa #${conta.empresaId}` : '-');
                              
                              // Adicionar log para depuração apenas durante o desenvolvimento
                              console.log(`Empresa para conta ${conta.id}:`, {
                                empresaObj: conta.empresa,
                                empresaId: conta.empresaId,
                                empresaNome
                              });
                              
                              return empresaNome;
                            })()}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-green-600">{formatCurrency(creditos)}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-red-600">{formatCurrency(debitos)}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${
                            saldo > 0 
                              ? 'text-green-600' 
                              : saldo < 0 
                                ? 'text-red-600' 
                                : 'text-blue-600' // Azul para saldo zero
                          }`}>
                            {formatCurrency(saldo)}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-3">
                            {/* Botão para gerar termo PDF - manter com fundo colorido */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGeneratePdfRequest(conta);
                              }}
                              className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
                              title="Gerar Termo"
                            >
                              <FileText size={16} />
                            </button>
                            
                            {/* Botões existentes - sem fundo colorido */}
                            <button
                              onClick={() => handleViewDetails(conta)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            
                            {userPermissions.canEdit && (
                              <button
                                onClick={() => handleOpenEditModal(conta)}
                                className="text-orange-600 hover:text-orange-800"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            
                            {userPermissions.canDelete && (
                              <button
                                onClick={() => handleToggleVisibility(conta)}
                                className="text-red-600 hover:text-red-800"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedContas.slice(0, visibleItems).map((conta) => (
                <ContaCorrenteCard
                  key={conta.id}
                  conta={conta}
                  onViewDetails={() => handleViewDetails(conta)}
                  onEdit={() => handleOpenEditModal(conta)}
                  onToggleVisibility={() => handleToggleVisibility(conta)}
                  onGeneratePdf={() => handleGeneratePdfRequest(conta)} // Adicionar esta prop
                  canEdit={userPermissions.canEdit}
                  canDelete={userPermissions.canDelete}
                />
              ))}
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
                <ChevronDown size={16} />
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
          setores={setores}
          isLoading={loadingAction}
          isAdminMode={isAdmin}
          currentUserId={userId || ''}
          userPermissions={userPermissions}
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
          <ContaCorrenteDetalhesModal
            conta={selectedConta}
            onClose={() => setIsViewModalOpen(false)}
            onEdit={() => {
              setIsViewModalOpen(false);
              handleOpenEditModal(selectedConta);
            }}
            canEdit={userPermissions.isAdmin || userPermissions.canEdit || selectedConta.userId === userId}
          />
        )}

        {/* Modal de confirmação para geração de PDF - Versão Simplificada */}
        <AnimatePresence>
          {isConfirmPdfModalOpen && contaForPdf && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
              >
                <div className="text-center mb-5">
                  <div className="mx-auto w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <FileText size={28} className="text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Gerar Termo em PDF
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Deseja baixar o termo em PDF para esta conta corrente?
                  </p>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsConfirmPdfModalOpen(false);
                      setContaForPdf(null);
                    }}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={loadingAction}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmGeneratePdf}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    disabled={loadingAction}
                  >
                    {loadingAction ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Gerando...
                      </div>
                    ) : (
                      'Baixar Termo'
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}