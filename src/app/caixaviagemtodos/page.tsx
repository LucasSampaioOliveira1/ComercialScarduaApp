"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Lucide Icons
import {
  Search, Filter, X, PlusCircle, Download, ChevronDown, ChevronUp,
  ArrowDownCircle, ArrowUpCircle, DollarSign, Plane, User,
  Building, Calendar, MapPin, Eye, Edit, Trash2, Loader2, Check,
  Grid, List, FileText, RefreshCw
} from 'lucide-react';

// Componentes
import Header from '../components/Header';
import CardResumo from '../components/CardResumo';
import CaixaViagemCard from '../components/CaixaViagemCard';
import CaixaViagemModalAdmin from '../components/CaixaViagemModalAdmin';
import CaixaViagemDetalhesModal from '../components/CaixaViagemDetalhesModal';
import ProtectedRoute from '../components/ProtectedRoute';

// Interfaces
interface CaixaViagem {
  id: number;
  userId: string;
  empresaId?: number;
  funcionarioId?: number;
  veiculoId?: number; // Added veiculoId property
  data: string;
  destino: string;
  observacao?: string;
  oculto: boolean;
  createdAt?: string;
  updatedAt?: string;
  saldo: number;
  numeroCaixa?: number;
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
    nomeEmpresa?: string;
  };
  funcionario?: {
    id: number;
    nome: string;
    sobrenome?: string;
    setor?: string;
  };
}

interface Lancamento {
  id: number;
  caixaViagemId: number;
  data: string;
  numeroDocumento?: string;
  historicoDoc?: string;
  custo: string;
  clienteFornecedor?: string;
  entrada?: string;
  saida?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Empresa {
  id: number;
  nomeEmpresa?: string;
  nome?: string;
}

interface Funcionario {
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

interface Veiculo {
  id: number;
  placa?: string;
  modelo?: string;
  descricao?: string;
}

// Função para garantir que os dados são arrays
function ensureArray<T>(data: any, fallback: T[] = []): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key in data) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return fallback;
}

