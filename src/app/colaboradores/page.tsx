'use client';

import { useAuth } from '@/contexts/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Edit, Trash2, Eye, Search, Grid, List, User, FileText, 
  Phone, MapPin, Calendar, CreditCard, Briefcase, UserCheck,
  ChevronDown, ChevronUp, ChevronRight, Package, X, Plus, Check, AlertCircle,
  Car, Info, Monitor, Filter, Mail, Clock, Clipboard, Building, Bus, Heart,
  FileSpreadsheet, CreditCard as CreditCardIcon, DollarSign, RefreshCw, ArrowLeft, ArrowRight, Save,
  Users, EyeOff, MapPinOff
} from "lucide-react";
import Header from "../components/Header";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Interfaces
interface Patrimonio {
  id: number;
  nome: string;
  tipo: string;
  localizacao: string;
  placa?: string;
  numeroSerie?: string;
  numeroNotaFiscal?: string;
  status?: string;
  valor?: string;
  fabricante: string;
  oculto: boolean;
}

interface Colaborador {
  id: number;
  nome: string;
  sobrenome: string;
  idade?: number;
  dataNascimento?: string;
  numeroCelular?: string;
  numeroEmergencia?: string;
  
  // Campos relacionados a dados pessoais
  email?: string;
  estadoCivil?: string;
  conjuge?: string;
  filiacao?: string;
  
  // Campos profissionais
  setor?: string;
  cargo?: string;
  cpf: string;
  identidade?: string;
  pis?: string;
  ctps?: string;
  cnhNumero?: string;
  cnhVencimento?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  uf?: string;
  banco?: string;
  bancoNumero?: string;
  contaNumero?: string;
  agenciaNumero?: string;
  tipoVale?: string;
  vt1Valor?: number;
  empresaAcess?: string;
  empresaRegistro?: string;
  empresaTrabalho?: string;
  tipo?: string;
  comissao?: number;
  admissao?: string;
  demissao?: string;
  oculto: boolean;
  patrimonios?: Patrimonio[];
  
  // Campo de empresa
  empresaId?: number;
  numeroEmpresa?: string;
  empresa?: {
    id: number;
    nomeEmpresa: string;
    numero: string;
  };
}

interface Empresa {
  id: number;
  nomeEmpresa: string;
  numero: string;
  cidade?: string;
}

// Funções auxiliares
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "Não informado";
  
  try {
    // Criar a data a partir da string
    const dateUTC = new Date(dateString);
    
    // Ajustar o fuso horário adicionando o offset local
    const userTimezoneOffset = dateUTC.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(dateUTC.getTime() + userTimezoneOffset);
    
    // Formatar a data no formato brasileiro
    return new Intl.DateTimeFormat('pt-BR').format(adjustedDate);
  } catch {
    return "Data inválida";
  }
};

