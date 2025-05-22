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
  Grid, List
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
  data: string;
  destino: string;
  observacao?: string;
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

  // Função para buscar estatísticas gerais
  const buscarEstatisticas = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado");
      
      const response = await fetch('/api/caixaviagem/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error("Erro ao buscar estatísticas:", await response.text());
        return;
      }
      
      const stats = await response.json();
      setResumo(stats);
      
      console.log("Estatísticas atualizadas:", stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
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
        data: dados.caixaViagem.data || new Date().toISOString().split('T')[0]
      };
      
      try {
        // Usar a API admin para criar/editar a caixa
        const responseCV = await fetch(`/api/caixaviagem/todos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
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
            numeroDocumento: l.numeroDocumento || '',
            historicoDoc: l.historicoDoc || '',
            custo: l.custo || '',
            clienteFornecedor: l.clienteFornecedor || '',
            entrada: l.entrada ? l.entrada.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null,
            saida: l.saida ? l.saida.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null
          }));
          
          const lancamentosResponse = await fetch(`/api/lancamentoviagem`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };

  // Funções para paginação e filtros
  const loadMoreItems = () => {
    setVisibleItems(prev => prev + itemsPerLoad);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDestino('');
    setFilterEmpresa(0);
    setFilterUsuario('');
    setFilterDateRange({start: '', end: ''});
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

  // Verificar se há filtros ativos
  const isFilterActive = searchTerm || filterDestino || filterEmpresa > 0 || 
                        filterUsuario || filterDateRange.start || 
                        filterDateRange.end || filterSaldo;

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
            'Documento': l.numeroDocumento || '',
            'Histórico': l.historicoDoc || ''
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
    setShowHidden(!showHidden);
    // Refazer a busca de caixas quando mudar a configuração
    await buscarCaixasDeViagem();
  };

  // Filtrar caixas com useMemo para melhorar performance
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
  }, [caixasViagem, searchTerm, filterDestino, filterEmpresa, filterUsuario, filterDateRange, filterSaldo, showHidden]);

  // Ordenar caixas (mais recentes primeiro)
  const sortedCaixas = useMemo(() => {
    return [...filteredCaixas].sort((a, b) => {
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
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
                
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 text-base rounded-lg flex items-center transition-colors"
                  disabled={filteredCaixas.length === 0}
                >
                  <Download size={20} className="mr-2" />
                  Exportar
                </button>
                
                {/* Botão de ver excluídos foi removido como solicitado */}
              </div>
            </div>
            
            {/* Cartões de resumo - Melhorados com design consistente */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Caixas</h2>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plane size={24} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{resumo.totalCaixas}</p>
              </div>
              
              {/* Saídas com seta para baixo */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Saídas</h2>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <ArrowDownCircle size={24} className="text-red-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(resumo.totalSaidas || 0)}</p>
              </div>
              
              {/* Entradas com seta para cima */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Entradas</h2>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowUpCircle size={24} className="text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(resumo.totalEntradas || 0)}</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Saldo Geral</h2>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign size={24} className={(resumo.saldoGeral || 0) >= 0 ? "text-green-600" : "text-red-600"} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${(resumo.saldoGeral || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(resumo.saldoGeral || 0)}
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
                    {isFilterActive ? `Filtros (${Object.values({
                      searchTerm,
                      filterDestino,
                      filterEmpresa,
                      filterUsuario,
                      filterDateRange,
                      filterSaldo
                    }).filter(value => {
                      if (typeof value === 'string' || typeof value === 'number') return !!value;
                      if (value && typeof value === 'object') {
                        if ('start' in value && 'end' in value) {
                          const dateRange = value as {start: string, end: string};
                          return dateRange.start || dateRange.end;
                        }
                      }
                      return false;
                    }).length})` : "Filtrar"}
                    {isFilterOpen ? <ChevronUp className="ml-2" size={18} /> : <ChevronDown className="ml-2" size={18} />}
                  </button>
                </div>
                
                <div className="flex space-x-3">
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

            {/* Painel de filtros expandível - Melhorado espaçamento */}
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
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Destino</label>
                        <select
                          value={filterDestino}
                          onChange={(e) => setFilterDestino(e.target.value)}
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                        >
                          <option value="">Todos os destinos</option>
                          {destinos.map((destino, index) => (
                            <option key={index} value={destino}>
                              {destino}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Empresa</label>
                        <select
                          value={filterEmpresa}
                          onChange={(e) => setFilterEmpresa(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                        >
                          <option value={0}>Todas as empresas</option>
                          {empresas.map((empresa) => (
                            <option key={empresa.id} value={empresa.id}>
                              {empresa.nome || empresa.nomeEmpresa}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Usuário</label>
                        <select
                          value={filterUsuario}
                          onChange={(e) => setFilterUsuario(e.target.value)}
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                        >
                          <option value="">Todos os usuários</option>
                          {usuarios.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome} {usuario.sobrenome || ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Período</label>
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
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Saldo</label>
                        <select
                          value={filterSaldo}
                          onChange={(e) => setFilterSaldo(e.target.value)}
                          className="w-full border border-gray-300 rounded-md py-3 px-4 text-base"
                        >
                          <option value="">Todos os saldos</option>
                          <option value="positivo">Saldo positivo</option>
                          <option value="negativo">Saldo negativo</option>
                          <option value="neutro">Saldo neutro (zero)</option>
                        </select>
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
            
            {/* Indicadores de filtros ativos */}
            {isFilterActive && (
              <div className="flex flex-wrap gap-2 mt-5">
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Busca: {searchTerm}
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterDestino && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Empresa: {empresas.find(e => e.id === filterEmpresa)?.nome || 'Selecionada'}
                    <button 
                      onClick={() => setFilterEmpresa(0)}
                      className="ml-2 text-green-500 hover:text-green-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {filterUsuario && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    Usuário: {usuarios.find(u => u.id === filterUsuario)?.nome || 'Selecionado'}
                    <button 
                      onClick={() => setFilterUsuario('')}
                      className="ml-2 text-indigo-500 hover:text-indigo-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
                
                {(filterDateRange.start || filterDateRange.end) && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    Período: {filterDateRange.start ? format(new Date(filterDateRange.start), 'dd/MM/yyyy', { locale: ptBR }) : ''} 
                    {filterDateRange.start && filterDateRange.end ? ' a ' : ''} 
                    {filterDateRange.end ? format(new Date(filterDateRange.end), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                    <button 
                      onClick={() => setFilterDateRange({start: '', end: ''})}
                      className="ml-2 text-purple-500 hover:text-purple-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}

                {filterSaldo && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    Saldo: {filterSaldo === "positivo" ? "Positivo" : 
                           filterSaldo === "negativo" ? "Negativo" : 
                           filterSaldo === "neutro" ? "Neutro" : filterSaldo}
                    <button 
                      onClick={() => setFilterSaldo('')}
                      className="ml-2 text-amber-500 hover:text-amber-700"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

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
                        Destino
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
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
                        Status
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                                <User size={18} />
                              </div>
                              <div className="ml-3">
                                <div className="text-base font-medium text-gray-900">
                                  {caixa.user?.nome || "Desconhecido"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {caixa.user?.email || ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900">{formatDate(caixa.data)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900">
                              {caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || `Empresa ${caixa.empresaId}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="text-base text-green-600 font-medium">
                              {formatCurrency(totalEntradas)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="text-base text-red-600 font-medium">
                              {formatCurrency(totalSaidas)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className={`text-base font-semibold ${caixa.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(caixa.saldo)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                              caixa.oculto ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {caixa.oculto ? 'Oculto' : 'Visível'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={() => handleViewDetails(caixa)}
                                className="text-blue-600 hover:text-blue-800 p-1.5"
                                title="Ver detalhes"
                              >
                                <Eye size={22} />
                              </button>
                              
                              {userPermissions.canEdit && (
                                <button
                                  onClick={() => handleOpenEditModal(caixa)}
                                  className="text-amber-600 hover:text-amber-800 p-1.5"
                                  title="Editar caixa"
                                >
                                  <Edit size={22} />
                                </button>
                              )}
                              
                              {userPermissions.canDelete && (
                                <button
                                  onClick={() => handleToggleVisibility(caixa)}
                                  className="text-red-600 hover:text-red-800 p-1.5"
                                  title={caixa.oculto ? "Restaurar caixa" : "Excluir caixa"}
                                >
                                  {caixa.oculto ? (
                                    <Check size={22} />
                                  ) : (
                                    <Trash2 size={22} />
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
            onEdit={handleOpenEditModal}
            onDelete={handleToggleVisibility}
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

        <ToastContainer position="bottom-right" />
      </div>
    </ProtectedRoute>
  );
}