export default function CaixaViagemTodosPage() {
  // Estados principais
  const [caixasViagem, setCaixasViagem] = useState<CaixaViagem[]>([]);
  const [resumo, setResumo] = useState<any>({
    totalCaixas: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    saldoGeral: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Estados para modais e seleção
  const [selectedCaixa, setSelectedCaixa] = useState<CaixaViagem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [caixaToDelete, setCaixaToDelete] = useState<CaixaViagem | null>(null);
  
  // Estados para filtros e visualização
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDestino, setFilterDestino] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState(0);
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [filterSaldo, setFilterSaldo] = useState<string>('');
  const [showHidden, setShowHidden] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Estados para paginação
  const [visibleItems, setVisibleItems] = useState<number>(12);
  const [itemsPerLoad] = useState<number>(12);
  
  // Estados para dados auxiliares
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  
  // Estado para permissões
  const [userPermissions, setUserPermissions] = useState({
    isAdmin: false,
    canAccess: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });

  const router = useRouter();

  // Efeito para verificar autenticação e permissões
  useEffect(() => {
    // Verificar se o localStorage está disponível no cliente
    if (typeof window === 'undefined') return;
    
    try {
      const token = localStorage.getItem("token");
      setToken(token);
      
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

  // Efeito para buscar dados iniciais
  useEffect(() => {
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

  // Efeito específico apenas para calcular estatísticas quando as caixas são atualizadas
  useEffect(() => {
    // Verificar se há caixas para evitar cálulos desnecessários
    if (caixasViagem.length > 0) {
      // Usar setTimeout para garantir que o DOM foi atualizado antes de calcular
      const timer = setTimeout(() => {
        buscarEstatisticas();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [caixasViagem, showHidden]);

  // Separar a inicialização de dados para evitar loops
  const inicializarDados = async (token: string) => {
    try {
      setLoading(true);
      const caixas = await buscarCaixasDeViagem();
      if (caixas.length > 0) {
        // Adicionar um pequeno delay para garantir que o DOM foi atualizado
        setTimeout(() => buscarEstatisticas(), 300);
      }
      await fetchDadosAuxiliares();
    } catch (error) {
      console.error("Erro ao inicializar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar permissões
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

      const isAdmin = statusData.isAdmin;

      // Configurar permissões com base na resposta da API
      if (isAdmin) {
        // Admins têm todas as permissões
        setUserPermissions({
          isAdmin: true,
          canAccess: true,
          canCreate: true,
          canEdit: true,
          canDelete: true
        });
        
        // Se for admin, buscar os dados
        await buscarCaixasDeViagem();
        await buscarEstatisticas();
        await fetchDadosAuxiliares();
      } else {
        // Para usuários normais, verificar permissões específicas
        const permissionsResponse = await fetch(`/api/usuarios/permissions?userId=${statusData.user.id}&page=caixaviagem`, {
          headers: { 
            Authorization: `Bearer ${authToken}`
          }
        });
        
        if (!permissionsResponse.ok) {
          throw new Error("Falha ao verificar permissões");
        }
        
        const permissionsData = await permissionsResponse.json();
        
        const canAccess = permissionsData.permissions?.caixaviagem?.canAccess || false;
        
        if (!canAccess) {
          // Redirecionar para a página de caixas pessoais se não tiver acesso a todas as caixas
          router.push('/caixaviagem');
          return;
        }
        
        setUserPermissions({
          isAdmin: false,
          canAccess: true,
          canCreate: permissionsData.permissions?.caixaviagem?.canCreate || false,
          canEdit: permissionsData.permissions?.caixaviagem?.canEdit || false,
          canDelete: permissionsData.permissions?.caixaviagem?.canDelete || false
        });
        
        // Se tem acesso, buscar os dados
        await buscarCaixasDeViagem();
        await buscarEstatisticas();
        await fetchDadosAuxiliares();
      }
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      toast.error("Erro ao verificar permissões");
      router.push("/caixaviagem");
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar todas as caixas de viagem
  const buscarCaixasDeViagem = async () => {
    try {
      setLoading(true);
      
      console.log("Buscando todas as caixas de viagem...");
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado");
      
      const url = new URL(`${window.location.origin}/api/caixaviagem/todos`);
      url.searchParams.append("showHidden", showHidden.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Erro ${response.status} ao buscar caixas de viagem`);
        setCaixasViagem([]);
        return [];
      }
      
      const data = await response.json();
      console.log(`Recebidas ${data.length} caixas de viagem`);
      
      // Atualizar estado com os dados recebidos
      setCaixasViagem(data);
      
      // Extrair lista de destinos únicos para filtros
      const destinosUnicos = Array.from(
        new Set(data.map((c: CaixaViagem) => c.destino).filter(Boolean))
      ).sort() as string[];
      
      setDestinos(['Todos', ...destinosUnicos]);
      
      return data;
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      setCaixasViagem([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Atualização da função buscarEstatisticas para garantir estabilidade
  const buscarEstatisticas = () => {
    try {
      // Criar uma cópia local para evitar problemas de referência
      const caixasAtual = [...caixasViagem];
      
      // Verificar se temos dados para processar
      if (caixasAtual.length === 0) {
        console.log("Sem caixas para calcular estatísticas");
        return;
      }
      
      console.log(`Calculando estatísticas para ${caixasAtual.length} caixas`);
      
      // Buscar dados diretamente das caixas de viagem já carregadas
      let totalEntradas = 0;
      let totalSaidas = 0;
      let totalCaixas = 0;
      
      caixasAtual.forEach(caixa => {
        // Ignorar caixas ocultas se showHidden está desativado
        if (caixa.oculto && !showHidden) return;
        
        totalCaixas++;
        
        // Calcular entradas e saídas dos lançamentos
        if (Array.isArray(caixa.lancamentos)) {
          caixa.lancamentos.forEach(lancamento => {
            if (lancamento.entrada) {
              const valor = parseFloat(String(lancamento.entrada).replace(/[^\d.,]/g, '').replace(',', '.'));
              if (!isNaN(valor)) {
                totalEntradas += valor;
              }
            }
            
            if (lancamento.saida) {
              const valor = parseFloat(String(lancamento.saida).replace(/[^\d.,]/g, '').replace(',', '.'));
              if (!isNaN(valor)) {
                totalSaidas += valor;
              }
            }
          });
        }
      });
      
      // Calcular saldo geral
      const saldoGeral = totalEntradas - totalSaidas;
      
      console.log("Estatísticas calculadas localmente:", {
        totalCaixas,
        totalEntradas,
        totalSaidas,
        saldoGeral
      });
      
      // Atualizar o estado com os valores calculados
      setResumo({
        totalCaixas,
        totalEntradas,
        totalSaidas,
        saldoGeral
      });
    } catch (error) {
      console.error("Erro ao calcular estatísticas:", error);
      // Manter os valores anteriores em caso de erro, em vez de zerar
    }
  };

  // Função para buscar dados auxiliares
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
        
        // Normalizar os dados das empresas
        const empresasNormalizadas = empresasData.map((empresa: any) => ({
          ...empresa,
          nome: empresa.nome || empresa.nomeEmpresa || `Empresa ${empresa.id}`
        }));
        
        setEmpresas(empresasNormalizadas);
      } else {
        console.error("Erro ao buscar empresas:", empresasResponse.status);
      }
      
      // Fetch colaboradores
      const funcionariosResponse = await fetch('/api/colaboradores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (funcionariosResponse.ok) {
        const funcionariosData = await funcionariosResponse.json();
        setFuncionarios(funcionariosData);
      }
      
      // Fetch usuários
      const usuariosResponse = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json();
        setUsuarios(usuariosData.usuarios || usuariosData);
      }
      
      // Fetch veículos
      const veiculosResponse = await fetch('/api/patrimonio/veiculos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (veiculosResponse.ok) {
        const veiculosData = await veiculosResponse.json();
        setVeiculos(veiculosData);
      }
    } catch (error) {
      console.error("Erro ao buscar dados auxiliares:", error);
      toast.error("Erro ao carregar dados complementares");
    }
  };

  // Função para abrir modal de nova caixa
  const handleOpenNewCaixaModal = () => {
    setSelectedCaixa(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Função para abrir modal de edição
  const handleOpenEditModal = (caixa: CaixaViagem) => {
    if (!userPermissions.canEdit && caixa.user?.id !== localStorage.getItem("userId")) {
      toast.error("Você não tem permissão para editar esta caixa.");
      return;
    }
    
    setSelectedCaixa(caixa);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Função para visualizar detalhes da caixa
  const handleViewDetails = (caixa: CaixaViagem) => {
    setSelectedCaixa(caixa);
    setIsViewModalOpen(true);
  };

  // Função para preparar exclusão/ocultação da caixa
  const handleToggleVisibility = (caixa: CaixaViagem) => {
    if (!userPermissions.canDelete && caixa.user?.id !== localStorage.getItem("userId")) {
      toast.error("Você não tem permissão para excluir esta caixa.");
      return;
    }
    
    setCaixaToDelete(caixa);
    setIsConfirmDeleteModalOpen(true);
  };

  // Função para confirmar exclusão/ocultação da caixa
  const handleConfirmDelete = async () => {
    if (!caixaToDelete) return;
    
    try {
      setLoadingAction(true);
      
      console.log("Tentando alterar visibilidade da caixa:", caixaToDelete.id);
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado");
      
      const response = await fetch('/api/caixaviagem/todos', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          id: caixaToDelete.id 
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`Erro ao alterar visibilidade: ${errorText}`);
      }
      
      // Atualizar a lista de caixas
      await buscarCaixasDeViagem();
      await buscarEstatisticas();
      
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-blue-100 p-2 rounded-full">
            <Check size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-600">Caixa atualizada com sucesso!</p>
            <p className="text-sm text-blue-500">
              A visibilidade da caixa para{' '}
              <strong>{caixaToDelete.destino}</strong>{' '}
              foi alterada.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-blue-500"
        }
      );
      
      setIsConfirmDeleteModalOpen(false);
      setCaixaToDelete(null);
    } catch (error) {
      console.error("Erro ao alterar visibilidade:", error);
      toast.error(`Falha ao alterar visibilidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Função para salvar caixa de viagem
  const handleSaveCaixaViagem = async (dados: { 
    caixaViagem: any, 
    lancamentos: any[]
  }) => {
    try {
      setLoadingAction(true);
      
      console.log("Salvando caixa de viagem:", dados);
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado");
      
      let caixaSalvaId = dados.caixaViagem.id;
      
      // Verificar se os dados necessários estão presentes
      if (!dados.caixaViagem.userId) {
        throw new Error("ID do usuário é obrigatório");
      }
      
      // Preparar dados da caixa de viagem
      const dadosProcessados = {
        ...dados.caixaViagem,
        id: dados.caixaViagem.id ? Number(dados.caixaViagem.id) : undefined,
        empresaId: dados.caixaViagem.empresaId ? Number(dados.caixaViagem.empresaId) : null,
        funcionarioId: dados.caixaViagem.funcionarioId ? Number(dados.caixaViagem.funcionarioId) : null,
        veiculoId: dados.caixaViagem.veiculoId ? Number(dados.caixaViagem.veiculoId) : null,
        data: dados.caixaViagem.data || new Date().toISOString().split('T')[0],
        numeroCaixa: dados.caixaViagem.numeroCaixa || 1, // Adicionado campo numeroCaixa
        saldoAnterior: dados.caixaViagem.saldoAnterior || 0 // Adicionado campo saldoAnterior
      };
      
      try {
        // Usar a API admin para criar/editar a caixa
        const responseCV = await fetch(`/api/caixaviagem/usuario/${dados.caixaViagem.userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosProcessados)
        });
        
        if (!responseCV.ok) {
          const errorText = await responseCV.text();
          console.error("Erro na resposta:", errorText);
          throw new Error(`Erro ao salvar caixa: ${errorText}`);
        }
        
        const caixaSalva = await responseCV.json();
        caixaSalvaId = caixaSalva.id;
        console.log("Caixa de viagem salva com sucesso:", caixaSalva);
      } catch (error) {
        console.error("Erro ao salvar caixa de viagem:", error);
        throw error;
      }
      
      // Processar lançamentos
      if (dados.lancamentos && dados.lancamentos.length > 0 && caixaSalvaId) {
        try {
          // Filtrar lançamentos válidos
          const lancamentosValidos = dados.lancamentos.filter(l => {
            const temEntrada = l.entrada && l.entrada.toString().trim() !== '';
            const temSaida = l.saida && l.saida.toString().trim() !== '';
            return temEntrada || temSaida;
          });
          
          if (lancamentosValidos.length === 0) {
            console.warn("Nenhum lançamento válido para processar");
            return;
          }
          
          // Processar e normalizar lançamentos
          const lancamentosProcessados = lancamentosValidos.map(l => ({
            id: l.id,
            data: l.data || new Date().toISOString().split('T')[0],
            numeroDocumento: l.numeroDocumento || '', // Usando o nome do schema
            historicoDoc: l.historicoDoc || '',       // Usando o nome do schema
            custo: l.custo || '',
            clienteFornecedor: l.clienteFornecedor || '',
            entrada: l.entrada ? l.entrada.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null,
            saida: l.saida ? l.saida.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null
          }));
          
          const lancamentosResponse = await fetch(`/api/lancamentoviagem`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              caixaViagemId: caixaSalvaId,
              lancamentos: lancamentosProcessados,
              clearExisting: true
            })
          });
          
          if (!lancamentosResponse.ok) {
            console.error("Erro ao salvar lançamentos:", await lancamentosResponse.text());
            toast.warn("Houve um problema ao salvar os lançamentos");
          } else {
            console.log("Lançamentos salvos com sucesso");
          }
        } catch (error) {
          console.error("Erro ao salvar lançamentos:", error);
          toast.warn("Erro ao processar lançamentos");
        }
      }
      
      toast.success("Caixa de viagem salva com sucesso!");
      setIsModalOpen(false);
      
      // Atualizar dados
      await buscarCaixasDeViagem();
      await buscarEstatisticas();
    } catch (error) {
      console.error("Erro ao salvar caixa de viagem:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Formatar valores para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Atualização da função formatDate para melhor tratamento das datas
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      // Garantir que a string de data seja tratada corretamente (problema de timezone)
      // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      const dateParts = dateString.split('T')[0].split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Mês em JS começa em 0
      const day = parseInt(dateParts[2], 10);
      
      const date = new Date(year, month, day);
      
      // Usar o format do date-fns para formatar a data no estilo brasileiro
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error, dateString);
      return dateString;
    }
  };

  // Funções para paginação e filtros
  const loadMoreItems = () => {
    setVisibleItems(prev => prev + itemsPerLoad);
  };

  // Atualizar os estados de filtro para incluir os mesmos da página caixaviagem
  const [filterVeiculo, setFilterVeiculo] = useState(0);
  const [filterFuncionario, setFilterFuncionario] = useState(0);
  const [filterNumeroCaixa, setFilterNumeroCaixa] = useState('');

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDestino('');
    setFilterEmpresa(0);
    setFilterUsuario('');
    setFilterDateRange({start: '', end: ''});
    setFilterSaldo('');
    setFilterVeiculo(0);
    setFilterFuncionario(0);
    setFilterNumeroCaixa('');
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

  // Verificar se há filtros ativos - adicionados os novos filtros
  const isFilterActive = searchTerm || filterDestino || filterEmpresa > 0 || 
                       filterUsuario || filterDateRange.start || 
                       filterDateRange.end || filterSaldo || 
                       filterVeiculo > 0 || filterFuncionario > 0 || 
                       filterNumeroCaixa ? true : false;

  // Função para exportar para Excel
  const exportToExcel = async () => {
    try {
      if (filteredCaixas.length === 0) {
        toast.error("Não há dados para exportar.");
        return;
      }
      
      // Preparar dados para exportação
      const dataToExport = filteredCaixas.map(caixa => {
        // Dados básicos da caixa
        return {
          'ID': caixa.id,
          'Destino': caixa.destino || '',
          'Data': formatDate(caixa.data),
          'Empresa': caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || '',
          'Funcionário': caixa.funcionario 
            ? `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}`.trim()
            : '',
          'Usuário': caixa.user 
            ? `${caixa.user.nome} ${caixa.user.sobrenome || ''}`.trim()
            : '',
          'Total Entradas': formatCurrency(caixa.lancamentos
            .filter(l => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
            .reduce((sum, item) => sum + parseFloat(String(item.entrada || "0")), 0)),
          'Total Saídas': formatCurrency(caixa.lancamentos
            .filter(l => l?.saida && !isNaN(parseFloat(String(l.saida))))
            .reduce((sum, item) => sum + parseFloat(String(item.saida || "0")), 0)),
          'Saldo': formatCurrency(caixa.saldo),
          'Qtd. Lançamentos': caixa.lancamentos.length,
          'Data de Criação': formatDate(caixa.createdAt || ''),
          'Visível': caixa.oculto ? 'Não' : 'Sim'
        };
      });
      
      // Criar um workbook
      const wb = XLSX.utils.book_new();
      
      // Adicionar folha principal com dados da caixa
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, 'Caixas de Viagem');
      
      // Extrair todos os lançamentos de todas as caixas
      const allLancamentos = filteredCaixas
        .flatMap(caixa => {
          return caixa.lancamentos.map(l => ({
            'ID Caixa': caixa.id,
            'Destino': caixa.destino || '',
            'Usuário': caixa.user?.nome || '',
            'Empresa': caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || '',
            'Data': formatDate(l.data),
            'Custo': l.custo || '',
            'Cliente/Fornecedor': l.clienteFornecedor || '',
            'Entrada': l.entrada ? formatCurrency(parseFloat(String(l.entrada))) : '',
            'Saída': l.saida ? formatCurrency(parseFloat(String(l.saida))) : '',
            'Documento': l.numeroDocumento || '', // Usando o nome do schema
            'Histórico': l.historicoDoc || ''     // Usando o nome do schema
          }));
        });
      
      if (allLancamentos.length > 0) {
        const wsLancamentos = XLSX.utils.json_to_sheet(allLancamentos);
        XLSX.utils.book_append_sheet(wb, wsLancamentos, 'Lançamentos');
      }
      
      // Nome do arquivo Excel
      let fileName = `todas-caixas-viagem-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, fileName);
      
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-green-100 p-2 rounded-full">
            <Download size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">Relatório exportado</p>
            <p className="text-sm text-gray-600">
              {filteredCaixas.length} caixas exportadas com sucesso.
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
    }
  };

  // Toggle para mostrar/ocultar caixas ocultas
  const toggleShowHidden = async () => {
    const newShowHidden = !showHidden;
    setShowHidden(newShowHidden);
    
    try {
      // Refazer a busca de caixas e estatísticas quando mudar a configuração
      const token = localStorage.getItem("token");
      if (token) {
        setLoading(true);
        await buscarCaixasDeViagem();
        await buscarEstatisticas();
      }
    } catch (error) {
      console.error("Erro ao atualizar dados após alteração de visibilidade:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar caixas com useMemo para incluir todos os filtros
  const filteredCaixas = useMemo(() => {
    return caixasViagem.filter(caixa => {
      // Se o showHidden estiver desligado, já filtramos na API, mas garantimos aqui também
      if (!showHidden && caixa.oculto) return false;
      
      // Busca por termo
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        (caixa.destino?.toLowerCase().includes(search) || false) ||
        (caixa.funcionario?.nome?.toLowerCase().includes(search) || false) ||
        (caixa.empresa?.nome?.toLowerCase().includes(search) || false) ||
        (caixa.empresa?.nomeEmpresa?.toLowerCase().includes(search) || false) ||
        (caixa.user?.nome?.toLowerCase().includes(search) || false) ||
        (caixa.user?.email?.toLowerCase().includes(search) || false) ||
        String(caixa.id).includes(search);

      // Filtros específicos
      if (filterDestino && filterDestino !== 'Todos' && caixa.destino !== filterDestino) return false;
      if (filterEmpresa > 0 && caixa.empresaId !== filterEmpresa) return false;
      if (filterUsuario && caixa.user?.id !== filterUsuario) return false;
      if (filterFuncionario > 0 && caixa.funcionarioId !== filterFuncionario) return false;
      if (filterVeiculo > 0 && caixa.veiculoId !== filterVeiculo) return false;
      if (filterNumeroCaixa && caixa.numeroCaixa !== Number(filterNumeroCaixa)) return false;
      
      if (filterDateRange.start || filterDateRange.end) {
        const caixaDate = new Date(caixa.data);
        
        if (filterDateRange.start) {
          const startDate = new Date(filterDateRange.start);
          if (caixaDate < startDate) return false;
        }
        
        if (filterDateRange.end) {
          const endDate = new Date(filterDateRange.end);
          endDate.setHours(23, 59, 59); // Final do dia
          if (caixaDate > endDate) return false;
        }
      }
      
      // Filtro de saldo
      if (filterSaldo === 'positivo' && caixa.saldo <= 0) return false;
      if (filterSaldo === 'negativo' && caixa.saldo >= 0) return false;
      if (filterSaldo === 'neutro' && caixa.saldo !== 0) return false;
      
      return matchesSearch;
    });
  }, [caixasViagem, searchTerm, filterDestino, filterEmpresa, filterUsuario, filterDateRange, filterSaldo, showHidden, filterFuncionario, filterVeiculo, filterNumeroCaixa]);

  // Ordenar caixas (mais recentes primeiro)
  const sortedCaixas = useMemo(() => {
    return [...filteredCaixas].sort((a, b) => {
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }, [filteredCaixas]);

  // Adicione esses estados no início da função CaixaViagemTodosPage junto com os outros estados
  const [isConfirmPdfModalOpen, setIsConfirmPdfModalOpen] = useState(false);
  const [caixaToDownload, setCaixaToDownload] = useState<CaixaViagem | null>(null);
  const [isGeneratingTermo, setIsGeneratingTermo] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // No useEffect inicial, adicione:
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('token'));
    }
  }, []);

  // Adicione um efeito para atualizar as estatísticas sempre que as caixas mudam
  useEffect(() => {
    // Calcular estatísticas sempre que as caixas mudam
    if (caixasViagem.length > 0) {
      buscarEstatisticas();
    }
  }, [caixasViagem, showHidden]); // Atualizar quando as caixas ou a visibilidade mudar

  // Função que será chamada quando o usuário clicar no botão de gerar termo
  const handleGenerateTermoRequest = (caixa: CaixaViagem) => {
    setCaixaToDownload(caixa);
    setIsConfirmPdfModalOpen(true);
  };

  // Função que será chamada quando o usuário confirmar no modal
  const handleConfirmDownload = async () => {
    if (!caixaToDownload) return;
    
    try {
      setIsGeneratingTermo(true);
      setIsConfirmPdfModalOpen(false);
      
      const response = await fetch('/api/caixaviagem/generate-termo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ caixaId: caixaToDownload.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao gerar termo: ${errorText}`);
      }

      // Obter o arquivo PDF como blob
      const blob = await response.blob();
      
      // Criar URL para o blob
      const url = window.URL.createObjectURL(blob);
      
      // Nome do funcionário para o nome do arquivo
      const funcionarioNome = caixaToDownload.funcionario 
        ? `${caixaToDownload.funcionario.nome}_${caixaToDownload.funcionario.sobrenome || ''}`.trim().replace(/\s+/g, '_')
        : 'sem_funcionario';
      
      // Destino formatado para o nome do arquivo
      const destinoArquivo = caixaToDownload.destino ? caixaToDownload.destino.replace(/\s+/g, '_') : 'sem_destino';
      
      // Número da caixa para o nome do arquivo (se disponível)
      const numeroCaixa = caixaToDownload.numeroCaixa || caixaToDownload.id;
      
      // Nome do arquivo personalizado
      const nomeArquivo = `caixa_${numeroCaixa}_${funcionarioNome}_${destinoArquivo}.pdf`;
      
      // Criar elemento <a> para iniciar o download
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      
      // Limpar o URL e o elemento
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
              O download do termo de responsabilidade foi iniciado.
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
      setIsGeneratingTermo(false);
      setCaixaToDownload(null);
    }
  };

  // Função para recalcular saldos baseada no usuário selecionado no filtro
  const recalcularSaldos = async () => {
    // Se não tiver usuário selecionado, alertar e não prosseguir
    if (!filterUsuario || filterUsuario === '') {
      toast.info("Selecione um usuário no filtro para recalcular os saldos");
      return;
    }

    try {
      setLoading(true);
      
      const usuarioSelecionado = usuarios.find(u => u.id === filterUsuario);
      
      toast.info(
        <div className="flex items-center">
          <div className="mr-3">
            <RefreshCw size={18} className="animate-spin text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Recalculando saldos</p>
            <p className="text-sm text-gray-600">
              Atualizando saldos para {usuarioSelecionado?.nome || 'usuário selecionado'}...
            </p>
          </div>
        </div>
      );
      
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Token de autenticação não encontrado");
        return;
      }
      
      const response = await fetch('/api/caixaviagem/recalcularSaldos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: filterUsuario })
      });
      
      if (response.ok) {
        // Recarregar dados após recálculo
        await buscarCaixasDeViagem();
        await buscarEstatisticas();
        
        toast.success(
          <div className="flex items-center">
            <div className="mr-3 bg-green-100 p-2 rounded-full">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium">Recálculo concluído</p>
              <p className="text-sm text-gray-600">
                Os saldos de {usuarioSelecionado?.nome || 'usuário selecionado'} foram atualizados.
              </p>
            </div>
          </div>
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Erro ao recalcular saldos");
      }
    } catch (error) {
      console.error("Erro ao recalcular saldos:", error);
      toast.error("Ocorreu um erro ao recalcular saldos");
    } finally {
      setLoading(false);
    }
  };

  // Adicione este useMemo após a definição de sortedCaixas para calcular estatísticas baseadas nos filtros
  const filteredStats = useMemo(() => {
    // Calcular estatísticas a partir das caixas filtradas
    const totalCaixas = filteredCaixas.length;
    
    let totalEntradas = 0;
    let totalSaidas = 0;
    
    filteredCaixas.forEach(caixa => {
      // Calcular entradas e saídas dos lançamentos para cada caixa filtrada
      if (Array.isArray(caixa.lancamentos)) {
        caixa.lancamentos.forEach(lancamento => {
          if (lancamento.entrada) {
            const valor = parseFloat(String(lancamento.entrada).replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(valor)) {
              totalEntradas += valor;
            }
          }
          
          if (lancamento.saida) {
            const valor = parseFloat(String(lancamento.saida).replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(valor)) {
              totalSaidas += valor;
            }
          }
        });
      }
    });
    
    // Calcular saldo geral
    const saldoGeral = totalEntradas - totalSaidas;
    
    return {
      totalCaixas,
      totalEntradas,
      totalSaidas,
      saldoGeral
    };
  }, [filteredCaixas]);

  return (
    <ProtectedRoute pageName="caixaviagem">
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        
        <main className="flex-1 container mx-auto px-6 py-12 mt-16 mb-8">
          {/* Header da página - Aumentado tamanho e espaçamento */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                  <Plane size={32} className="mr-3 text-[#344893]" />
                  Todas as Caixas de Viagem
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Visualize e gerencie todas as caixas de viagem do sistema
                </p>
              </div>

              <div className="mt-6 md:mt-0 flex items-center space-x-4">
                {userPermissions.canCreate && (
                  <button
                    onClick={handleOpenNewCaixaModal}
                    className="bg-[#344893] hover:bg-[#2b3b7a] text-white px-5 py-3 text-base rounded-lg flex items-center transition-colors"
                  >
                    <PlusCircle size={20} className="mr-2" />
                    Nova Caixa de Viagem
                  </button>
                )}
                
                {/* Botão de exportar só aparece quando há filtros aplicados */}
                {isFilterActive && filteredCaixas.length > 0 && (
                  <button
                    onClick={exportToExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 text-base rounded-lg flex items-center transition-colors"
                  >
                    <Download size={20} className="mr-2" />
                    Exportar Filtrados
                  </button>
                )}
              </div>
            </div>
            
            {/* Cartões de resumo - Agora usando estatísticas filtradas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Caixas</h2>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plane size={24} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{filteredStats.totalCaixas}</p>
              </div>
              
              {/* Saídas com seta centralizada */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Saídas</h2>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-[#E7000B]">
                    <ArrowDownCircle size={24} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(filteredStats.totalSaidas)}</p>
              </div>
              
              {/* Entradas com seta centralizada */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Entradas</h2>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-[#00A63E]">
                    <ArrowUpCircle size={24} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(filteredStats.totalEntradas)}</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Saldo Geral</h2>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign size={24} className={(filteredStats.saldoGeral) >= 0 ? "text-green-600" : "text-red-600"} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${(filteredStats.saldoGeral) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(filteredStats.saldoGeral)}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de busca e filtros - Melhorado design e espaçamento */}
          <div className="bg-white p-7 rounded-xl shadow-sm mb-8 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-12 py-3 w-full border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                  placeholder="Buscar por destino, empresa, usuário..."
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3 w-full sm:w-auto">
                <div className="relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center px-4 py-3 rounded-lg border text-base ${
                      isFilterActive
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <Filter size={18} className="mr-2" />
                    {isFilterActive ? `Filtros (${
                      // Contagem correta de todos os filtros ativos
                      [
                        searchTerm ? 1 : 0,
                        filterDestino ? 1 : 0,
                        filterEmpresa > 0 ? 1 : 0,
                        filterUsuario ? 1 : 0,
                        (filterDateRange.start || filterDateRange.end) ? 1 : 0,
                        filterSaldo ? 1 : 0,
                        filterFuncionario > 0 ? 1 : 0,
                        filterVeiculo > 0 ? 1 : 0,
                        filterNumeroCaixa ? 1 : 0
                      ].reduce((sum, val) => sum + val, 0)
                    })` : "Filtrar"}
                    {isFilterOpen ? <ChevronUp className="ml-2" size={18} /> : <ChevronDown className="ml-2" size={18} />}
                  </button>
                </div>
                
                <div className="flex space-x-3">
                  {/* Botão de Recalcular Saldos - Só aparece quando um usuário está selecionado */}
                  {filterUsuario && (
                    <button
                      onClick={recalcularSaldos}
                      disabled={loading}
                      className={`p-3 rounded-lg border flex items-center ${
                        loading 
                          ? 'bg-gray-200 text-gray-500 border-gray-200' 
                          : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                      }`}
                      title={`Recalcular saldos para ${usuarios.find(u => u.id === filterUsuario)?.nome || 'usuário selecionado'}`}
                    >
                      <RefreshCw size={22} className={loading ? "animate-spin" : ""} />
                    </button>
                  )}

                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-lg border ${
                      viewMode === 'grid' 
                        ? 'bg-[#344893] text-white border-[#344893]' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Visualização em grade"
                  >
                    <Grid size={22} />
                  </button>
                  
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-3 rounded-lg border ${
                      viewMode === 'table' 
                        ? 'bg-[#344893] text-white border-[#344893]' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Visualização em tabela"
                  >
                    <List size={22} />
                  </button>
                </div>
              </div>
            </div>

            {/* Painel de filtros expandível - Atualizado para incluir novos filtros */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-200 mt-7 pt-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Filtro por destino */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Destino
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          value={filterDestino}
                          onChange={(e) => setFilterDestino(e.target.value)}
                        >
                          <option value="">Todos os destinos</option>
                          {destinos.map((destino, index) => (
                            destino !== 'Todos' && (
                              <option key={index} value={destino}>{destino}</option>
                            )
                          ))}
                        </select>
                      </div>
                      
                      {/* Filtro por empresa */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Empresa
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          value={filterEmpresa}
                          onChange={(e) => setFilterEmpresa(Number(e.target.value))}
                        >
                          <option value={0}>Todas as empresas</option>
                          {empresas.map((empresa) => (
                            <option key={empresa.id} value={empresa.id}>
                              {empresa.nome || empresa.nomeEmpresa}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Filtro por funcionário */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Funcionário
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          value={filterFuncionario}
                          onChange={(e) => setFilterFuncionario(Number(e.target.value))}
                        >
                          <option value={0}>Todos os funcionários</option>
                          {funcionarios.map((funcionario) => (
                            <option key={funcionario.id} value={funcionario.id}>
                              {`${funcionario.nome} ${funcionario.sobrenome || ''}`.trim()}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Filtro por usuário */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Usuário
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          value={filterUsuario}
                          onChange={(e) => setFilterUsuario(e.target.value)}
                        >
                          <option value="">Todos os usuários</option>
                          {usuarios.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome} {usuario.sobrenome || ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Filtro por veículo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Veículo
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          value={filterVeiculo}
                          onChange={(e) => setFilterVeiculo(Number(e.target.value))}
                        >
                          <option value={0}>Todos os veículos</option>
                          {veiculos.map((veiculo) => (
                            <option key={veiculo.id} value={veiculo.id}>
                              {veiculo.modelo} {veiculo.placa ? `- ${veiculo.placa}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Filtro por número da caixa */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Número da Caixa
                        </label>
                        <input
                          type="number"
                          value={filterNumeroCaixa}
                          onChange={(e) => setFilterNumeroCaixa(e.target.value)}
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          placeholder="Ex: 1, 2, 3..."
                        />
                      </div>
                      
                      {/* Filtro por saldo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Saldo
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                          value={filterSaldo}
                          onChange={(e) => setFilterSaldo(e.target.value)}
                        >
                          <option value="">Todos os saldos</option>
                          <option value="positivo">Saldo Positivo</option>
                          <option value="negativo">Saldo Negativo</option>
                          <option value="neutro">Saldo Zero</option>
                        </select>
                      </div>
                      
                      {/* Filtro por período */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Período
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <input
                              type="date"
                              value={filterDateRange.start}
                              onChange={(e) => setFilterDateRange({...filterDateRange, start: e.target.value})}
                              className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                              placeholder="Data inicial"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={filterDateRange.end}
                              onChange={(e) => setFilterDateRange({...filterDateRange, end: e.target.value})}
                              className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                              placeholder="Data final"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isFilterActive && (
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={handleClearFilters}
                          className="flex items-center px-4 py-2 text-red-600 text-base hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={18} className="mr-2" />
                          Limpar filtros
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Indicadores de filtros ativos - com cores padronizadas */}
            {isFilterActive && (
              <div className="flex flex-wrap gap-2 mt-5">
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Busca: {searchTerm}
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterDestino && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Destino: {filterDestino}
                    <button 
                      onClick={() => setFilterDestino('')}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterEmpresa > 0 && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Empresa: {empresas.find(e => e.id === filterEmpresa)?.nome || 'Selecionada'}
                    <button 
                      onClick={() => setFilterEmpresa(0)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterUsuario && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Usuário: {usuarios.find(u => u.id === filterUsuario)?.nome || 'Selecionado'}
                    <button 
                      onClick={() => setFilterUsuario('')}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {(filterDateRange.start || filterDateRange.end) && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Período: 
                    {filterDateRange.start ? 
                      (() => {
                        // Extrair a data sem o fuso horário
                        const [year, month, day] = filterDateRange.start.split('-').map(Number);
                        // Criar uma data local com componentes específicos
                        return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
                      })() : ''
                    } 
                    {filterDateRange.start && filterDateRange.end ? ' a ' : ''} 
                    {filterDateRange.end ? 
                      (() => {
                        // Extrair a data sem o fuso horário
                        const [year, month, day] = filterDateRange.end.split('-').map(Number);
                        // Criar uma data local com componentes específicos
                        return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
                      })() : ''
                    }
                    <button 
                      onClick={() => setFilterDateRange({start: '', end: ''})}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}

                {filterSaldo && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Saldo: {filterSaldo === "positivo" ? "Positivo" : 
                            filterSaldo === "negativo" ? "Negativo" : 
                            filterSaldo === "neutro" ? "Neutro" : filterSaldo}
                    <button 
                      onClick={() => setFilterSaldo('')}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}

                {filterFuncionario > 0 && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Funcionário: {funcionarios.find(f => f.id === filterFuncionario)?.nome || 'Selecionado'} 
                    {funcionarios.find(f => f.id === filterFuncionario)?.sobrenome || ''}
                    <button 
                      onClick={() => setFilterFuncionario(0)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterVeiculo > 0 && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Veículo: {veiculos.find(v => v.id === filterVeiculo)?.modelo || 'Selecionado'} 
                    {veiculos.find(v => v.id === filterVeiculo)?.placa ? ` - ${veiculos.find(v => v.id === filterVeiculo)?.placa}` : ''}
                    <button 
                      onClick={() => setFilterVeiculo(0)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterNumeroCaixa && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    Nº Caixa: {filterNumeroCaixa}
                    <button 
                      onClick={() => setFilterNumeroCaixa('')}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Indicador de estatísticas filtradas */}
          {isFilterActive && (
            <div className="mb-3 flex items-center">
              <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center">
                <Filter size={14} className="mr-1" />
                Estatísticas baseadas nos filtros aplicados
              </span>
            </div>
          )}

          {/* Visualização de caixas - Melhorada com mais espaçamento */}
          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 mb-8 flex flex-col items-center justify-center">
              <Loader2 size={48} className="animate-spin text-[#344893] mb-6" />
              <p className="text-gray-600 text-lg">Carregando caixas de viagem...</p>
            </div>
          ) : caixasViagem.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-md mb-8 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-[#344893] mb-6">
                <Plane size={40} />
              </div>
              <h3 className="mt-2 text-xl font-semibold text-gray-900">
                Nenhuma caixa de viagem encontrada
              </h3>
              <p className="mt-3 text-gray-500 text-lg max-w-lg mx-auto">
                Não existem caixas de viagem cadastradas no sistema.
              </p>
              {userPermissions.canCreate && (
                <div className="mt-8">
                  <button
                    onClick={handleOpenNewCaixaModal}
                    className="bg-[#344893] hover:bg-[#2b3b7a] text-white px-6 py-3 text-base rounded-lg inline-flex items-center transition-colors"
                  >
                    <PlusCircle size={20} className="mr-2" />
                    Nova Caixa de Viagem
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Funcionário
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Destino
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entradas
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saídas
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedCaixas.slice(0, visibleItems).map((caixa) => {
                      // Calcular totais para esta caixa
                      const totalEntradas = caixa.lancamentos
                        .filter(l => l.entrada)
                        .reduce((sum, l) => sum + (parseFloat(String(l.entrada)) || 0), 0);
                        
                      const totalSaidas = caixa.lancamentos
                        .filter(l => l.saida)
                        .reduce((sum, l) => sum + (parseFloat(String(l.saida)) || 0), 0);

                      return (
                        <tr key={caixa.id} className={`hover:bg-gray-50 ${caixa.oculto ? 'bg-gray-50' : ''}`}>
                          {/* Coluna de Funcionário */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                                <User size={18} />
                              </div>
                              <div className="ml-3">
                                <div className="text-base font-medium text-gray-900">
                                  {caixa.funcionario 
                                    ? `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}` 
                                    : caixa.user?.nome || "Sem funcionário"}
                                  {caixa.numeroCaixa && <span className="ml-1 text-blue-600">#{caixa.numeroCaixa}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Coluna de Destino */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-[#344893]">
                                <MapPin size={18} />
                              </div>
                              <div className="ml-3">
                                <div className="text-base font-medium text-gray-900">
                                  {caixa.destino || `Caixa #${caixa.id}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Coluna de Data */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900">{formatDate(caixa.data)}</div>
                          </td>
                          
                          {/* Coluna de Empresa */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900">
                              {caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || `Empresa ${caixa.empresaId}`}
                            </div>
                          </td>
                          
                          {/* Coluna de Entradas */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="text-base text-green-600 font-medium">
                              {formatCurrency(totalEntradas)}
                            </div>
                          </td>
                          
                          {/* Coluna de Saídas */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="text-base text-red-600 font-medium">
                              {formatCurrency(totalSaidas)}
                            </div>
                          </td>
                          
                          {/* Coluna de Saldo */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className={`text-base font-semibold ${
                              caixa.saldo > 0 
                                ? 'text-green-600' 
                                : caixa.saldo < 0 
                                  ? 'text-red-600' 
                                  : 'text-blue-600'}`}>
                              {formatCurrency(caixa.saldo)}
                            </div>
                          </td>
                          
                          {/* Coluna de Ações */}
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex justify-center gap-3">
                              {/* Botão para gerar termo PDF */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateTermoRequest(caixa);
                                }}
                                className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
                                title="Gerar Termo"
                              >
                                <FileText size={16} />
                              </button>
                              
                              <button
                                onClick={() => handleViewDetails(caixa)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Ver detalhes"
                              >
                                <Eye size={18} />
                              </button>
                              
                              {userPermissions.canEdit && (
                                <button
                                  onClick={() => handleOpenEditModal(caixa)}
                                  className="text-amber-600 hover:text-amber-800"
                                  title="Editar caixa"
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                              
                              {userPermissions.canDelete && (
                                  <button
                                    onClick={() => handleToggleVisibility(caixa)}
                                    className="text-red-600 hover:text-red-800"
                                    title={caixa.oculto ? "Restaurar caixa" : "Excluir caixa"}
                                  >
                                    {caixa.oculto ? (
                                      <Check size={18} />
                                    ) : (
                                      <Trash2 size={18} />
                                    )}
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
              
              {/* Botão para carregar mais itens - Melhorado padding */}
              {sortedCaixas.length > visibleItems && (
                <div className="px-6 py-4">
                  <button
                    onClick={loadMoreItems}
                    className="w-full bg-[#344893] hover:bg-[#2b3b7a] text-white px-5 py-3 text-base rounded-lg transition-colors"
                  >
                    Carregar mais caixas
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCaixas.slice(0, visibleItems).map((caixa) => (
                <CaixaViagemCard
                  key={caixa.id}
                  caixa={caixa}
                  onViewDetails={() => handleViewDetails(caixa)}
                  onEdit={() => handleOpenEditModal(caixa)}
                  onToggleVisibility={() => handleToggleVisibility(caixa)}
                  onGenerateTermo={() => handleGenerateTermoRequest(caixa)} // Nova prop para gerar termo
                  canEdit={userPermissions.canEdit}
                  canDelete={userPermissions.canDelete}
                />
              ))}
              
              {/* Botão para carregar mais itens - Melhorado espaço e aparência */}
              {sortedCaixas.length > visibleItems && (
                <div className="col-span-full mt-6">
                  <button
                    onClick={loadMoreItems}
                    className="w-full bg-[#344893] hover:bg-[#2b3b7a] text-white px-5 py-3 text-base rounded-lg transition-colors"
                  >
                    Carregar mais caixas
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
        
        {/* Modais - Mantidos como estão */}
        {isModalOpen && (
          <CaixaViagemModalAdmin
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            caixa={selectedCaixa as any}
            isEdit={isEditMode}
            onSave={handleSaveCaixaViagem}
            empresas={empresas}
            funcionarios={funcionarios}
            veiculos={veiculos} // Adicionando a propriedade veiculos
            usuarios={usuarios}
            isLoading={loadingAction}
          />
        )}
        
        {isViewModalOpen && selectedCaixa && (
          <CaixaViagemDetalhesModal
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            caixa={selectedCaixa}
            empresas={empresas}
            funcionarios={funcionarios}
            veiculos={veiculos}
            onEdit={handleOpenEditModal}
            onDelete={handleToggleVisibility}
            onGenerateTermo={handleGenerateTermoRequest} // Adicione esta prop
            canEdit={userPermissions.canEdit}
            canDelete={userPermissions.canDelete}
          />
        )}

        {/* Modal de confirmação de exclusão - Melhorado design e espaçamento */}
        <AnimatePresence>
          {isConfirmDeleteModalOpen && caixaToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
             
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black bg-opacity-50"
            >
              <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-xl">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-5">
                    <Trash2 size={32} className="text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {caixaToDelete.oculto ? "Restaurar Caixa" : "Excluir Caixa"}
                  </h3>
                  <p className="text-gray-600 mt-3 text-base">
                    {caixaToDelete.oculto 
                      ? "Tem certeza que deseja restaurar esta caixa de viagem?"
                      : "Tem certeza que deseja excluir esta caixa de viagem?"}
                  </p>
                  <div className="mt-2">
                    <strong>Destino:</strong> {caixaToDelete.destino || `Caixa #${caixaToDelete.id}`}<br />
                    <strong>Data:</strong> {formatDate(caixaToDelete.data)}
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsConfirmDeleteModalOpen(false)}
                    className="flex-1 py-3 text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 text-base bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {loadingAction ? (
                      <div className="flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Processando...
                      </div>
                    ) : (
                      caixaToDelete.oculto ? "Restaurar" : "Excluir"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de confirmação para geração de PDF */}
        <AnimatePresence>
          {isConfirmPdfModalOpen && caixaToDownload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black bg-opacity-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 shadow-xl"
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-5">
                    <FileText size={32} className="text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Gerar Relatório
                  </h3>
                  <p className="text-gray-600 mt-3">
                    Você está prestes a gerar o relatório para a caixa de viagem:
                  </p>
                  
                  <div className="mt-4 bg-orange-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm text-left">
                      <div className="text-gray-600">Destino:</div>
                      <div className="font-medium">{caixaToDownload.destino || 'Não informado'}</div>
                      
                      <div className="text-gray-600">Funcionário:</div>
                      <div className="font-medium">
                        {caixaToDownload.funcionario 
                          ? `${caixaToDownload.funcionario.nome} ${caixaToDownload.funcionario.sobrenome || ''}` 
                          : 'Sem funcionário associado'
                        }
                      </div>
                                            
                      <div className="text-gray-600">Empresa:</div>
                      <div className="font-medium">
                        {caixaToDownload.empresa?.nome || caixaToDownload.empresa?.nomeEmpresa || 'Não informada'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setIsConfirmPdfModalOpen(false);
                      setCaixaToDownload(null);
                    }}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDownload}
                    className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Baixar Relatório
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicador de carregamento durante a geração do termo */}
        {isGeneratingTermo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin mx-auto text-orange-600 mb-4" />
                <p className="text-lg font-medium">Gerando documento...</p>
                <p className="text-gray-500 text-sm mt-2">Aguarde enquanto o termo de responsabilidade está sendo gerado.</p>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}