// Função corrigida para formatar corretamente as datas para inputs
const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    // Extrai diretamente ano, mês e dia da string da data
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${year}-${month}-${day}`;
    }
    
    // Fallback para o método tradicional se o formato não for o esperado
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    return dateString.split('T')[0]; // Pega apenas a parte da data (YYYY-MM-DD)
  } catch {
    return "";
  }
};

// Função para calcular idade com base na data de nascimento
const calcularIdade = (dataNascimento: string): number => {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
};

// Função para obter cor baseada no setor
const getSetorColor = (setor: string): string => {
  const setores: Record<string, string> = {
    'Administração': 'border-blue-500 bg-blue-50',
    'Comercial': 'border-amber-500 bg-amber-50',
    'Diretoria': 'border-purple-500 bg-purple-50',
    'Financeiro': 'border-green-500 bg-green-50',
    'Logística': 'border-orange-500 bg-orange-50',
    'Marketing': 'border-red-500 bg-red-50',
    'Operacional': 'border-indigo-500 bg-indigo-50',
    'Peças': 'border-cyan-500 bg-cyan-50',
    'Pós-vendas': 'border-teal-500 bg-teal-50',
    'Produção': 'border-yellow-500 bg-yellow-50',
    'RH': 'border-pink-500 bg-pink-50',
    'Serviço Externo': 'border-emerald-500 bg-emerald-50',
    'Serviço Interno': 'border-sky-500 bg-sky-50',
    'TI': 'border-slate-500 bg-slate-50',
    'Vendedor Externo': 'border-lime-500 bg-lime-50',
    'Vendedor Interno': 'border-fuchsia-500 bg-fuchsia-50'
  };
  
  return setores[setor] || 'border-gray-500 bg-gray-50';
};

// Componente para ícone do tipo de patrimônio
const TipoIcon = ({ tipo }: { tipo: string }) => {
  switch (tipo?.toLowerCase()) {
    case 'veículo':
      return <Car size={16} className="text-blue-600" />;
    case 'celular':
      return <Phone size={16} className="text-green-600" />;
    case 'móveis':
      return <Package size={16} className="text-amber-600" />;
    case 'informática':
      return <Monitor size={16} className="text-purple-600" />;
    default:
      return <Package size={16} className="text-gray-600" />;
  }
};

// No componente Colaboradores, atualize esta função para garantir que todos os setores estejam disponíveis
const getSetoresDisponiveis = (setoresAtuais: string[]) => {
  const setoresObrigatorios = [
    "Administração", 
    "Comercial", 
    "Diretoria",
    "Financeiro", 
    "Logística", 
    "Marketing", 
    "Operacional", 
    "Peças",
    "Pós-vendas",
    "Produção",
    "RH", 
    "Serviço Externo",
    "Serviço Interno",
    "TI",
    "Vendedor Externo",
    "Vendedor Interno"
  ];
  
  // Filtrar "Todos" se existir
  const setoresFiltrados = setoresAtuais.filter(setor => setor !== "Todos");
  
  // Adicionar setores obrigatórios se não existirem
  setoresObrigatorios.forEach(setor => {
    if (!setoresFiltrados.includes(setor)) {
      setoresFiltrados.push(setor);
    }
  });
  
  // Ordenar setores alfabeticamente
  setoresFiltrados.sort();
  
  // Recolocar "Todos" no início
  return ["Todos", ...setoresFiltrados];
};

export default function Colaboradores() {
  // Estados
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [colaboradorToEdit, setColaboradorToEdit] = useState<Partial<Colaborador>>({});
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSetor, setFilterSetor] = useState("Todos");
  const [setores, setSetores] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('pessoal');
  const [detailTab, setDetailTab] = useState('pessoal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    porSetor: {} as Record<string, number>,
    patrimonios: 0
  });
  const [camposComErro, setCamposComErro] = useState<string[]>([]);
  const [visibleItems, setVisibleItems] = useState<number>(12);
  const [itemsPerLoad, setItemsPerLoad] = useState<number>(12);

  const router = useRouter();
  const createModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const viewModalRef = useRef<HTMLDivElement>(null);

  // Efeito para fechar modais ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Apenas fecha o modal de visualização ao clicar fora
      if (viewModalRef.current && !viewModalRef.current.contains(event.target as Node) && isViewModalOpen) {
        setIsViewModalOpen(false);
        setSelectedColaborador(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewModalOpen]);

  // Efeitos para carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const colaboradoresData = await fetchColaboradores();
      
        // Verificar duplicatas
        const ids: number[] = colaboradoresData.map((c: Colaborador) => c.id);
        const uniqueIds = [...new Set(ids)];
        if (ids.length !== uniqueIds.length) {
          console.warn("Atenção: Existem colaboradores duplicados nos dados!");
        }
        
        await fetchEmpresas();
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setError("Ocorreu um erro ao carregar os dados.");
      } finally {
        setLoading(false);
      }
    };
    
    carregarDados();
  }, []);

  useEffect(() => {
    console.log("Empresas atualizadas:", empresas);
  }, [empresas]);

  // Atualizar estatísticas e setores quando os colaboradores mudarem
  useEffect(() => {
    if (colaboradores.length > 0) {
      // Extrair setores únicos para filtro
      const uniqueSetores = Array.from(
        new Set(colaboradores.filter(c => c.setor).map(c => c.setor as string))
      );
      
      // Garantir que Marketing e RH estejam na lista
      setSetores(getSetoresDisponiveis(uniqueSetores));
      
      // Calcular estatísticas
      const total = colaboradores.length;
      const porSetor = colaboradores.reduce((acc, curr) => {
        const setor = curr.setor || 'Sem setor';
        acc[setor] = (acc[setor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const patrimonios = colaboradores.reduce(
        (acc, curr) => acc + (curr.patrimonios?.length || 0), 
        0
      );
      
      setStats({ total, porSetor, patrimonios });
    }
  }, [colaboradores]);

  // Handler para atualizar idade quando a data de nascimento for alterada
  const handleDataNascimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataNascimento = e.target.value;
    
    if (dataNascimento) {
      // Não é necessário converter a data, pois o input já fornece no formato correto
      const idade = calcularIdade(dataNascimento);
      setColaboradorToEdit({
        ...colaboradorToEdit,
        dataNascimento,
        idade
      });
    } else {
      setColaboradorToEdit({
        ...colaboradorToEdit,
        dataNascimento: '',
        idade: undefined
      });
    }
  };

  useEffect(() => {
    if (colaboradorToEdit.dataNascimento) {
      console.log("Data original:", colaboradorToEdit.dataNascimento);
      console.log("Data formatada:", formatDateForInput(colaboradorToEdit.dataNascimento));
    }
  }, [colaboradorToEdit.dataNascimento]);

  // Funções para API
  const fetchColaboradores = async () => {
    try {
      const response = await fetch("/api/colaboradores");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setColaboradores(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      setError("Não foi possível carregar os colaboradores. Tente novamente.");
      throw error;
    }
  };

  const fetchEmpresas = async () => {
    try {
      console.log("Buscando empresas...");
      const response = await fetch('/api/empresas/list');
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar empresas: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Empresas recebidas:", data);
      setEmpresas(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      toast.error("Erro ao carregar lista de empresas.");
      throw error;
    }
  };

  const handleCreateColaborador = async () => {
    try {
      // Definir quais campos são obrigatórios
      const camposObrigatorios = [
        { nome: 'nome', label: 'Nome', tab: 'pessoal' },
        { nome: 'cpf', label: 'CPF', tab: 'pessoal' },
        { nome: 'cargo', label: 'Cargo', tab: 'profissional' },
        { nome: 'setor', label: 'Setor', tab: 'profissional' },
        { nome: 'admissao', label: 'Data de Admissão', tab: 'profissional' }
      ];
      
      // Verificar campos obrigatórios e coletar campos faltantes
      const camposFaltantes = camposObrigatorios.filter(
        campo => !colaboradorToEdit[campo.nome as keyof Colaborador] || colaboradorToEdit[campo.nome as keyof Colaborador]?.toString().trim() === ''
      );
      
      // Se houver campos faltantes
      if (camposFaltantes.length > 0) {
        // Destacar visualmente os campos faltantes
        setCamposComErro(camposFaltantes.map(c => c.nome));
        
        // Mostrar toast com campos faltantes
        toast.error(
          <div>
            <p><strong>Preencha os seguintes campos obrigatórios:</strong></p>
            <ul className="list-disc pl-5 mt-2">
              {camposFaltantes.map((campo, index) => (
                <li key={index}>{campo.label}</li>
              ))}
            </ul>
          </div>,
          { autoClose: 5000 }
        );
        
        // Ir para a aba que contém o primeiro campo faltante
        const primeiroTab = camposFaltantes[0].tab;
        setActiveTab(primeiroTab);
        
        return;
      }

      // Limpar os erros se não há campos faltantes
      setCamposComErro([]);
      
      // Formatar datas sem criar problemas de fuso horário
      const colaboradorData = {
        ...colaboradorToEdit,
        admissao: colaboradorToEdit.admissao 
          ? colaboradorToEdit.admissao + "T00:00:00.000Z" 
          : null,
        demissao: colaboradorToEdit.demissao 
          ? colaboradorToEdit.demissao + "T00:00:00.000Z" 
          : null,
        dataNascimento: colaboradorToEdit.dataNascimento 
          ? colaboradorToEdit.dataNascimento + "T00:00:00.000Z" 
          : null,
        cnhVencimento: colaboradorToEdit.cnhVencimento
          ? colaboradorToEdit.cnhVencimento + "T00:00:00.000Z"
          : null
      };

      const response = await fetch("/api/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colaboradorData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const colaboradorCriado = await response.json();
      
      // Atualiza a lista de colaboradores
      setColaboradores([...colaboradores, colaboradorCriado]);
      
      // Após sucesso na criação, mostrar toast melhorado:
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-green-100 p-2 rounded-full">
            <Check size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">Colaborador criado com sucesso!</p>
            <p className="text-sm text-gray-600">{colaboradorCriado.nome} {colaboradorCriado.sobrenome} foi adicionado à lista.</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-green-500"
        }
      );
      
      // Fecha o modal e resetar form
      setIsModalOpen(false);
      setColaboradorToEdit({});
      
    } catch (error: any) {
      // Melhorar o toast de erro também
      toast.error(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium">Falha ao criar colaborador</p>
            <p className="text-sm text-gray-600">{error.message || "Ocorreu um erro ao processar sua solicitação."}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-red-500"
        }
      );
      
      console.error("Erro ao criar colaborador:", error);
    }
  };

  const handleViewColaborador = (colaborador: Colaborador) => {
    setSelectedColaborador(colaborador);
    setIsViewModalOpen(true);
    setDetailTab('pessoal');
  };

  const handleEditColaborador = (colaborador: Colaborador) => {
    // Fechar o modal de visualização se estiver aberto
    if (isViewModalOpen) {
      setIsViewModalOpen(false);
    }
    
    // Criar uma cópia limpa do objeto para edição
    const colaboradorParaEditar = { ...colaborador };
    
    // Formatação correta para os campos de data
    if (colaboradorParaEditar.dataNascimento) {
      colaboradorParaEditar.dataNascimento = formatDateForInput(colaboradorParaEditar.dataNascimento);
    }
    
    if (colaboradorParaEditar.admissao) {
      colaboradorParaEditar.admissao = formatDateForInput(colaboradorParaEditar.admissao);
    }
    
    if (colaboradorParaEditar.demissao) {
      colaboradorParaEditar.demissao = formatDateForInput(colaboradorParaEditar.demissao);
    }
    
    if (colaboradorParaEditar.cnhVencimento) {
      colaboradorParaEditar.cnhVencimento = formatDateForInput(colaboradorParaEditar.cnhVencimento);
    }
    
    console.log("Colaborador para editar:", colaboradorParaEditar);
    
    // Configurar o modal de edição
    setColaboradorToEdit(colaboradorParaEditar);
    setIsEditModalOpen(true);
    setActiveTab('pessoal');
  };

  // Substitua a função verificarAlteracoes por esta versão simplificada:
const verificarAlteracoes = () => {
  // Sempre permitir a edição (problema temporário)
  return true;
};

// Substitua a função handleUpdateColaborador por esta versão corrigida:

const handleUpdateColaborador = async () => {
  try {
    // Verificar campos obrigatórios
    const camposObrigatorios = [
      { nome: 'nome', label: 'Nome', tab: 'pessoal' },
      { nome: 'cpf', label: 'CPF', tab: 'pessoal' },
      { nome: 'cargo', label: 'Cargo', tab: 'profissional' },
      { nome: 'setor', label: 'Setor', tab: 'profissional' },
      { nome: 'admissao', label: 'Data de Admissão', tab: 'profissional' }
    ];
    
    const camposFaltantes = camposObrigatorios.filter(
      campo => !colaboradorToEdit[campo.nome as keyof Colaborador] || 
               colaboradorToEdit[campo.nome as keyof Colaborador]?.toString().trim() === ''
    );
    
    if (camposFaltantes.length > 0) {
      setCamposComErro(camposFaltantes.map(c => c.nome));
      toast.error("Preencha todos os campos obrigatórios antes de salvar.");
      setActiveTab(camposFaltantes[0].tab);
      return;
    }

    // Criar objeto simples sem manipulação complexa
    const dadosParaAtualizar = {
      ...colaboradorToEdit,
      id: Number(colaboradorToEdit.id)
    };

    console.log("Enviando dados para atualização:", dadosParaAtualizar);
    
    const response = await fetch("/api/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosParaAtualizar),
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const atualizado = await response.json();
    
    // Atualizar estado
    setColaboradores(colaboradores.map(c => c.id === atualizado.id ? atualizado : c));
    
    // Atualizar colaborador selecionado
    if (selectedColaborador && selectedColaborador.id === atualizado.id) {
      setSelectedColaborador(atualizado);
    }
    
    // Após sucesso na atualização, mostrar toast melhorado:
    toast.success(
      <div className="flex items-center">
        <div className="mr-3 bg-blue-100 p-2 rounded-full">
          <RefreshCw size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium">Colaborador atualizado!</p>
          <p className="text-sm text-gray-600">As informações de {colaboradorToEdit.nome} foram atualizadas com sucesso.</p>
        </div>
      </div>,
      {
        icon: false,
        closeButton: true,
        className: "border-l-4 border-blue-500"
      }
    );
    
    // Fechar modal e limpar estado
    setIsEditModalOpen(false);
    setColaboradorToEdit({});
    setCamposComErro([]);
    
  } catch (error) {
    // Melhorar o toast de erro também
    toast.error(
      <div className="flex items-center">
        <div className="mr-3 bg-red-100 p-2 rounded-full">
          <AlertCircle size={18} className="text-red-600" />
        </div>
        <div>
          <p className="font-medium">Falha ao atualizar colaborador</p>
          <p className="text-sm text-gray-600">Verifique os dados e tente novamente.</p>
        </div>
      </div>,
      {
        icon: false,
        closeButton: true,
        className: "border-l-4 border-red-500"
      }
    );
    
    console.error("Erro ao atualizar colaborador:", error);
  }
};

// Melhore o toast também na função handleToggleOcultar:

const handleToggleOcultar = async (colaborador: Colaborador) => {
  if (!confirm(`Tem certeza que deseja excluir o colaborador ${colaborador.nome}?`)) {
    return;
  }
  
  try {
    const response = await fetch("/api/colaboradores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: colaborador.id }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const colaboradorOcultado = await response.json();
    
    // Atualizar a lista removendo o colaborador (já que ele foi ocultado)
    setColaboradores(colaboradores.filter(c => c.id !== colaboradorOcultado.id));
    
    // Se o colaborador ocultado é o selecionado, remover a seleção
    if(selectedColaborador && selectedColaborador.id === colaboradorOcultado.id) {
      setSelectedColaborador(null);
      setIsViewModalOpen(false);
    }
    
    // Após sucesso na exclusão, mostrar toast melhorado:
    toast.success(
      <div className="flex items-center">
        <div className="mr-3 bg-red-100 p-2 rounded-full">
          <Trash2 size={18} className="text-red-600" />
        </div>
        <div>
          <p className="font-medium">Colaborador excluído</p>
          <p className="text-sm text-gray-600">{colaborador.nome} foi removido com sucesso.</p>
        </div>
      </div>,
      {
        icon: false,
        closeButton: true,
        className: "border-l-4 border-red-500",
        autoClose: 4000
      }
    );
    
  } catch (error) {
    // Mostrar toast de erro melhorado
    toast.error(
      <div className="flex items-center">
        <div className="mr-3 bg-red-100 p-2 rounded-full">
          <AlertCircle size={18} className="text-red-600" />
        </div>
        <div>
          <p className="font-medium">Falha ao excluir colaborador</p>
          <p className="text-sm text-gray-600">Ocorreu um erro inesperado.</p>
        </div>
      </div>,
      {
        icon: false,
        closeButton: true,
        className: "border-l-4 border-red-500"
      }
    );
    
    console.error("Erro ao excluir colaborador:", error);
  }
};

  const handleEmpresaChange = (empresaId: number) => {
    const empresaSelecionada = empresas.find(e => e.id === empresaId);
    setColaboradorToEdit({
      ...colaboradorToEdit,
      empresaId: empresaId,
      numeroEmpresa: empresaSelecionada?.numero || ""
    });
  };
  
  // Função para abrir modal de criar colaborador
  const openCreateModal = () => {
    setColaboradorToEdit({}); // Limpa o objeto para criar um novo
    setIsModalOpen(true);
    setActiveTab('pessoal');
  };

  // Adicione esta função de ordenação antes do return do seu componente:
// Substitua sua função orderColaboradores por esta versão mais robusta
const orderColaboradores = (colaboradores: Colaborador[]): Colaborador[] => {
  if (!colaboradores || colaboradores.length === 0) return [];
  
  // Log para verificar dados antes da ordenação
  console.log("Ordenando colaboradores...");
  
  // Criar uma cópia profunda dos dados para evitar alterações indesejadas
  const colabsParaOrdenar = JSON.parse(JSON.stringify(colaboradores));
  
  return colabsParaOrdenar
    .sort((a: Colaborador, b: Colaborador) => {
      // Normalizando strings para comparação
      const nomeA = (a.nome || '').toLowerCase().trim();
      const nomeB = (b.nome || '').toLowerCase().trim();
      
      // Comparação principal por nome
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
};

  // Filtra colaboradores por termo de busca e setor
  const todosColaboradoresOrdenados = orderColaboradores(colaboradores);
const filteredColaboradores = todosColaboradoresOrdenados.filter((c) => {
  const matchesSearch = `${c.nome || ''} ${c.sobrenome || ''} ${c.cargo || ''} ${c.cpf || ''} ${c.setor || ''}`
    .toLowerCase()
    .includes(searchTerm.toLowerCase());
  
  const matchesSetor = filterSetor === "Todos" || c.setor === filterSetor;
  
  return matchesSearch && matchesSetor && !c.oculto;
});

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setFilterSetor("Todos");
    toast.info("Filtros limpos");
  };

  // Adicione esta função no componente Colaboradores, antes do return
const validateStep = (currentTab: string): boolean => {
  let camposFaltantes: string[] = [];
  
  // Verificações específicas para cada aba
  if (currentTab === 'pessoal') {
    if (!colaboradorToEdit.nome?.trim()) camposFaltantes.push('nome');
    if (!colaboradorToEdit.cpf?.trim()) camposFaltantes.push('cpf');
  } 
  else if (currentTab === 'profissional') {
    if (!colaboradorToEdit.cargo?.trim()) camposFaltantes.push('cargo');
    if (!colaboradorToEdit.setor?.trim()) camposFaltantes.push('setor');
    if (!colaboradorToEdit.admissao?.trim()) camposFaltantes.push('admissao');
  }
  
  // Atualizar o estado com os campos em erro
  setCamposComErro(camposFaltantes);
  
  // Retorna true se não houver campos faltantes
  return camposFaltantes.length === 0;
};

// Função para avançar para a próxima etapa com validação
const nextStep = () => {
  const tabs = ['pessoal', 'contato', 'profissional', 'bancario'];
  const currentIndex = tabs.indexOf(activeTab);
  
  // Só validamos abas com campos obrigatórios
  if ((activeTab === 'pessoal' || activeTab === 'profissional') && !validateStep(activeTab)) {
    // Mostra mensagem de erro
    toast.error("Preencha todos os campos obrigatórios antes de prosseguir.");
    return;
  }
  
  // Se passou na validação ou não tem campos obrigatórios, avançamos
  if (currentIndex < tabs.length - 1) {
    setActiveTab(tabs[currentIndex + 1]);
  }
};

const loadMoreItems = () => {
  setVisibleItems(prev => prev + itemsPerLoad);
};

useEffect(() => {
  setVisibleItems(itemsPerLoad);
}, [searchTerm, filterSetor, itemsPerLoad]);

  return (
    <ProtectedRoute pageName="colaboradores">
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8 mt-16 mb-8">
          {/* Header da página */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Users size={28} className="mr-2 text-[#344893]" />
                  Gestão de Colaboradores
                </h1>
                <p className="text-gray-600 mt-1">
                  Cadastre e gerencie os colaboradores da empresa
                </p>
              </div>

              <div className="mt-4 md:mt-0 flex space-x-3">
                <PermissionGuard pageName="colaboradores" permission="canEdit">
                  <button
                    onClick={openCreateModal}
                    className="bg-[#344893] text-white px-4 py-2 rounded-lg hover:bg-[#2a3a74] transition-colors flex items-center"
                  >
                    <Plus size={18} className="mr-1.5" />
                    Novo Colaborador
                  </button>
                </PermissionGuard>
              </div>
            </div>
            
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total de Colaboradores</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</h3>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                    <Users size={24} />
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
                    <p className="text-sm font-medium text-gray-500">Patrimônios Atribuídos</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.patrimonios}</h3>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <Package size={24} />
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
                    <p className="text-sm font-medium text-gray-500">Setores</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{Object.keys(stats.porSetor).length}</h3>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
                    <Briefcase size={24} />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Barra de busca e filtros */}
          <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar colaboradores..."
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
                    onClick={() => setFilterOpen(!filterOpen)}
                    className={`flex items-center px-3 py-2 rounded-lg border ${
                      filterSetor !== "Todos"
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    <Filter size={16} className="mr-1.5" />
                    {filterSetor === "Todos" ? "Filtrar por Setor" : filterSetor}
                    <ChevronDown size={16} className="ml-1.5" />
                  </button>
                  
                  {filterOpen && (
                    <div className="absolute z-10 mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-56">
                      {setores.map((setor) => (
                        <button
                          key={setor}
                          onClick={() => {
                            setFilterSetor(setor);
                            setFilterOpen(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            filterSetor === setor
                              ? "bg-blue-50 text-blue-700"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {setor === "Todos" ? "Todos os setores" : setor}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg border ${
                      viewMode === "grid"
                        ? "bg-[#344893] text-white border-[#344893]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    title="Visualização em grade"
                  >
                    <Grid size={20} />
                  </button>
                  
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg border ${
                      viewMode === "table"
                        ? "bg-[#344893] text-white border-[#344893]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    title="Visualização em tabela"
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contador de resultados */}
          <div className="mb-4 text-sm text-gray-600 flex items-center">
            <Info size={16} className="mr-2 text-gray-400" />
            Exibindo {filteredColaboradores.length} colaboradores 
            {filterSetor !== "Todos" && ` do setor "${filterSetor}"`}
            {searchTerm && ` para a busca "${searchTerm}"`}
            
            {(searchTerm || filterSetor !== "Todos") && (
              <button 
                onClick={clearFilters}
                className="ml-2 text-[#344893] hover:underline flex items-center"
              >
                <X size={14} className="mr-1" />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Estados de carregamento, erro e resultados vazios */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#344893] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Carregando colaboradores...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 p-4 rounded-lg flex items-center text-red-600 mb-6 border border-red-100">
              <AlertCircle size={20} className="mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && filteredColaboradores.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100"
            >
              <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
                <Users size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum colaborador encontrado</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterSetor !== "Todos" 
                  ? "Tente ajustar seus filtros para encontrar o que está procurando." 
                  : "Comece adicionando um novo colaborador."}
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-[#2a3a74] transition-colors"
              >
                <Plus size={18} className="mr-1.5" />
                Novo Colaborador
              </button>
            </motion.div>
          )}

          {/* Visualização em grade - Cards melhorados e padronizados */}
  {!loading && !error && viewMode === "grid" && filteredColaboradores.length > 0 && (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {filteredColaboradores.slice(0, visibleItems).map((colaborador) => (
        <motion.div
          key={colaborador.id}
          whileHover={{ y: -5, boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.1)' }}
          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col h-full"
        >
          {/* Cabeçalho do Card - sem o círculo de iniciais */}
          <div className="p-5 border-b border-gray-100 bg-[#344893] text-white">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3">
                <h3 className="text-lg font-semibold line-clamp-1 mb-1">
                  {colaborador.nome} {colaborador.sobrenome}
                </h3>
                <p className="text-sm text-white opacity-90">
                  {colaborador.cargo || "Sem cargo"}
                </p>
              </div>
              
              {colaborador.setor && (
                <span className="text-xs font-medium px-2.5 py-1 bg-white text-[#344893] rounded-full shrink-0">
                  {colaborador.setor}
                </span>
              )}
            </div>
          </div>
          
          {/* Corpo do Card */}
          <div className="p-5 flex-grow">
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {colaborador.cpf || "CPF não informado"}
                </span>
              </div>
              
              {colaborador.numeroCelular && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">
                    {colaborador.numeroCelular}
                  </span>
                </div>
              )}
              
              {colaborador.email && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">
                    {colaborador.email}
                  </span>
                </div>
              )}
              
              {colaborador.empresa?.nomeEmpresa && (
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">
                    {colaborador.empresa.nomeEmpresa}
                    {colaborador.numeroEmpresa && (
                      <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                        #{colaborador.numeroEmpresa}
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Patrimônios simplificados - Card View */}
{colaborador.patrimonios && colaborador.patrimonios.length > 0 && (
  <div className="mt-3 pt-3 border-t border-gray-100">
    <div className="flex items-center text-sm">
      <Package className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
      <span className="text-gray-600">
        {colaborador.patrimonios.length} {colaborador.patrimonios.length === 1 ? 'patrimônio' : 'patrimônios'} 
        <span className="text-xs text-gray-500"> sob responsabilidade</span>
      </span>
    </div>
  </div>
)}

              
              {/* Data de Admissão */}
              {colaborador.admissao && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Desde {formatDate(colaborador.admissao)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Rodapé com ações */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex justify-end space-x-1">
            <button
              onClick={() => handleViewColaborador(colaborador)}
              className="p-2 rounded-full hover:bg-blue-50 hover:text-[#344893] transition-colors"
              title="Ver detalhes"
            >
              <Eye size={18} />
            </button>
            <PermissionGuard pageName="colaboradores" permission="canEdit">
              <button
                onClick={() => handleEditColaborador(colaborador)}
                className="p-2 rounded-full hover:bg-amber-50 hover:text-amber-600 transition-colors"
                title="Editar"
              >
                <Edit size={18} />
              </button>
            </PermissionGuard>
            <PermissionGuard pageName="colaboradores" permission="canDelete">
              <button
                onClick={() => handleToggleOcultar(colaborador)}
                className="p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </PermissionGuard>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )}

{/* Corrija esta linha para mostrar o botão de "Ver mais" quando apropriado */}
{viewMode === 'grid' && filteredColaboradores.length > visibleItems && (
  <div className="flex justify-center mt-8">
    <button
      onClick={loadMoreItems}
      className="px-6 py-3 bg-[#344893] text-white border border-gray-300 rounded-lg shadow-sm hover:bg-[#344993e1] transition-colors flex items-center"
    >
      Ver mais <ChevronDown size={16} className="ml-2" />
    </button>
  </div>
)}

          {/* Visualização em tabela - Modo Table */}
          {/* Substitua o código da tabela com melhorias na responsividade e scroll */}
{!loading && !error && viewMode === "table" && filteredColaboradores.length > 0 && (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
  >
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Colaborador
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CPF / Contato
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cargo / Setor
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Empresa
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patrimônios
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredColaboradores.slice(0, visibleItems).map((colaborador) => (
            <tr key={colaborador.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
  <div className="flex items-center">
    <div className="flex-shrink-0 w-10 h-10 bg-[#344893] text-white rounded-full flex items-center justify-center">
      <span className="font-medium text-base">
        {(() => {
          const getNomeLimpo = (texto: string | undefined): string => {
            if (!texto) return '';
            const textoSemEspacos: string = texto.trim();
            return textoSemEspacos.length > 0 ? textoSemEspacos[0].toUpperCase() : '';
          };
          
          const inicialNome = getNomeLimpo(colaborador.nome) || '?';
          const inicialSobrenome = getNomeLimpo(colaborador.sobrenome) || '';
          
          return inicialNome + inicialSobrenome;
        })()}
      </span>
    </div>
    <div className="ml-4">
      <div className="text-sm font-medium text-gray-900">
        {colaborador.nome} {colaborador.sobrenome}
      </div>
      <div className="text-sm text-gray-500">
        {formatDate(colaborador.admissao)}
      </div>
    </div>
  </div>
</td>

              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{colaborador.cpf}</div>
                <div className="text-xs text-gray-500">{colaborador.numeroCelular || "Sem contato"}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{colaborador.cargo || "Sem cargo"}</div>
                <div className="text-xs text-gray-500">{colaborador.setor || "Sem setor"}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {colaborador.empresa?.nomeEmpresa || colaborador.empresaTrabalho || "Não informada"}
                </div>
                <div className="text-xs text-gray-500">
                  {colaborador.numeroEmpresa ? `#${colaborador.numeroEmpresa}` : ""}
                </div>
              </td>
              <td className="px-4 py-4">
  {colaborador.patrimonios && colaborador.patrimonios.length > 0 ? (
    <span className="px-3 py-1.5 inline-flex items-center text-sm font-medium rounded-full bg-blue-50 text-blue-700">
      <Package size={14} className="mr-1.5" />
      {colaborador.patrimonios.length} {colaborador.patrimonios.length === 1 ? 'item' : 'itens'}
    </span>
  ) : (
    <span className="text-xs text-gray-500">Nenhum</span>
  )}
</td>

              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-1">
                  <button
                    onClick={() => handleViewColaborador(colaborador)}
                    className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded"
                    title="Ver detalhes"
                  >
                    <Eye size={18} />
                  </button>
                  <PermissionGuard pageName="colaboradores" permission="canEdit">
                    <button
                      onClick={() => handleEditColaborador(colaborador)}
                      className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                  </PermissionGuard>
                  <PermissionGuard pageName="colaboradores" permission="canDelete">
                    <button
                      onClick={() => handleToggleOcultar(colaborador)}
                      className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </PermissionGuard>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Mensagem de rolagem para móveis */}
    <div className="text-xs text-center text-gray-500 py-2 border-t border-gray-100 md:hidden">
      ← Deslize horizontalmente para ver todos os dados →
    </div>
  </motion.div>
)}

{/* Botão Ver mais para a tabela */}
{viewMode === 'table' && filteredColaboradores.length > visibleItems && (
  <div className="flex justify-center mt-6">
    <button
      onClick={loadMoreItems}
      className="px-6 py-3 bg-[#344893] text-white border border-gray-300 rounded-lg shadow-sm hover:bg-[#344993e1] transition-colors  flex items-center"
    >
      Ver mais <ChevronDown size={16} className="ml-2" />
    </button>
  </div>
)}

          {/* Modal para adicionar/editar colaborador */}
  {(isModalOpen || isEditModalOpen) && (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[90vh] relative"
        ref={isEditModalOpen ? editModalRef : createModalRef}
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            {isEditModalOpen ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
          </h3>
          <button
            onClick={() => {
              if (isEditModalOpen) {
                setIsEditModalOpen(false);
              } else {
                setIsModalOpen(false);
              }
              setColaboradorToEdit({});
              setCamposComErro([]);
              setActiveTab('pessoal');
            }}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Progresso */}
        <div className="px-6 pt-4">
          <div className="mb-6">
            <div className="h-2 mb-1 rounded bg-gray-200">
              <div 
                className="h-2 rounded bg-[#344893]"
                style={{width: `${
                  activeTab === 'pessoal' ? 25 :
                  activeTab === 'contato' ? 50 :
                  activeTab === 'profissional' ? 75 : 100
                }%`}}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Etapa {
                activeTab === 'pessoal' ? '1' :
                activeTab === 'contato' ? '2' :
                activeTab === 'profissional' ? '3' : '4'
              } de 4</span>
              <span>{
                activeTab === 'pessoal' ? '25' :
                activeTab === 'contato' ? '50' :
                activeTab === 'profissional' ? '75' : '100'
              }% concluído</span>
            </div>
          </div>

          {/* Etapas */}
          <div className="flex justify-between mb-6 text-xs">
            <div className={`flex flex-col items-center ${activeTab === 'pessoal' || activeTab === 'contato' || activeTab === 'profissional' || activeTab === 'bancario' ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeTab === 'pessoal' || activeTab === 'contato' || activeTab === 'profissional' || activeTab === 'bancario' ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span>Dados Pessoais</span>
              {camposComErro.some(c => ['nome', 'cpf'].includes(c)) && (
                <span className="mt-1 text-red-500">●</span>
              )}
            </div>
            
            <div className={`flex flex-col items-center ${activeTab === 'contato' || activeTab === 'profissional' || activeTab === 'bancario' ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeTab === 'contato' || activeTab === 'profissional' || activeTab === 'bancario' ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span>Contato e Endereço</span>
            </div>
            
            <div className={`flex flex-col items-center ${activeTab === 'profissional' || activeTab === 'bancario' ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeTab === 'profissional' || activeTab === 'bancario' ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span>Dados Profissionais</span>
              {camposComErro.some(c => ['cargo', 'setor', 'admissao'].includes(c)) && (
                <span className="mt-1 text-red-500">●</span>
              )}
            </div>
            
            <div className={`flex flex-col items-center ${activeTab === 'bancario' ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeTab === 'bancario' ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                4
              </div>
              <span>Dados Bancários</span>
            </div>
          </div>
        </div>

        {/* Conteúdo do modal */}
        <div className="px-6 py-4">
          {/* Conteúdo dos formulários existentes - manter o que já existe */}
          <div className="flex overflow-x-auto hide-scrollbar border-b border-gray-200 mb-6 pb-px">
            <button 
              onClick={() => setActiveTab('pessoal')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap relative
                ${activeTab === 'pessoal' 
                  ? 'border-b-2 border-[#344893] text-[#344893]' 
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User size={16} className="inline mr-1.5" />
              Dados Pessoais
              {camposComErro.some(c => ['nome', 'cpf'].includes(c)) && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('contato')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'contato' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Phone size={16} className="inline mr-1.5" />
              Contato e Endereço
            </button>
            <button 
              onClick={() => setActiveTab('profissional')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'profissional' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Briefcase size={16} className="inline mr-1.5" />
              Dados Profissionais
            </button>
            <button 
              onClick={() => setActiveTab('bancario')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'bancario' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CreditCard size={16} className="inline mr-1.5" />
              Dados Bancários
            </button>
          </div>

          {/* Formulários existentes, não modificados */}
          {activeTab === 'pessoal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manter os campos existentes */}
  <div>
    <label className="flex text-sm font-medium mb-1 items-center">
      <span className={camposComErro.includes('nome') ? "text-red-600" : "text-gray-700"}>
        Nome <span className="text-red-500 ml-1">*</span>
      </span>
      {camposComErro.includes('nome') && (
        <span className="ml-2 text-xs text-red-500 font-normal">Campo obrigatório</span>
      )}
    </label>
    <input
      type="text"
      value={colaboradorToEdit.nome || ""}
      onChange={(e) => {
        setColaboradorToEdit({ ...colaboradorToEdit, nome: e.target.value });
        if (e.target.value.trim() !== "" && camposComErro.includes('nome')) {
          setCamposComErro(camposComErro.filter(c => c !== 'nome'));
        }
      }}
      className={`w-full p-2 border rounded-lg focus:ring-2 
        ${camposComErro.includes('nome') 
          ? 'border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500' 
          : 'border-gray-300 focus:ring-[#344893] focus:border-transparent'}`}
      required
    />
  </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sobrenome
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.sobrenome || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, sobrenome: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formatDateForInput(colaboradorToEdit.dataNascimento)}
                  onChange={handleDataNascimentoChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idade
                </label>
                <input
                  type="number"
                  value={colaboradorToEdit.idade || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, idade: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>
              
              <div>
    <label className="flex text-sm font-medium mb-1 items-center">
      <span className={camposComErro.includes('cpf') ? "text-red-600" : "text-gray-700"}>
        CPF <span className="text-red-500 ml-1">*</span>
      </span>
      {camposComErro.includes('cpf') && (
        <span className="ml-2 text-xs text-red-500 font-normal">Campo obrigatório</span>
      )}
    </label>
    <input
      type="text"
      value={colaboradorToEdit.cpf || ""}
      onChange={(e) => {
        setColaboradorToEdit({ ...colaboradorToEdit, cpf: e.target.value });
        if (e.target.value.trim() !== "" && camposComErro.includes('cpf')) {
          setCamposComErro(camposComErro.filter(c => c !== 'cpf'));
        }
      }}
      className={`w-full p-2 border rounded-lg focus:ring-2 
        ${camposComErro.includes('cpf') 
          ? 'border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500' 
          : 'border-gray-300 focus:ring-[#344893] focus:border-transparent'}`}
      required
    />
  </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identidade
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.identidade || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, identidade: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado Civil
                </label>
                <select
                  value={colaboradorToEdit.estadoCivil || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, estadoCivil: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cônjuge
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.conjuge || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, conjuge: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filiação
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.filiacao || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, filiacao: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                  placeholder=""
                />
              </div>
            </div>
          )}

          {activeTab === 'contato' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Celular
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.numeroCelular || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, numeroCelular: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone de Emergência
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.numeroEmergencia || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, numeroEmergencia: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={colaboradorToEdit.email || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, email: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.cep || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, cep: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.endereco || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, endereco: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.bairro || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, bairro: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.cidade || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, cidade: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UF
                </label>
                <select
                  value={colaboradorToEdit.uf || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, uf: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="AC">AC</option>
                  <option value="AL">AL</option>
                  <option value="AP">AP</option>
                  <option value="AM">AM</option>
                  <option value="BA">BA</option>
                  <option value="CE">CE</option>
                  <option value="DF">DF</option>
                  <option value="ES">ES</option>
                  <option value="GO">GO</option>
                  <option value="MA">MA</option>
                  <option value="MT">MT</option>
                  <option value="MS">MS</option>
                  <option value="MG">MG</option>
                  <option value="PA">PA</option>
                  <option value="PB">PB</option>
                  <option value="PR">PR</option>
                  <option value="PE">PE</option>
                  <option value="PI">PI</option>
                  <option value="RJ">RJ</option>
                  <option value="RN">RN</option>
                  <option value="RS">RS</option>
                  <option value="RO">RO</option>
                  <option value="RR">RR</option>
                  <option value="SC">SC</option>
                  <option value="SP">SP</option>
                  <option value="SE">SE</option>
                  <option value="TO">TO</option>
                </select>
              </div>
            </div>
          )}

          {/* Conteúdo da aba Dados Profissionais */}
          {activeTab === 'profissional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.cargo || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, cargo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor <span className="text-red-500">*</span>
                </label>
                <select
                  value={colaboradorToEdit.setor || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, setor: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                  required
                >
                  <option value="">Selecione um setor...</option>
                  <option value="Administração">Administração</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Diretoria">Diretoria</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Logística">Logística</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Peças">Peças</option>
                  <option value="Pós-vendas">Pós-vendas</option>
                  <option value="Produção">Produção</option>
                  <option value="RH">RH</option>
                  <option value="Serviço Externo">Serviço Externo</option>
                  <option value="Serviço Interno">Serviço Interno</option>
                  <option value="TI">TI</option>
                  <option value="Vendedor Externo">Vendedor Externo</option>
                  <option value="Vendedor Interno">Vendedor Interno</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <select
                  value={colaboradorToEdit.empresaId || ""}
                  onChange={(e) => handleEmpresaChange(Number(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nomeEmpresa} {empresa.numero ? `(${empresa.numero})` : ''}
                      {empresa.cidade ? ` - ${empresa.cidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Empresa
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.numeroEmpresa || ""}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Admissão <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formatDateForInput(colaboradorToEdit.admissao)}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, admissao: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Demissão
                </label>
                <input
                  type="date"
                  value={formatDateForInput(colaboradorToEdit.demissao)}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, demissao: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIS
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.pis || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, pis: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CTPS
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.ctps || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, ctps: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da CNH
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.cnhNumero || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, cnhNumero: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vencimento da CNH
                </label>
                <input
                  type="date"
                  value={formatDateForInput(colaboradorToEdit.cnhVencimento)}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, cnhVencimento: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Contrato
                </label>
                <select
                  value={colaboradorToEdit.tipo || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, tipo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="CLT">CLT</option>
                  <option value="PJ">PJ</option>
                  <option value="Autônomo">Autônomo</option>
                  <option value="Estagiário">Estagiário</option>
                  <option value="Terceirizado">Terceirizado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={colaboradorToEdit.comissao || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, comissao: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Conteúdo da aba Dados Bancários */}
          {activeTab === 'bancario' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.banco || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, banco: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Banco
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.bancoNumero || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, bancoNumero: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Agência
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.agenciaNumero || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, agenciaNumero: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta
                </label>
                <input
                  type="text"
                  value={colaboradorToEdit.contaNumero || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, contaNumero: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Vale
                </label>
                <select
                  value={colaboradorToEdit.tipoVale || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, tipoVale: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Refeição">Refeição</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Combustível">Combustível</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Vale
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={colaboradorToEdit.vt1Valor || ""}
                  onChange={(e) => setColaboradorToEdit({ ...colaboradorToEdit, vt1Valor: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botões de navegação e indicação de campos obrigatórios */}
        <div className="mt-4 pt-4 px-6 pb-6 border-t border-gray-200">
          {camposComErro.length > 0 && (
            <div className="p-3 mb-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-red-600 text-sm flex items-center">
                <AlertCircle size={16} className="mr-2" />
                Por favor, preencha todos os campos obrigatórios marcados.
              </p>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Campos obrigatórios
            </p>
            
            <div className="flex space-x-3">
              {/* Botão Voltar - só aparece após a primeira etapa */}
              {activeTab !== 'pessoal' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['pessoal', 'contato', 'profissional', 'bancario'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar
                </button>
              )}
              
              {/* Botão Cancelar */}
              <button
                onClick={() => {
                  if (isEditModalOpen) {
                    setIsEditModalOpen(false);
                  } else {
                    setIsModalOpen(false);
                  }
                  setColaboradorToEdit({});
                  setCamposComErro([]);
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              {/* Botão Próximo com validação - não aparece na última etapa */}
  {activeTab !== 'bancario' && (
    <button
      type="button"
      onClick={nextStep}  // Usar a função de validação aqui
      className="px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
    >
      Próximo
      <ArrowRight size={16} className="ml-2" />
    </button>
  )}

              
              {/* Botão Finalizar - só aparece na última etapa */}
              {activeTab === 'bancario' && (
                <button
                  type="button"
                  onClick={() => {
                    // Verificar todas as etapas obrigatórias antes de salvar
                    let pessoalValid = validateStep('pessoal');
                    let profissionalValid = validateStep('profissional');
                    
                    if (!pessoalValid || !profissionalValid) {
                      // Se alguma validação falhou, mostrar erro
                      toast.error("Preencha todos os campos obrigatórios antes de salvar.");
                      
                      // Ir para a primeira aba com erro
                      if (!pessoalValid) {
                        setActiveTab('pessoal');
                      } else if (!profissionalValid) {
                        setActiveTab('profissional');
                      }
                      return;
                    }
                    
                    // Se passou por todas as validações, salvar
                    if (isEditModalOpen) {
                      handleUpdateColaborador();
                    } else {
                      handleCreateColaborador();
                    }
                  }}
                  className="px-5 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Check size={18} className="mr-2" />
                  {isEditModalOpen ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )}

          {/* Modal para visualizar detalhes do colaborador */}
          {isViewModalOpen && selectedColaborador && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]"
                ref={viewModalRef}
              >
                {/* Cabeçalho do modal */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <User size={20} className="mr-2 text-[#344893]" />
                    Detalhes do Colaborador
                  </h3>
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                {/* Conteúdo com rolagem */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Abas de navegação */}
                  <div className="flex overflow-x-auto hide-scrollbar border-b border-gray-200 mb-6 pb-px">
                    <button 
                      onClick={() => setDetailTab('pessoal')}
                      className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${detailTab === 'pessoal' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <User size={16} className="inline mr-1.5" />
                      Dados Pessoais
                    </button>
                    <button 
                      onClick={() => setDetailTab('contato')}
                      className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${detailTab === 'contato' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Phone size={16} className="inline mr-1.5" />
                      Contato e Endereço
                    </button>
                    <button 
                      onClick={() => setDetailTab('profissional')}
                      className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${detailTab === 'profissional' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Briefcase size={16} className="inline mr-1.5" />
                      Dados Profissionais
                    </button>
                    <button 
                      onClick={() => setDetailTab('bancario')}
                      className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${detailTab === 'bancario' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <CreditCard size={16} className="inline mr-1.5" />
                      Dados Bancários
                    </button>
                    <button 
                      onClick={() => setDetailTab('patrimonios')}
                      className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${detailTab === 'patrimonios' ? 'border-b-2 border-[#344893] text-[#344893]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Package size={16} className="inline mr-1.5" />
                      Patrimônios
                    </button>
                  </div>

                  {/* Conteúdo da aba Dados Pessoais */}
                  {detailTab === 'pessoal' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome
                        </label>
                        <p className="text-gray-900">{selectedColaborador.nome}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sobrenome
                        </label>
                        <p className="text-gray-900">{selectedColaborador.sobrenome}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF
                        </label>
                        <p className="text-gray-900">{selectedColaborador.cpf}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          RG/Identidade
                        </label>
                        <p className="text-gray-900">{selectedColaborador.identidade}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Nascimento
                        </label>
                        <p className="text-gray-900">{formatDate(selectedColaborador.dataNascimento)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Idade
                        </label>
                        <p className="text-gray-900">{selectedColaborador.idade}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <p className="text-gray-900">{selectedColaborador.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado Civil
                        </label>
                        <p className="text-gray-900">{selectedColaborador.estadoCivil}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cônjuge
                        </label>
                        <p className="text-gray-900">{selectedColaborador.conjuge}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Filiação
                        </label>
                        <p className="text-gray-900">{selectedColaborador.filiacao}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Conteúdo da aba Contato e Endereço */}
                  {detailTab === 'contato' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone Celular
                        </label>
                        <p className="text-gray-900">{selectedColaborador.numeroCelular}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contato de Emergência
                        </label>
                        <p className="text-gray-900">{selectedColaborador.numeroEmergencia}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Endereço
                        </label>
                        <p className="text-gray-900">{selectedColaborador.endereco}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bairro
                        </label>
                        <p className="text-gray-900">{selectedColaborador.bairro}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cidade
                        </label>
                        <p className="text-gray-900">{selectedColaborador.cidade}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UF
                        </label>
                        <p className="text-gray-900">{selectedColaborador.uf}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CEP
                        </label>
                        <p className="text-gray-900">{selectedColaborador.cep}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CNH Número
                        </label>
                        <p className="text-gray-900">{selectedColaborador.cnhNumero}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CNH Vencimento
                        </label>
                        <p className="text-gray-900">{formatDate(selectedColaborador.cnhVencimento)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Conteúdo da aba Dados Profissionais */}
                  {detailTab === 'profissional' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cargo
                        </label>
                        <p className="text-gray-900">{selectedColaborador.cargo}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Setor
                        </label>
                        <p className="text-gray-900">{selectedColaborador.setor}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Empresa
                        </label>
                        <p className="text-gray-900">{selectedColaborador.empresa?.nomeEmpresa}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número da Empresa
                        </label>
                        <p className="text-gray-900">{selectedColaborador.numeroEmpresa}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PIS/PASEP
                        </label>
                        <p className="text-gray-900">{selectedColaborador.pis}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CTPS
                        </label>
                        <p className="text-gray-900">{selectedColaborador.ctps}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Colaborador
                        </label>
                        <p className="text-gray-900">{selectedColaborador.tipo}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comissão (%)
                        </label>
                        <p className="text-gray-900">{selectedColaborador.comissao}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Admissão
                        </label>
                        <p className="text-gray-900">{formatDate(selectedColaborador.admissao)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Demissão
                        </label>
                        <p className="text-gray-900">{formatDate(selectedColaborador.demissao)}</p>
                      </div>
                      {/* Nova seção de patrimônios detalhada */}
                      <div className="md:col-span-2 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Patrimônios sob Responsabilidade
                        </label>
                        
                        {selectedColaborador.patrimonios && selectedColaborador.patrimonios.length > 0 ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nome
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Identificação
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Localização
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedColaborador.patrimonios.map((patrimonio) => (
                                  <tr key={patrimonio.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                      <div className="flex items-center">
                                        <TipoIcon tipo={patrimonio.tipo} />
                                        <span className="ml-2">{patrimonio.nome}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {patrimonio.tipo}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-medium">
                                      {(() => {
                                        // Selecionar o melhor identificador para o tipo de patrimônio
                                        if (patrimonio.tipo === 'Veículo' && patrimonio.placa) {
                                          return <span className="text-blue-600">Placa: {patrimonio.placa}</span>;
                                        } else if (patrimonio.numeroSerie) {
                                          return <span className="text-green-600">Série: {patrimonio.numeroSerie}</span>;
                                        } else if (patrimonio.numeroNotaFiscal) {
                                          return <span className="text-amber-600">NF: {patrimonio.numeroNotaFiscal}</span>;
                                        } else {
                                          return <span className="text-gray-400">ID: {patrimonio.id}</span>;
                                        }
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {patrimonio.localizacao}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Nenhum patrimônio sob responsabilidade deste colaborador.</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Conteúdo da aba Dados Bancários */}
                  {detailTab === 'bancario' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Banco
                        </label>
                        <p className="text-gray-900">{selectedColaborador.banco}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Código do Banco
                        </label>
                        <p className="text-gray-900">{selectedColaborador.bancoNumero}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Agência
                        </label>
                        <p className="text-gray-900">{selectedColaborador.agenciaNumero}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número da Conta
                        </label>
                        <p className="text-gray-900">{selectedColaborador.contaNumero}</p>
                      </div>
                    </div>
                  )}

                  {/* Conteúdo da aba Patrimônios */}
{detailTab === 'patrimonios' && (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-gray-800">
        Patrimônios sob Responsabilidade
      </h3>
      <div className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
        {selectedColaborador.patrimonios?.length || 0} item(ns)
      </div>
    </div>
    
    {selectedColaborador.patrimonios && selectedColaborador.patrimonios.length > 0 ? (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Identificação
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Localização
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fabricante
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedColaborador.patrimonios.map((patrimonio) => (
              <tr key={patrimonio.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center">
                    <TipoIcon tipo={patrimonio.tipo} />
                    <span className="ml-2 font-medium">{patrimonio.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {patrimonio.tipo}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {patrimonio.tipo === 'Veículo' && patrimonio.placa 
                    ? <span className="text-blue-600">Placa: {patrimonio.placa}</span>
                    : patrimonio.numeroSerie 
                      ? <span className="text-green-600">Série: {patrimonio.numeroSerie}</span>
                      : <span className="text-gray-400">ID: {patrimonio.id}</span>
                  }
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {patrimonio.localizacao || 'Não definida'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {patrimonio.fabricante || '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
        <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
          <Package size={32} className="text-gray-400" />
        </div>
        <h4 className="text-gray-500 text-lg mb-2">Nenhum patrimônio atribuído</h4>
        <p className="text-gray-400 text-sm">
          Este colaborador não é responsável por nenhum patrimônio no momento.
        </p>
      </div>
    )}
  </div>
)}
                </div>
                
                {/* Rodapé do modal */}
                <div className="p-6 border-t border-gray-200 flex justify-end items-center sticky bottom-0 bg-white z-10 rounded-b-xl">
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                  >
                    Fechar
                  </button>
                  <PermissionGuard pageName="colaboradores" permission="canEdit">
                    <button 
                      onClick={() => handleEditColaborador(selectedColaborador)}
                      className="bg-[#344893] text-white px-4 py-2 rounded-lg hover:bg-[#2a3a74] transition-colors ml-3"
                    >
                      Editar
                    </button>
                  </PermissionGuard>
                </div>
              </motion.div>
            </div>
          )}
        </main>
        
        {/* Configuração do ToastContainer para melhor feedback visual */}
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
          // Estilo para destacar mais os toasts
          toastStyle={{
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
      </div>
    </ProtectedRoute>
  );
}