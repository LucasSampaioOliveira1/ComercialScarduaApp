'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Lucide Icons
import {
  Search, Filter, X, PlusCircle, Download, ChevronDown, Calendar,
  Briefcase, Building, DollarSign, Plane, MapPin, ArrowDownCircle,
  ArrowUpCircle, Eye, Edit, Trash2, Loader2, Check, ListFilter, Coins, User,
  Grid, List, FileText // Adicionar este ícone
} from 'lucide-react';

// Componentes
import Header from '../components/Header';
import CardResumo from '../components/CardResumo';
import CaixaViagemCard from '../components/CaixaViagemCard';
import CaixaViagemModal from '../components/CaixaViagemModal';
import CaixaViagemDetalhesModal from '../components/CaixaViagemDetalhesModal';

// Protegido
import ProtectedRoute from '../components/ProtectedRoute';

// Interfaces
interface CaixaViagem {
  id: number;
  userId: string;
  empresaId?: number;
  funcionarioId?: number;
  veiculoId?: number;
  data: string;
  destino: string;
  observacao?: string;
  oculto: boolean;
  createdAt?: string;
  updatedAt?: string;
  saldo?: number;
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
  id?: number;
  caixaViagemId?: number;
  data: string;
  numeroDocumento?: string;
  historicoDoc?: string;
  custo?: string;
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

export default function CaixaViagemPage() {
  const router = useRouter();
  
  // Estados principais
  const [caixasViagem, setCaixasViagem] = useState<CaixaViagem[]>([]);
  const [resumo, setResumo] = useState({
    totalCaixas: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    saldoGeral: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Adicionar este estado
  const [isGeneratingTermo, setIsGeneratingTermo] = useState(false);
  
  // Estados para modais e seleção
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCaixa, setSelectedCaixa] = useState<CaixaViagem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [caixaToDelete, setCaixaToDelete] = useState<CaixaViagem | null>(null);
  
  // Estados para filtros e visualização
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDestino, setFilterDestino] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState(0);
  const [filterDateRange, setFilterDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [filterSaldo, setFilterSaldo] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Estados para dados auxiliares
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
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

  // Adicionar novos estados para filtros adicionais
  const [filterVeiculo, setFilterVeiculo] = useState(0);
  const [filterFuncionario, setFilterFuncionario] = useState(0);
  const [filterNumeroCaixa, setFilterNumeroCaixa] = useState('');

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

      const userId = statusData.user?.id;
      setUserId(userId);
      
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
      } else {
        // Para usuários normais, verificar permissões específicas
        const permissionsResponse = await fetch(`/api/usuarios/permissions?userId=${userId}&page=caixaviagem`, {
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
          canAccess: true,
          canCreate: permissionsData.permissions?.caixaviagem?.canCreate || false,
          canEdit: permissionsData.permissions?.caixaviagem?.canEdit || false,
          canDelete: permissionsData.permissions?.caixaviagem?.canDelete || false
        });
      }
      
      // Buscar dados após configurar permissões
      buscarCaixasDoUsuario(userId);
      buscarResumoFinanceiro(userId);
      fetchDadosAuxiliares();
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      toast.error("Erro ao verificar permissões");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar caixas do usuário
  const buscarCaixasDoUsuario = async (id: string) => {
    try {
      setLoading(true);
      
      console.log("Buscando caixas de viagem para o usuário:", id);
      
      const response = await fetch(`/api/caixaviagem/usuario/${id}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Erro ${response.status} ao buscar caixas de viagem`);
        setCaixasViagem([]);
        return;
      }
      
      const data = await response.json();
      console.log(`Recebidas ${data.length} caixas de viagem`);
      
      // Processar os dados para calcular saldo
      const caixasProcessadas = data.map((caixa: CaixaViagem) => {
        const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        lancamentos.forEach((lanc) => {
          if (lanc.entrada) {
            const valorEntrada = parseFloat(String(lanc.entrada).replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(valorEntrada)) {
              totalEntradas += valorEntrada;
            }
          }
          if (lanc.saida) {
            const valorSaida = parseFloat(String(lanc.saida).replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(valorSaida)) {
              totalSaidas += valorSaida;
            }
          }
        });
        
        return {
          ...caixa,
          saldo: totalEntradas - totalSaidas
        };
      });
      
      setCaixasViagem(caixasProcessadas);
      
      // Extrair lista de destinos únicos para filtros
    const destinosUnicos: string[] = Array.from(
      new Set(caixasProcessadas.map((c: CaixaViagem) => c.destino).filter(Boolean as unknown as ((value: string | undefined) => value is string)))
    ).sort() as string[];
      
      setDestinos(['Todos', ...destinosUnicos]);
      
      return caixasProcessadas;
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      setCaixasViagem([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar resumo financeiro - corrigir para garantir que os valores sejam números
  const buscarResumoFinanceiro = async (id: string) => {
    try {
      const response = await fetch(`/api/caixaviagem/resumo/${id}`);
      
      if (!response.ok) {
        console.error("Erro ao buscar resumo financeiro:", await response.text());
        return;
      }
      
      const resumoData = await response.json();
      
      // Garantir que todos os valores são números válidos antes de atualizar o estado
      const resumoFormatado = {
        totalCaixas: Number(resumoData.totalCaixas) || 0,
        totalEntradas: Number(resumoData.totalEntradas) || 0,
        totalSaidas: Number(resumoData.totalSaidas) || 0,
        saldoGeral: Number(resumoData.totalEntradas || 0) - Number(resumoData.totalSaidas || 0)
      };
      
      console.log("Resumo financeiro formatado:", resumoFormatado);
      setResumo(resumoFormatado);
    } catch (error) {
      console.error("Erro ao calcular resumo financeiro:", error);
      // Definir valores padrão em caso de erro
      setResumo({
        totalCaixas: 0,
        totalEntradas: 0,
        totalSaidas: 0,
        saldoGeral: 0
      });
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

      // Fetch veículos com melhor tratamento de erro
      try {
        console.log("Buscando veículos...");
        const veiculosResponse = await fetch('/api/patrimonio/veiculos', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (veiculosResponse.ok) {
          const veiculosData = await veiculosResponse.json();
          console.log(`Recebidos ${veiculosData.length} veículos`);
          setVeiculos(veiculosData);
        } else {
          const errorText = await veiculosResponse.text();
          console.error(`Erro ${veiculosResponse.status} ao buscar veículos: ${errorText}`);
          setVeiculos([]);
        }
      } catch (error) {
        console.error("Erro ao buscar veículos:", error);
        setVeiculos([]);
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
    // Verificação de permissão
    if (!userPermissions.canEdit) {
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

  // Função para preparar exclusão da caixa
  const handleToggleVisibility = (caixa: CaixaViagem) => {
    // Verificação de permissão
    if (!userPermissions.canDelete) {
      toast.error("Você não tem permissão para excluir esta caixa.");
      return;
    }
    
    setCaixaToDelete(caixa);
    setIsConfirmDeleteModalOpen(true);
  };

  // Função para confirmar exclusão da caixa
  const handleConfirmDelete = async () => {
    if (!caixaToDelete) return;
    
    try {
      setLoadingAction(true);
      
      console.log("Tentando ocultar caixa:", caixaToDelete.id);
      
      const response = await fetch('/api/caixaviagem/ocultar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          id: caixaToDelete.id
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao ocultar caixa: ${errorText}`);
      }
      
      // Atualizar a lista de caixas localmente
      await buscarCaixasDoUsuario(userId || '');
      await buscarResumoFinanceiro(userId || '');
      
      toast.success("Caixa de viagem excluída com sucesso!");
      
      setIsConfirmDeleteModalOpen(false);
      setCaixaToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir caixa:", error);
      toast.error(`Falha ao excluir caixa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
      
      // Obter token atualizado
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Token de autenticação não encontrado");
        router.push('/');
        return;
      }
      
      console.log("Dados para salvar:", dados);
      
      let caixaSalvaId = dados.caixaViagem.id;
      let caixaSalva = null;
      
      // Sempre salvar, independente de ser edição ou criação
      const caixaMudou = true;
      
      // Preparar dados da caixa de viagem
      const dadosCaixaViagem = {
        ...dados.caixaViagem,
        id: dados.caixaViagem.id ? Number(dados.caixaViagem.id) : undefined,
        empresaId: dados.caixaViagem.empresaId ? Number(dados.caixaViagem.empresaId) : null,
        funcionarioId: dados.caixaViagem.funcionarioId ? Number(dados.caixaViagem.funcionarioId) : null,
        veiculoId: dados.caixaViagem.veiculoId ? Number(dados.caixaViagem.veiculoId) : null,
        userId: dados.caixaViagem.id ? dados.caixaViagem.userId : userId,
        data: dados.caixaViagem.data || new Date().toISOString().split('T')[0],
        destino: dados.caixaViagem.destino || '',
        observacao: dados.caixaViagem.observacao || '',
        numeroCaixa: dados.caixaViagem.numeroCaixa || 1,
        saldoAnterior: dados.caixaViagem.saldoAnterior || 0
      };
      
      console.log("Enviando para API - dados da caixa:", dadosCaixaViagem);
      
      // CORREÇÃO: Usar o mesmo padrão que funciona no contacorrente
      const responseCV = await fetch(`/api/caixaviagem/usuario/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Não enviar cabeçalho Authorization, seguindo o padrão do contacorrente
        },
        body: JSON.stringify(dadosCaixaViagem)
      });
      
      if (!responseCV.ok) {
        const errorText = await responseCV.text();
        console.error("Erro na resposta da API:", errorText);
        throw new Error(`Erro ao salvar caixa: ${errorText}`);
      }
      
      caixaSalva = await responseCV.json();
      caixaSalvaId = caixaSalva.id;
      console.log("Caixa de viagem salva com sucesso:", caixaSalva);
      
      // Processar lançamentos (independente de mudanças na caixa)
      if (dados.lancamentos && dados.lancamentos.length > 0 && caixaSalvaId) {
        try {
          // Filtrar lançamentos válidos com entrada ou saída
          const lancamentosValidos = dados.lancamentos.filter(l => {
            const temEntrada = l.entrada && l.entrada.toString().trim() !== '';
            const temSaida = l.saida && l.saida.toString().trim() !== '';
            return temEntrada || temSaida;
          });
          
          if (lancamentosValidos.length === 0) {
            console.log("Não há lançamentos válidos para processar");
            return;
          }
          
          // Processar e normalizar lançamentos
          const lancamentosProcessados = lancamentosValidos.map(l => {
            return {
              id: l.id,
              caixaViagemId: caixaSalvaId,
              data: l.data || new Date().toISOString().split('T')[0],
              numeroDocumento: l.numeroDocumento || '', 
              historicoDoc: l.historicoDoc || '',
              custo: l.custo || '',
              clienteFornecedor: l.clienteFornecedor || '',
              entrada: l.entrada ? l.entrada.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null,
              saida: l.saida ? l.saida.toString().replace(/[^\d.,]/g, '').replace(',', '.') : null
            };
          });
          
          console.log("Enviando lançamentos para API:", {
            caixaViagemId: caixaSalvaId,
            lancamentos: lancamentosProcessados,
            clearExisting: true
          });
          
          // CORREÇÃO: Remover o cabeçalho de autorização explícito
          const lancamentosResponse = await fetch('/api/lancamentoviagem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({
              caixaViagemId: caixaSalvaId,
              lancamentos: lancamentosProcessados,
              clearExisting: true
            })
          });
          
          if (!lancamentosResponse.ok) {
            const responseText = await lancamentosResponse.text();
            console.error(`Erro ${lancamentosResponse.status} ao salvar lançamentos:`, responseText);
            toast.warn("Os lançamentos podem não ter sido salvos corretamente");
          } else {
            console.log("Lançamentos salvos com sucesso!");
          }
        } catch (error) {
          console.error("Erro ao processar lançamentos:", error);
          toast.warn("Erro ao processar lançamentos");
        }
      } else {
        console.log("Não há lançamentos para processar");
      }
      
      toast.success("Caixa de viagem salva com sucesso!");
      setIsModalOpen(false);
      
      // Forçar atualização completa dos dados após salvar
      if (userId) {
        await buscarCaixasDoUsuario(userId);
        await buscarResumoFinanceiro(userId);
      }
    } catch (error) {
      console.error("Erro ao salvar caixa de viagem:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Função para gerar termo
  const handleGenerateTermo = async (caixa: CaixaViagem) => {
    try {
      setIsGeneratingTermo(true);
      
      console.log("Gerando termo para caixa:", caixa.id);
      
      const response = await fetch('/api/caixaviagem/generate-termo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caixaId: caixa.id }),
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
      const funcionarioNome = caixa.funcionario 
        ? `${caixa.funcionario.nome}_${caixa.funcionario.sobrenome || ''}`.trim().replace(/\s+/g, '_')
        : 'sem_funcionario';
      
      // Destino formatado para o nome do arquivo
      const destinoArquivo = caixa.destino ? caixa.destino.replace(/\s+/g, '_') : 'sem_destino';
      
      // Número da caixa para o nome do arquivo
      const numeroCaixa = caixa.numeroCaixa || caixa.id;
      
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
          <div className="mr-3 bg-blue-100 p-2 rounded-full">
            <FileText size={18} className="text-blue-600" />
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
          className: "border-l-4 border-blue-500"
        }
      );
    } catch (error) {
      console.error('Erro ao gerar termo:', error);
      toast.error(`Erro ao gerar termo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGeneratingTermo(false);
    }
  };

  // Formatar valores para exibição
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
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };

  // Funções para paginação e filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDestino('');
    setFilterEmpresa(0);
    setFilterDateRange({start: '', end: ''});
    setFilterSaldo('');
    setFilterVeiculo(0);
    setFilterFuncionario(0);
    setFilterNumeroCaixa('');
    setIsFilterOpen(false);
    
    toast.info("Filtros limpos com sucesso");
  };

  // Verificar se há filtros ativos
  const isFilterActive = searchTerm || filterDestino || filterEmpresa > 0 || 
                        filterDateRange.start || filterDateRange.end || filterSaldo ||
                        filterVeiculo > 0 || filterFuncionario > 0 || filterNumeroCaixa;

  // Função para exportar para Excel
  const exportToExcel = async () => {
    try {
      if (filteredCaixas.length === 0) {
        toast.error("Não há dados para exportar.");
        return;
      }
      
      // Usar apenas os dados filtrados que estão sendo exibidos atualmente
      const dataToExport = filteredCaixas.map(caixa => {
        // Calcular totais
        const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
        const entradas = lancamentos
          .filter(l => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
          .reduce((sum, item) => sum + parseFloat(String(item.entrada || "0")), 0);
        
        const saidas = lancamentos
          .filter(l => l?.saida && !isNaN(parseFloat(String(l.saida))))
          .reduce((sum, item) => sum + parseFloat(String(item.saida || "0")), 0);
        
        const saldo = entradas - saidas;
        
        // Dados básicos da caixa
        return {
          'ID': caixa.id,
          'Destino': caixa.destino || '',
          'Data': formatDate(caixa.data),
          'Empresa': caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || '',
          'Funcionário': caixa.funcionario 
            ? `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}`.trim()
            : '',
          'Total Entradas': formatCurrency(entradas),
          'Total Saídas': formatCurrency(saidas),
          'Saldo': formatCurrency(saldo),
          'Qtd. Lançamentos': lancamentos.length,
          'Data de Criação': formatDate(caixa.createdAt || '')
        };
      });
      
      // Nome do arquivo Excel reflete que são dados filtrados
      let fileName = `caixas-viagem-filtradas-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      
      // Resumo dos filtros aplicados para incluir na planilha
      const filtrosAplicados = [];
      if (searchTerm) filtrosAplicados.push(`Busca: ${searchTerm}`);
      if (filterDestino) filtrosAplicados.push(`Destino: ${filterDestino}`);
      if (filterEmpresa > 0) filtrosAplicados.push(`Empresa: ${empresas.find(e => e.id === filterEmpresa)?.nome || 'Selecionada'}`);
      if (filterDateRange.start || filterDateRange.end) {
        const periodo = `Período: ${filterDateRange.start ? format(new Date(filterDateRange.start), 'dd/MM/yyyy', { locale: ptBR }) : ''} 
                        ${filterDateRange.start && filterDateRange.end ? ' a ' : ''} 
                        ${filterDateRange.end ? format(new Date(filterDateRange.end), 'dd/MM/yyyy', { locale: ptBR }) : ''}`;
        filtrosAplicados.push(periodo);
      }
      if (filterSaldo) {
        const tipoSaldo = filterSaldo === "positivo" ? "Positivo" : 
                         filterSaldo === "negativo" ? "Negativo" : 
                         filterSaldo === "neutro" ? "Neutro" : filterSaldo;
        filtrosAplicados.push(`Saldo: ${tipoSaldo}`);
      }
      
      // Criar um workbook
      const wb = XLSX.utils.book_new();
      
      // Adicionar informações sobre os filtros aplicados
      if (filtrosAplicados.length > 0) {
        const filtrosData = [
          ["Dados Exportados com Filtros:"],
          ["Data de Exportação:", format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
          [""],
          ...filtrosAplicados.map(filtro => [filtro]),
          [""],
          ["Total de registros:", `${filteredCaixas.length}`],
          [""]
        ];
        
        const wsFiltros = XLSX.utils.aoa_to_sheet(filtrosData);
        XLSX.utils.book_append_sheet(wb, wsFiltros, 'Filtros Aplicados');
      }
      
      // Adicionar folha principal com dados da caixa
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, 'Caixas de Viagem');
      
      // Extrair todos os lançamentos de todas as caixas FILTRADAS
      const allLancamentos = filteredCaixas
        .flatMap(caixa => {
          const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
          return lancamentos.map(l => ({
            'ID Caixa': caixa.id,
            'Destino': caixa.destino || '',
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
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, fileName);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('Erro ao gerar relatório');
    }
  };

  // Filtrar caixas
  const filteredCaixas = caixasViagem.filter(caixa => {
    // Primeiro, filtrar caixas ocultadas
    if (caixa.oculto) return false;
    
    // Calcular o saldo para aplicar o filtro
    const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
    const entradas = lancamentos
      .filter(l => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
      .reduce((sum, item) => sum + parseFloat(String(item.entrada || "0")), 0);
    
    const saidas = lancamentos
      .filter(l => l?.saida && !isNaN(parseFloat(String(l.saida))))
      .reduce((sum, item) => sum + parseFloat(String(item.saida || "0")), 0);
    
    const saldo = entradas - saidas;

    // Aplicar filtro de saldo
    if (filterSaldo === 'positivo' && saldo <= 0) return false;
    if (filterSaldo === 'negativo' && saldo >= 0) return false;
    if (filterSaldo === 'neutro' && saldo !== 0) return false;

    // Aplicar filtro de veículo
    if (filterVeiculo > 0 && caixa.veiculoId !== filterVeiculo) return false;
    
    // Aplicar filtro de funcionário
    if (filterFuncionario > 0 && caixa.funcionarioId !== filterFuncionario) return false;
    
    // Aplicar filtro por número da caixa
    if (filterNumeroCaixa && caixa.numeroCaixa !== Number(filterNumeroCaixa)) return false;

    // Busca por termo
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      (caixa.destino?.toLowerCase().includes(search) || false) ||
      (caixa.funcionario?.nome?.toLowerCase().includes(search) || false) ||
      (caixa.empresa?.nome?.toLowerCase().includes(search) || false) ||
      (caixa.empresa?.nomeEmpresa?.toLowerCase().includes(search) || false) ||
      String(caixa.id).includes(search);

    // Filtros específicos
    if (filterDestino && filterDestino !== 'Todos' && caixa.destino !== filterDestino) return false;
    if (filterEmpresa > 0 && caixa.empresaId !== filterEmpresa) return false;
    
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
    
    return matchesSearch;
  });

  // Ordenar caixas (mais recentes primeiro)
  const sortedCaixas = [...filteredCaixas].sort((a, b) => {
    return new Date(b.data).getTime() - new Date(a.data).getTime();
  });

  return (
  <ProtectedRoute pageName="caixaviagem">
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      <main className="flex-1 container mx-auto px-6 py-12 mt-16 mb-8">
        {/* Header da página - Aumentado espaçamento e tamanho */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Plane size={32} className="mr-3 text-[#344893]" />
                Minhas Caixas de Viagem
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Gerencie suas caixas de viagens e controle de despesas
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
              
              {/* Botão de exportar só aparece quando há filtros aplicados ou busca */}
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
          
          {/* Cartões de resumo - Trocados de posição e com ícones ajustados */}
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
            
            {/* Card de Saídas - Agora em segundo lugar com seta para baixo */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Saídas</h2>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <ArrowDownCircle size={24} className="text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(resumo.totalSaidas)}</p>
            </div>
            
            {/* Card de Entradas - Agora em terceiro lugar com seta para cima */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Entradas</h2>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowUpCircle size={24} className="text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(resumo.totalEntradas)}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Saldo Geral</h2>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign size={24} className={resumo.saldoGeral >= 0 ? "text-green-600" : "text-red-600"} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${resumo.saldoGeral >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(resumo.saldoGeral)}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de busca e filtros - Aumentado espaço e tamanho */}
        <div className="bg-white p-7 rounded-xl shadow-sm mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
              <input
                type="text"
                placeholder="Buscar caixas de viagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
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
                    // Contar corretamente os filtros ativos
                    [
                      searchTerm ? 1 : 0,
                      filterDestino ? 1 : 0,
                      filterEmpresa > 0 ? 1 : 0,
                      (filterDateRange.start || filterDateRange.end) ? 1 : 0,
                      filterSaldo ? 1 : 0,
                      filterVeiculo > 0 ? 1 : 0,
                      filterFuncionario > 0 ? 1 : 0,
                      filterNumeroCaixa ? 1 : 0
                    ].reduce((sum, val) => sum + val, 0)
                  })` : "Filtrar"}
                  <ChevronDown size={18} className="ml-2" />
                </button>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-lg border ${
                    viewMode === "grid"
                      ? 'bg-[#344893] text-white border-[#344893]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Visualização em grade"
                >
                  <Grid size={22} />
                </button>
                
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-3 rounded-lg border ${
                    viewMode === "table"
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

          {/* Painel de filtros expansível - Aumentado espaço e tamanho */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
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
                    
                    {/* Novo filtro por funcionário */}
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
                    
                    {/* Novo filtro por veículo */}
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
                    
                    {/* Novo filtro por número da caixa */}
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
          
          {/* Indicadores de filtros ativos */}
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
              
              {(filterDateRange.start || filterDateRange.end) && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                  Período: {filterDateRange.start ? format(new Date(filterDateRange.start), 'dd/MM/yyyy', { locale: ptBR }) : ''} 
                  {filterDateRange.start && filterDateRange.end ? ' a ' : ''} 
                  {filterDateRange.end ? format(new Date(filterDateRange.end), 'dd/MM/yyyy', { locale: ptBR }) : ''}
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
            </div>
          )}
        </div>

        {/* Estado de carregamento - Aumentado tamanho e espaço */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-12 mb-8 flex flex-col items-center justify-center">
            <Loader2 size={48} className="animate-spin text-[#344893] mb-6" />
            <p className="text-gray-600 text-lg">Carregando caixas de viagem...</p>
          </div>
        ) : sortedCaixas.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-md mb-8 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-[#344893] mb-6">
              <Plane size={40} />
            </div>
            <h3 className="mt-2 text-xl font-semibold text-gray-900">
              Nenhuma caixa de viagem encontrada
            </h3>
            <p className="mt-3 text-gray-500 text-lg max-w-lg mx-auto">
              {searchTerm || isFilterActive
                ? "Nenhuma caixa corresponde aos filtros aplicados."
                : "Você ainda não possui nenhuma caixa de viagem registrada."}
            </p>
            {userPermissions.canCreate && (
              <div className="mt-8">
                <button
                  onClick={handleOpenNewCaixaModal}
                  className="bg-[#344893] hover:bg-[#2b3b7a] text-white px-6 py-3 text-base rounded-lg inline-flex items-center transition-colors"
                >
                  <PlusCircle size={20} className="mr-2" />
                  Criar Caixa de Viagem
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
                  {sortedCaixas.map((caixa) => {
                    // Calcular totais
                    const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
                    const entradas = lancamentos
                      .filter(l => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
                      .reduce((sum, item) => sum + parseFloat(String(item.entrada || "0")), 0);
                    
                    const saidas = lancamentos
                      .filter(l => l?.saida && !isNaN(parseFloat(String(l.saida))))
                      .reduce((sum, item) => sum + parseFloat(String(item.saida || "0")), 0);
                    
                    const saldo = entradas - saidas;
                    
                    return (
                      <tr key={caixa.id} className="hover:bg-gray-50">
                        {/* Coluna de Funcionário - Movida para primeira posição */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User size={20} className="text-blue-600 mr-2 flex-shrink-0" />
                            <div>
                              <div className="text-base font-medium text-gray-900 flex items-center">
                                {caixa.funcionario ? `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}`.trim() : '-'}
                                {caixa.numeroCaixa && (
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
                                    #{caixa.numeroCaixa}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Coluna de Destino - Movida para segunda posição */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin size={20} className="text-gray-500 mr-2 flex-shrink-0" />
                            <div className="text-base text-gray-900 truncate max-w-[200px]">
                              {caixa.destino || 'Sem destino'}
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
                            {caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || '-'}
                          </div>
                        </td>
                        
                        {/* Coluna de Entradas */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="text-base text-green-600 font-medium">
                            {formatCurrency(entradas)}
                          </div>
                        </td>
                        
                        {/* Coluna de Saídas */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="text-base text-red-600 font-medium">
                            {formatCurrency(saidas)}
                          </div>
                        </td>
                        
                        {/* Coluna de Saldo */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className={`text-base font-semibold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(saldo)}
                          </div>
                        </td>
                        
                        {/* Coluna de Ações */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => handleViewDetails(caixa)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-full transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            
                            {userPermissions.canEdit && (
                              <button
                                onClick={() => handleOpenEditModal(caixa)}
                                className="text-amber-600 hover:text-amber-800 p-1.5 hover:bg-amber-50 rounded-full transition-colors"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            
                            {userPermissions.canDelete && (
                              <button
                                onClick={() => handleToggleVisibility(caixa)}
                                className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={18} />
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
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCaixas.map((caixa) => (
              <CaixaViagemCard
                key={caixa.id}
                caixa={caixa}
                empresas={empresas}
                funcionarios={funcionarios}
                veiculos={veiculos}
                onViewDetails={() => handleViewDetails(caixa)}
                onEdit={() => handleOpenEditModal(caixa)}
                onToggleVisibility={() => handleToggleVisibility(caixa)}
                onGenerateTermo={() => handleGenerateTermo(caixa)} // Passar a função para o card
                canEdit={userPermissions.canEdit}
                canDelete={userPermissions.canDelete}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* Modais - mantidos como estão */}
      {isModalOpen && (
        <CaixaViagemModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          caixa={selectedCaixa as any}
          isEdit={isEditMode}
          onSave={handleSaveCaixaViagem}
          empresas={empresas}
          funcionarios={funcionarios}
          veiculos={veiculos} // Passando a lista de veículos obtida da API
          isLoading={loadingAction} // Adicionando a propriedade isLoading necessária
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
          onEdit={userPermissions.canEdit ? handleOpenEditModal : undefined}
          onDelete={userPermissions.canDelete ? handleToggleVisibility : undefined}
          onGenerateTermo={handleGenerateTermo} // Passar a função para o modal
          canEdit={userPermissions.canEdit}
          canDelete={userPermissions.canDelete}
        />
      )}

      {/* Modal de confirmação de exclusão - Aumentado espaço e tamanho */}
      <AnimatePresence>
        {isConfirmDeleteModalOpen && caixaToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black bg-opacity-50"
          >
            <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 shadow-xl">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-5">
                  <Trash2 size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Confirmar exclusão
                </h3>
                <p className="text-gray-600 mt-3 text-base">
                  Você está prestes a excluir a caixa de viagem
                  <br />
                  <strong>{caixaToDelete.destino || `#${caixaToDelete.id}`}</strong>.
                  <br />
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setIsConfirmDeleteModalOpen(false)}
                  className="flex-1 py-3 text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={loadingAction}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 text-base bg-red-600 text-white rounded-lg hover:bg-red-700"
                  disabled={loadingAction}
                >
                  {loadingAction ? (
                    <div className="flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin mr-2" />
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

      {/* Indicador visual durante a geração do termo */}
      {isGeneratingTermo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <FileText size={20} className="mr-2 text-blue-600" />
              Gerando Termo...
            </h3>
            <p className="text-gray-600 mt-2">
              Aguarde enquanto o termo de responsabilidade está sendo gerado.
            </p>
            <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" />
    </div>
  </ProtectedRoute>
);
}
