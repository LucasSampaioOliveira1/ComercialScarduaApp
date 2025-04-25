'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Edit, Trash2, History, FileText, Eye, Search, Grid, List, Filter,
  Package, ChevronDown, ChevronUp, Download, AlertCircle, ArrowUpRight,
  FileSpreadsheet, X, PlusCircle, CheckCircle, Filter as FilterIcon,
  CalendarClock, DollarSign, Info, Calendar, MapPin, User, Check, Phone, Car, 
  Monitor, Wrench, ArrowLeft, ArrowRight, AlertTriangle, Loader2, RefreshCw // Substituímos Tool por Wrench
} from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
// Removed duplicate import of 'toast'
import PermissionGuard from '../components/PermissionGuard';
import ProtectedRoute from '../components/ProtectedRoute';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Colaborador {
  id: number;
  nome: string;
  sobrenome: string;
  cargo?: string;
  setor?: string;
}

interface Patrimonio {
  id: number;
  nome: string;
  fabricante: string;
  modelo?: string;
  responsavelId: number;
  valor: string;
  localizacao: string;
  tipo: string;
  descricao: string;
  oculto: boolean;
  data_aquisicao?: string;
  status?: string;
  numeroNotaFiscal?: string;
  dataNotaFiscal?: string;
  dataGarantia?: string;
  placa?: string;
  renavan?: string;
  locado?: boolean;
  proprietario?: string;
  numeroSerie?: string;
  anoModelo?: number;
  segurado?: boolean;
  seguradora?: string;
  dataVencimentoSeguro?: string;
  kmEntrega?: string;
  franquia?: string;
}

interface Movimentacao {
  id: number;
  patrimonioId: number;
  patrimonioNome: string;
  responsavelAtual: {
    id: number;
    nome: string;
    sobrenome: string;
  } | null;
  localizacaoAtual: string;
  kmAtual?: string;
  historico: Array<{
    id: number;
    data: string;
    tipo?: string;
    acao?: string;
    autor?: {
      id: number;
      nome: string;
      sobrenome: string;
    };
    responsavelAnterior?: {
      id: number;
      nome: string;
      sobrenome: string;
    } | null;
    localizacaoAnterior?: string;
    localizacaoNova?: string;
    responsavelNovo?: {
      id: number;
      nome: string;
      sobrenome: string;
    } | null;
    kmAnterior?: string;
    kmNovo?: string;
  }>;
}

interface DecodedToken {
  id: number;
  email: string;
}

// Definindo o componente TipoIcon fora da função principal
const TipoIcon = ({ tipo }: { tipo: string }) => {
  switch (tipo) {
    case 'Veículo':
      return <Car size={24} className="text-blue-600" />;
    case 'Celular':
      return <Phone size={24} className="text-green-600" />;
    case 'Móveis':
      return <Package size={24} className="text-amber-600" />;
    case 'Informática':
      return <Monitor size={24} className="text-purple-600" />;
    case 'Peça':
      return <Wrench size={24} className="text-red-600" />; // Substituiu Tool por Wrench
    default:
      return <Package size={24} className="text-gray-600" />;
  }
};

export default function ControlePatrimonio() {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [token, setToken] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMovimentacoesModalOpen, setIsMovimentacoesModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [patrimonioToToggle, setPatrimonioToToggle] = useState<Patrimonio | null>(null);
  const [patrimonioToEdit, setPatrimonioToEdit] = useState<Patrimonio>({
    id: 0,
    nome: '',
    fabricante: '',
    modelo: '',
    responsavelId: 0,
    valor: '',
    localizacao: '',
    tipo: '',
    descricao: '',
    oculto: false,
    data_aquisicao: '',
    status: '',
    numeroNotaFiscal: '',
    dataNotaFiscal: '',
    dataGarantia: '',
    placa: '',
    renavan: '',
    locado: false,
    proprietario: '',
    numeroSerie: '',
    anoModelo: 0,
    segurado: false,
    seguradora: '',
    dataVencimentoSeguro: '',
    kmEntrega: '',
    franquia: '',
  });
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<number>(0);
  const [filterInsured, setFilterInsured] = useState<string>('');
  const [filterRented, setFilterRented] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({ min: '', max: '' });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{show: boolean, type: string, message: string}>({
    show: false,
    type: '',
    message: ''
  });
  const [selectedPatrimonio, setSelectedPatrimonio] = useState<Patrimonio | null>(null);
  const [patrimonioStats, setPatrimonioStats] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    leased: 0,
    insured: 0
  });

  const [activeTab, setActiveTab] = useState('basic');

  // Primeiro, vamos adicionar os estados necessários
  const [responsavelSearchTerm, setResponsavelSearchTerm] = useState("");
  const [showResponsavelDropdown, setShowResponsavelDropdown] = useState(false);

  // Adicione esses estados no componente ControlePatrimonio
  const [activeStep, setActiveStep] = useState<number>(1);
  const [camposComErro, setCamposComErro] = useState<string[]>([]);
  const totalSteps = 4;

  // Estados para controlar a validação do número de série/chassi
  const [isSerialDuplicate, setIsSerialDuplicate] = useState<boolean>(false);
  const [showSerialWarning, setShowSerialWarning] = useState<boolean>(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState<boolean>(false);
  const [serialCheckLoading, setSerialCheckLoading] = useState<boolean>(false);

  // Adicione estes estados no início do componente ControlePatrimonio
  const [visibleItems, setVisibleItems] = useState<number>(12); // Número inicial de itens visíveis
  const [itemsPerLoad, setItemsPerLoad] = useState<number>(12); // Quantidade de itens para carregar ao clicar em "Ver mais"

  // Implemente esta função para carregar mais itens quando o botão for clicado
  const loadMoreItems = () => {
    setVisibleItems(prev => prev + itemsPerLoad);
  };

  // Função para validar campos obrigatórios
  const validateStep = (step: number): boolean => {
    let camposFaltantes: string[] = [];
    
    if (step === 1) {
      if (!patrimonioToEdit.nome?.trim()) camposFaltantes.push('nome');
      if (!patrimonioToEdit.tipo) camposFaltantes.push('tipo');
      if (!patrimonioToEdit.descricao?.trim()) camposFaltantes.push('descricao');
      if (!patrimonioToEdit.data_aquisicao) camposFaltantes.push('data_aquisicao');
      if (!patrimonioToEdit.valor) camposFaltantes.push('valor');
      if (!patrimonioToEdit.status) camposFaltantes.push('status');
      if (!patrimonioToEdit.fabricante?.trim()) camposFaltantes.push('fabricante');
    } 
    else if (step === 2) {
      if (!patrimonioToEdit.localizacao?.trim()) camposFaltantes.push('localizacao');
      if (!patrimonioToEdit.responsavelId) camposFaltantes.push('responsavelId');
    }
    
    setCamposComErro(camposFaltantes);
    return camposFaltantes.length === 0;
  };

  // Função para avançar etapa com validação
  const nextStep = () => {
    if (validateStep(activeStep)) {
      if (activeStep < totalSteps) {
        setActiveStep(activeStep + 1);
      }
    } else {
      showNotification('error', 'Preencha todos os campos obrigatórios antes de prosseguir.');
    }
  };

  // Função para voltar etapa
  const prevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  // Função para calcular estatísticas
  const calculateStats = () => {
    const total = patrimonios.length;
    const active = patrimonios.filter(p => p.status === 'Ativo').length;
    const maintenance = patrimonios.filter(p => p.status === 'Em manutenção').length;
    const leased = patrimonios.filter(p => p.locado).length;
    const insured = patrimonios.filter(p => p.segurado).length;
    
    setPatrimonioStats({
      total,
      active,
      maintenance,
      leased,
      insured
    });
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/");
      return;
    }
    setToken(storedToken);
    
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPatrimonios(storedToken),
          fetchColaboradores(storedToken)
        ]);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setError(error instanceof Error ? error.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  useEffect(() => {
    // Código existente...
  
    // Adicionar event listener para fechar o dropdown ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (showResponsavelDropdown && !(event.target as HTMLElement).closest('.responsavelDropdown')) {
      setShowResponsavelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
  
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResponsavelDropdown]);

  const fetchPatrimonios = async (token: string) => {
    try {
      const response = await fetch("/api/patrimonio", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erro ao buscar patrimônios");
      const data = await response.json();
      setPatrimonios(data);
      
      // Calcular estatísticas após receber os dados
      const total = data.length;
      const active = data.filter((p: Patrimonio) => p.status === 'Ativo').length;
      const maintenance = data.filter((p: Patrimonio) => p.status === 'Em manutenção').length;
      const leased = data.filter((p: Patrimonio) => p.locado).length;
      const insured = data.filter((p: Patrimonio) => p.segurado).length;
      
      setPatrimonioStats({
        total,
        active,
        maintenance,
        leased,
        insured
      });
      
      return data;
    } catch (error) {
      console.error("Erro ao buscar patrimônios:", error);
      throw error;
    }
  };

  const fetchColaboradores = async (token: string) => {
    try {
      const response = await fetch("/api/colaboradores", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erro ao buscar colaboradores");
      const data = await response.json();
      setColaboradores(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      throw error;
    }
  };

  const handleCreatePatrimonio = async () => {
    try {
      // Validar todas as etapas antes de criar
      const allValid = [1, 2].every(validateStep);
      
      if (!allValid) {
        showNotification('error', 'Preencha todos os campos obrigatórios antes de salvar.');
        return;
      }
  
      // Verificar se há duplicação de número de série e se o usuário não confirmou ainda
      if (patrimonioToEdit.numeroSerie?.trim() && !confirmedDuplicate) {
        const exists = await checkSerialExists(patrimonioToEdit.numeroSerie);
        if (exists) {
          setIsSerialDuplicate(true);
          setShowSerialWarning(true);
          return; // Interrompe o salvamento até que o usuário confirme
        }
      }
  
      // Resto do código atual de handleCreatePatrimonio
      if (!validatePatrimonio()) return;
  
      setLoading(true);
      // Garantir que todos os campos, incluindo o modelo, sejam corretamente enviados
      const patrimonioData = {
        ...patrimonioToEdit,
        responsavelId: Number(patrimonioToEdit.responsavelId),
        data_aquisicao: patrimonioToEdit.data_aquisicao ? new Date(patrimonioToEdit.data_aquisicao).toISOString() : null,
        // Garantir que modelo seja enviado mesmo se for uma string vazia
        modelo: patrimonioToEdit.modelo || ""
      };
  
      const response = await fetch("/api/patrimonio", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patrimonioData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido");
      }
  
      const createdPatrimonio = await response.json();
      
      // Mostrar toast primeiro
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-green-100 p-2 rounded-full">
            <Check size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">Patrimônio criado com sucesso!</p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{createdPatrimonio.nome}</span> foi adicionado ao sistema.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-green-500"
        }
      );
      
      // Depois atualizar o estado
      setPatrimonios([...patrimonios, createdPatrimonio]);
      setIsModalOpen(false);
      resetPatrimonioToEdit();
      calculateStats();
      
    } catch (error) {
      console.error("Erro ao criar patrimônio:", error);
      showNotification('error', error instanceof Error ? error.message : "Erro ao criar patrimônio");
    } finally {
      setLoading(false);
    }
  };

  const validatePatrimonio = () => {
    const requiredFields = ['nome', 'responsavelId', 'localizacao', 'fabricante', 'valor', 'tipo', 'descricao', 'data_aquisicao', 'status'];
    const missingFields = requiredFields.filter(field => !patrimonioToEdit[field as keyof Patrimonio]);
    
    if (missingFields.length > 0) {
      showNotification('error', `Preencha todos os campos obrigatórios`);
      return false;
    }
    
    const colaboradorExistente = colaboradores.find(colab => colab.id === Number(patrimonioToEdit.responsavelId));
    if (!colaboradorExistente) {
      showNotification('error', 'Responsável não encontrado. Selecione um colaborador válido.');
      return false;
    }
    
    return true;
  };

  // Substitua a função showNotification atual pela implementação com toast
const showNotification = (type: string, message: string) => {
  switch (type) {
    case 'success':
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-green-100 p-2 rounded-full">
            <Check size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">Sucesso</p>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-green-500"
        }
      );
      break;
    
    case 'error':
      toast.error(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium">Erro</p>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-red-500"
        }
      );
      break;
    
    case 'info':
      toast.info(
        <div className="flex items-center">
          <div className="mr-3 bg-blue-100 p-2 rounded-full">
            <Info size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Informação</p>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-blue-500"
        }
      );
      break;
    
    case 'warning':
      toast.warning(
        <div className="flex items-center">
          <div className="mr-3 bg-amber-100 p-2 rounded-full">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="font-medium">Atenção</p>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-amber-500"
        }
      );
      break;
  }
};

  // Formatação de data
  const formatDateForInput = (date: string | undefined) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const handleEditPatrimonio = (patrimonio: Patrimonio) => {
    setPatrimonioToEdit({
      ...patrimonio,
      data_aquisicao: formatDateForInput(patrimonio.data_aquisicao),
      dataNotaFiscal: formatDateForInput(patrimonio.dataNotaFiscal),
      dataGarantia: formatDateForInput(patrimonio.dataGarantia),
      dataVencimentoSeguro: formatDateForInput(patrimonio.dataVencimentoSeguro)
    });
    
    setIsModalOpen(true);
    setIsEditModalOpen(true);
    setActiveStep(1); // Garante que a edição começa sempre da primeira etapa
    
    // Preenche o campo de busca do responsável
    const responsavel = colaboradores.find(c => c.id === patrimonio.responsavelId);
    if (responsavel) {
      setResponsavelSearchTerm(`${responsavel.nome} ${responsavel.sobrenome || ''}`);
    }
  };

  const handleUpdatePatrimonio = async () => {
    if (!patrimonioToEdit.id) {
      showNotification('error', "ID do patrimônio não encontrado.");
      return;
    }

    if (!validatePatrimonio()) return;

    // Verificar duplicação apenas se o número de série foi alterado e usuário não confirmou
    if (patrimonioToEdit.numeroSerie?.trim() && !confirmedDuplicate) {
      const exists = await checkSerialExists(patrimonioToEdit.numeroSerie, patrimonioToEdit.id);
      if (exists) {
        setIsSerialDuplicate(true);
        setShowSerialWarning(true);
        return;
      }
    }

    try {
      setLoading(true);
      // Busca o patrimônio anterior para comparação
      const patrimonioAnterior = patrimonios.find(p => p.id === patrimonioToEdit.id);
      const mudouResponsavel = patrimonioAnterior?.responsavelId !== patrimonioToEdit.responsavelId;
      const mudouLocalizacao = patrimonioAnterior?.localizacao !== patrimonioToEdit.localizacao;
      const mudouKm = 
        patrimonioToEdit.tipo === "Veículo" && 
        patrimonioToEdit.kmEntrega !== undefined && 
        patrimonioToEdit.kmEntrega !== patrimonioAnterior?.kmEntrega;

      const response = await fetch(`/api/patrimonio`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...patrimonioToEdit,
          data_aquisicao: patrimonioToEdit.data_aquisicao ? new Date(patrimonioToEdit.data_aquisicao).toISOString() : null,
          dataNotaFiscal: patrimonioToEdit.dataNotaFiscal ? new Date(patrimonioToEdit.dataNotaFiscal).toISOString() : null,
          dataGarantia: patrimonioToEdit.dataGarantia ? new Date(patrimonioToEdit.dataGarantia).toISOString() : null,
          dataVencimentoSeguro: patrimonioToEdit.dataVencimentoSeguro ? new Date(patrimonioToEdit.dataVencimentoSeguro).toISOString() : null,
          ...(mudouResponsavel || mudouLocalizacao || mudouKm ? {
            movimentacao: {
              tipo: mudouResponsavel ? "ALTERACAO_RESPONSAVEL" : mudouLocalizacao ? "ALTERACAO_LOCALIZACAO" : "ALTERACAO_KM",
              patrimonioId: patrimonioToEdit.id,
              localizacaoAnterior: mudouLocalizacao ? patrimonioAnterior?.localizacao : undefined,
              localizacaoNova: mudouLocalizacao ? patrimonioToEdit.localizacao : undefined,
              responsavelAnteriorId: mudouResponsavel ? patrimonioAnterior?.responsavelId : undefined,
              responsavelNovoId: mudouResponsavel ? patrimonioToEdit.responsavelId : undefined,
              kmAnterior: mudouKm ? patrimonioAnterior?.kmEntrega : undefined,
              kmNovo: mudouKm ? patrimonioToEdit.kmEntrega : undefined
            }
          } : {})
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar patrimônio");
      }

      const updatedPatrimonio = await response.json();
      
      // Atualiza o estado
      setPatrimonios(patrimonios.map(p => 
        p.id === updatedPatrimonio.id ? updatedPatrimonio : p
      ));
      
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-blue-100 p-2 rounded-full">
            <RefreshCw size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Patrimônio atualizado!</p>
            <p className="text-sm text-gray-600">
              As informações de <span className="font-medium">{updatedPatrimonio.nome}</span> foram atualizadas com sucesso.
            </p>
          </div>
        </div>,
        {
          icon: false,
          closeButton: true,
          className: "border-l-4 border-blue-500"
        }
      );

      // Atualizar dados
      if (token) {
        await fetchPatrimonios(token);
      }
      
      calculateStats();
      
      // Atualiza as movimentações se necessário
      if (isMovimentacoesModalOpen && patrimonioToEdit.id) {
        handleViewMovimentacoes(patrimonioToEdit.id);
      }
    } catch (error) {
      console.error("Erro ao atualizar patrimônio:", error);
      showNotification('error', error instanceof Error ? error.message : "Erro ao atualizar patrimônio");
    } finally {
      setLoading(false);
    }
  };

  const resetPatrimonioToEdit = () => {
    setPatrimonioToEdit({
      id: 0,
      nome: '',
      fabricante: '',
      modelo: '',
      responsavelId: 0,
      valor: '',
      localizacao: '',
      tipo: '',
      descricao: '',
      oculto: false,
      data_aquisicao: '',
      status: '',
      numeroNotaFiscal: '',
      dataNotaFiscal: '',
      dataGarantia: '',
      placa: '',
      renavan: '',
      locado: false,
      proprietario: '',
      numeroSerie: '',
      anoModelo: 0,
      segurado: false,
      seguradora: '',
      dataVencimentoSeguro: '',
      kmEntrega: '',
      franquia: '',
    });
    setResponsavelSearchTerm("");
    setActiveStep(1); // Sempre reinicia na primeira etapa
    setCamposComErro([]); // Limpa possíveis erros anteriores
  };

  const handleToggleOcultar = (patrimonio: Patrimonio) => {
    setPatrimonioToToggle(patrimonio);
    setIsConfirmModalOpen(true);
  };

  const confirmToggleOcultar = async () => {
    if (patrimonioToToggle) {
      try {
        setLoading(true);
        const response = await fetch("/api/patrimonio", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: patrimonioToToggle.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro desconhecido");
        }

        const updatedPatrimonio = await response.json();
        setPatrimonios(patrimonios.map(p => p.id === updatedPatrimonio.id ? updatedPatrimonio : p));
        setIsConfirmModalOpen(false);

        if (patrimonioToToggle?.oculto) {
          toast.success(
            <div className="flex items-center">
              <div className="mr-3 bg-green-100 p-2 rounded-full">
                <Check size={18} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium">Patrimônio restaurado</p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{updatedPatrimonio.nome}</span> foi restaurado com sucesso.
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
              <div className="mr-3 bg-red-100 p-2 rounded-full">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-medium">Patrimônio excluído</p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{updatedPatrimonio.nome}</span> foi excluído com sucesso.
                </p>
              </div>
            </div>,
            {
              icon: false,
              closeButton: true,
              className: "border-l-4 border-red-500"
            }
          );
        }
      } catch (error) {
        console.error("Erro ao alterar visibilidade:", error);
        showNotification('error', error instanceof Error ? error.message : "Erro ao executar operação");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewMovimentacoes = async (patrimonioId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/movimentacao?patrimonioId=${patrimonioId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Erro ao buscar movimentações");

      const { data } = await response.json();
      const patrimonio = patrimonios.find(p => p.id === patrimonioId);
      const responsavelAtual = patrimonio?.responsavelId 
        ? colaboradores.find(c => c.id === patrimonio.responsavelId)
        : null;

      const formattedData: Movimentacao = {
        id: patrimonioId,
        patrimonioId,
        patrimonioNome: patrimonio?.nome || "Patrimônio Desconhecido",
        responsavelAtual: responsavelAtual 
          ? { 
              id: responsavelAtual.id,
              nome: responsavelAtual.nome || "Não informado",
              sobrenome: responsavelAtual.sobrenome || ""
            }
          : null,
        localizacaoAtual: patrimonio?.localizacao || "Localização não informada",
        kmAtual: patrimonio?.kmEntrega,
        historico: data.map((mov: any) => ({
          id: mov.id,
          data: mov.createdAt,
          tipo: mov.tipo,
          responsavelAnterior: mov.responsavelAnterior,
          responsavelNovo: mov.responsavelNovo,
          localizacaoAnterior: mov.localizacaoAnterior,
          localizacaoNova: mov.localizacaoNova,
          kmAnterior: mov.kmAnterior,
          kmNovo: mov.kmNovo
        }))
      };

      setMovimentacoes([formattedData]);
      setIsMovimentacoesModalOpen(true);
    } catch (error) {
      console.error("Erro ao buscar movimentações:", error);
      showNotification('error', "Erro ao buscar movimentações");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDoc = async (patrimonioId: number) => {
    try {
      setLoading(true);
      const response = await fetch('/api/patrimonio/generate-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patrimonioId }),
      });

      if (!response.ok) throw new Error('Erro ao gerar documento');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo_responsabilidade_${patrimonioId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(
        <div className="flex items-center">
          <div className="mr-3 bg-blue-100 p-2 rounded-full">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Documento gerado</p>
            <p className="text-sm text-gray-600">
              O termo de responsabilidade foi gerado com sucesso e o download foi iniciado.
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
      console.error('Erro ao gerar documento:', error);
      showNotification('error', 'Erro ao gerar documento');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    
    // Criar a data a partir da string, forçando a interpretação como UTC
    const dateUTC = new Date(dateString);
    
    // Ajustar o fuso horário adicionando o offset local
    const userTimezoneOffset = dateUTC.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(dateUTC.getTime() + userTimezoneOffset);
    
    // Formatar a data
    return adjustedDate.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const handleClearFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterLocation('');
    setFilterResponsible(0);
    setFilterInsured('');
    setFilterRented('');
    setPriceRange({ min: '', max: '' });
    setSearchTerm('');
    setShowFilters(false);
    setVisibleItems(itemsPerLoad); // Resetar para o valor inicial
    toast.info(
      <div className="flex items-center">
        <div className="mr-3 bg-blue-100 p-2 rounded-full">
          <X size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium">Filtros limpos</p>
          <p className="text-sm text-gray-600">
            Todos os filtros foram removidos com sucesso.
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

  const filteredPatrimonios = patrimonios.filter((p) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      p.nome.toLowerCase().includes(search) ||
      p.placa?.toLowerCase().includes(search) ||
      p.numeroNotaFiscal?.toLowerCase().includes(search) ||
      p.localizacao.toLowerCase().includes(search) ||
      p.fabricante.toLowerCase().includes(search) ||
      p.tipo.toLowerCase().includes(search) ||
      p.numeroSerie?.toLowerCase().includes(search);

    if (filterType && p.tipo !== filterType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterLocation && p.localizacao !== filterLocation) return false;
    if (filterResponsible && p.responsavelId !== filterResponsible) return false;

    if (filterInsured) {
      if (filterInsured === 'true' && !p.segurado) return false;
      if (filterInsured === 'false' && p.segurado) return false;
    }

    if (filterRented) {
      if (filterRented === 'true' && !p.locado) return false;
      if (filterRented === 'false' && p.locado) return false;
    }

    const valor = Number(p.valor?.replace(/[^0-9.-]+/g, ''));
    if (priceRange.min && valor < Number(priceRange.min)) return false;
    if (priceRange.max && valor > Number(priceRange.max)) return false;

    return matchesSearch;
  });

  const isFilterActive = filterType || 
                       filterStatus || 
                       filterLocation || 
                       filterResponsible || 
                       filterInsured || 
                       filterRented || 
                       searchTerm || 
                       (priceRange.min && priceRange.min !== '') || 
                       (priceRange.max && priceRange.max !== '');

  const exportToExcel = async () => {
    try {
      setIsExportModalOpen(true);
      
      if (filteredPatrimonios.length === 0) {
        showNotification('error', "Não há dados para exportar.");
        setIsExportModalOpen(false);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataToExport = filteredPatrimonios.map(item => {
        const dataFormatada = item.data_aquisicao ? format(new Date(item.data_aquisicao), 'dd/MM/yyyy') : 'N/A';
        
        return {
          'ID': item.id,
          'Nome': item.nome,
          'Tipo': item.tipo,
          'Descrição': item.descricao,
          'Data de Aquisição': dataFormatada,
          'Valor': item.valor,
          'Status': item.status,
          'Fabricante': item.fabricante,
          'Modelo': item.modelo || 'N/A',
          'Localização': item.localizacao,
          'Número de Série': item.numeroSerie || 'N/A',
          'Placa': item.placa || 'N/A',
          'Nota Fiscal': item.numeroNotaFiscal || 'N/A',
          'Responsável': colaboradores.find(colab => colab.id === item.responsavelId)?.nome + ' ' + colaboradores.find(colab => colab.id === item.responsavelId)?.sobrenome || 'N/A',
          'Locado': item.locado ? 'Sim' : 'Não',
          'Segurado': item.segurado ? 'Sim' : 'Não',
          'Proprietário': item.proprietario || 'N/A'
        };
      });
  
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patrimônios');
      
      let fileNameParts = ['relatorio-patrimonios'];
      
      if (filterType) fileNameParts.push(`tipo-${filterType}`);
      if (filterStatus) fileNameParts.push(`status-${filterStatus}`);
      if (filterLocation) fileNameParts.push(`local-${filterLocation.replace(/[\/\\:*?"<>|]/g, '_')}`);
      if (filterResponsible) {
        const responsavel = colaboradores.find(c => c.id === filterResponsible);
        if (responsavel) fileNameParts.push(`resp-${responsavel.nome.replace(/[\/\\:*?"<>|]/g, '_')}`);
      }
      if (filterInsured === 'true') fileNameParts.push('segurados');
      if (filterInsured === 'false') fileNameParts.push('nao-segurados');
      if (filterRented === 'true') fileNameParts.push('locados');
      if (filterRented === 'false') fileNameParts.push('nao-locados');
      if (priceRange.min) fileNameParts.push(`min-${priceRange.min}`);
      if (priceRange.max) fileNameParts.push(`max-${priceRange.max}`);
      if (searchTerm) fileNameParts.push(`busca-${searchTerm.replace(/[\/\\:*?"<>|]/g, '_')}`);
      
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
            <p className="font-medium">Exportação concluída</p>
            <p className="text-sm text-gray-600">
              Relatório com {filteredPatrimonios.length} registros foi exportado com sucesso.
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
      showNotification('error', 'Ocorreu um erro ao exportar os dados');
      setIsExportModalOpen(false);
    }
  };

  // Função para filtrar colaboradores baseado na busca
  const filteredColaboradores = colaboradores.filter(colaborador => {
    if (!responsavelSearchTerm) return true;
    
    const fullName = `${colaborador.nome} ${colaborador.sobrenome || ''}`.toLowerCase();
    const details = `${colaborador.cargo || ''} ${colaborador.setor || ''}`.toLowerCase();
    const searchTerm = responsavelSearchTerm.toLowerCase();
    
    return fullName.includes(searchTerm) || details.includes(searchTerm);
  });

  // Função para selecionar um responsável
  interface SelectResponsavelProps {
    id: number;
    nome: string;
    sobrenome?: string;
  }

  const selectResponsavel = (colaborador: SelectResponsavelProps): void => {
    setPatrimonioToEdit({ ...patrimonioToEdit, responsavelId: Number(colaborador.id) });
    setResponsavelSearchTerm(`${colaborador.nome} ${colaborador.sobrenome || ''}`);
    setShowResponsavelDropdown(false);
  };

  // Função para verificar se o número de série/chassi já existe
  const checkSerialExists = async (serial: string, skipId?: number): Promise<boolean> => {
    if (!serial.trim()) return false;
    
    try {
      const response = await fetch(`/api/patrimonio/check-serial?serial=${encodeURIComponent(serial)}${skipId ? `&skipId=${skipId}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Erro ao verificar número de série");
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("Erro ao verificar número de série:", error);
      return false; // Em caso de erro, permitimos continuar
    }
  };

  // Função para verificar o número de série quando o usuário terminar de digitar
  const handleSerialBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const serial = e.target.value.trim();
    
    if (!serial) {
      setIsSerialDuplicate(false);
      setShowSerialWarning(false);
      return;
    }
    
    setSerialCheckLoading(true);
    
    // Se estamos editando, ignoramos o ID atual (para não encontrar ele mesmo)
    const skipId = isEditModalOpen ? patrimonioToEdit.id : undefined;
    
    const exists = await checkSerialExists(serial, skipId);
    
    setIsSerialDuplicate(exists);
    setShowSerialWarning(exists);
    setConfirmedDuplicate(false);
    setSerialCheckLoading(false);
  };

  // Adicione este useEffect para resetar os itens visíveis quando os filtros mudam
  useEffect(() => {
    setVisibleItems(itemsPerLoad);
  }, [searchTerm, filterType, filterStatus, filterLocation, filterResponsible, 
    filterInsured, filterRented, priceRange.min, priceRange.max, itemsPerLoad]);

  // Adicione essa função de ordenação alfabética antes da função de renderização
  const sortedColaboradores = [...colaboradores].sort((a, b) => {
    // Limpar e normalizar nomes antes da comparação
    const nomeA = `${a.nome} ${a.sobrenome || ''}`.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nomeB = `${b.nome} ${b.sobrenome || ''}`.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });

  // Componente principal
  return (
    <ProtectedRoute pageName="patrimonio">
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        
        <main className="flex-grow p-4 md:p-6 lg:p-8 mt-20 max-w-7xl mx-auto w-full">
          {/* Header da página com estatísticas em cards */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Controle de Patrimônio</h1>
                <p className="text-gray-600">Gerencie todos os bens e ativos da empresa</p>
              </div>
              
              <PermissionGuard pageName="patrimonio" permission="canEdit">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    resetPatrimonioToEdit(); // Vai resetar e colocar activeStep = 1
                    setIsModalOpen(true);
                    setIsEditModalOpen(false);
                  }}
                  className="mt-4 md:mt-0 flex items-center px-5 py-2.5 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <PlusCircle size={18} className="mr-2" />
                  Novo Patrimônio
                </motion.button>
              </PermissionGuard>
            </div>
            
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <motion.div 
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start">
                  <div className="rounded-full p-2 bg-blue-100 text-[#344893]">
                    <Package size={18} />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Total de Itens</p>
                    <p className="text-xl font-bold">{patrimonioStats.total}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start">
                  <div className="rounded-full p-2 bg-green-100 text-green-600">
                    <CheckCircle size={18} />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Ativos</p>
                    <p className="text-xl font-bold">{patrimonioStats.active}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start">
                  <div className="rounded-full p-2 bg-amber-100 text-amber-600">
                    <AlertCircle size={18} />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Em Manutenção</p>
                    <p className="text-xl font-bold">{patrimonioStats.maintenance}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start">
                  <div className="rounded-full p-2 bg-purple-100 text-purple-600">
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Locados</p>
                    <p className="text-xl font-bold">{patrimonioStats.leased}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start">
                  <div className="rounded-full p-2 bg-blue-100 text-blue-600">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-gray-500">Segurados</p>
                    <p className="text-xl font-bold">{patrimonioStats.insured}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Barra de pesquisa e controles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-4 rounded-xl shadow-sm mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4 mb-5">
              {/* Barra de pesquisa */}
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por Nome, Placa, Nota Fiscal, Nº Série/Chassi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                />
              </div>
              
              {/* Controles de visualização */}
              <div className="flex space-x-2">
                {/* Modo de visualização */}
                <div className="bg-gray-100 rounded-lg flex">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3.5 py-2.5 rounded-l-lg transition-colors flex items-center ${
                      viewMode === 'grid'
                        ? 'bg-[#344893] text-white'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Grid size={16} className="mr-1.5" /> 
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3.5 py-2.5 rounded-r-lg transition-colors flex items-center ${
                      viewMode === 'table'
                        ? 'bg-[#344893] text-white'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <List size={16} className="mr-1.5" /> 
                    <span className="hidden sm:inline">Tabela</span>
                  </button>
                </div>
                
                {/* Botão de filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg transition-colors ${
                    isFilterActive
                      ? 'bg-blue-100 text-[#344893] hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <FilterIcon size={16} />
                  <span className="hidden sm:inline">Filtros</span>
                  {isFilterActive && <span className="bg-[#344893] text-white text-xs px-1.5 py-0.5 rounded-full">
                    {Object.values({filterType, filterStatus, filterLocation, filterInsured, filterRented}).filter(Boolean).length + 
                    (filterResponsible ? 1 : 0) + 
                    (priceRange.min ? 1 : 0) + 
                    (priceRange.max ? 1 : 0) +
                    (searchTerm ? 1 : 0)}
                  </span>}
                  {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {/* Botão de exportação */}
                {isFilterActive && (
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    title="Exportar para Excel"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Exportar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{filteredPatrimonios.length}</span> patrimônios encontrados
              </div>
              
              {isFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={14} />
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Painel de filtros expansível */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 mt-5 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Filtro por Tipo */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">Tipo de Patrimônio</label>
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                        >
                          <option value="">Todos os tipos</option>
                          <option value="Veículo">Veículo</option>
                          <option value="Celular">Celular</option>
                          <option value="Móveis">Móveis</option>
                          <option value="Informática">Informática</option>
                          <option value="Peça">Peça</option>
                        </select>
                      </div>

                      {/* Filtro por Status */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                        >
                          <option value="">Todos os status</option>
                          <option value="Ativo">Ativo</option>
                          <option value="Em manutenção">Em manutenção</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </div>

                      {/* Filtro por Localização */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">Localização</label>
                        <select
                          value={filterLocation}
                          onChange={(e) => setFilterLocation(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                        >
                          <option value="">Todas as localizações</option>
                          {Array.from(new Set(patrimonios.map(p => p.localizacao))).map(loc => (
                            <option key={`loc-${loc}`} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro por Responsável */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">Responsável</label>
                        <select
                          value={filterResponsible}
                          onChange={(e) => setFilterResponsible(Number(e.target.value))}
                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                        >
                          <option value={0}>Todos os responsáveis</option>
                          {sortedColaboradores.map(colab => (
                            <option key={`resp-${colab.id}`} value={colab.id}>
                              {colab.nome} {colab.sobrenome || ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro por Segurado */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">Segurado</label>
                        <select
                          value={filterInsured}
                          onChange={(e) => setFilterInsured(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                        >
                          <option value="">Todos</option>
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </select>
                      </div>

                      {/* Filtro por Locado */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">Locado</label>
                        <select
                          value={filterRented}
                          onChange={(e) => setFilterRented(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                        >
                          <option value="">Todos</option>
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </select>
                      </div>

                      {/* Filtro por Faixa de Preço */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700">Faixa de Valor</label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              placeholder="Mínimo"
                              value={priceRange.min}
                              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                              className="pl-9 pr-3 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                            />
                          </div>
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              placeholder="Máximo"
                              value={priceRange.max}
                              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                              className="pl-9 pr-3 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-[#344893] focus:border-[#344893]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Tags de filtros ativos */}
          {isFilterActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              {filterType && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Tipo:</span> {filterType}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setFilterType('')}
                  />
                </span>
              )}
              
              {filterStatus && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Status:</span> {filterStatus}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setFilterStatus('')}
                  />
                </span>
              )}
              
              {filterLocation && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Local:</span> {filterLocation}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setFilterLocation('')}
                  />
                </span>
              )}
              
              {filterResponsible > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Responsável:</span> 
                  {colaboradores.find(c => c.id === filterResponsible)?.nome || 'Desconhecido'}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setFilterResponsible(0)}
                  />
                </span>
              )}
              
              {filterInsured && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Segurados:</span> 
                  {filterInsured === 'true' ? 'Sim' : 'Não'}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setFilterInsured('')}
                  />
                </span>
              )}
              
              {filterRented && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Locados:</span> 
                  {filterRented === 'true' ? 'Sim' : 'Não'}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setFilterRented('')}
                  />
                </span>
              )}
              
              {priceRange.min && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Valor mínimo:</span> R$ {priceRange.min}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setPriceRange({...priceRange, min: ''})}
                  />
                </span>
              )}
              
              {priceRange.max && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Valor máximo:</span> R$ {priceRange.max}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setPriceRange({...priceRange, max: ''})}
                  />
                </span>
              )}
              
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="font-semibold mr-1">Busca:</span> "{searchTerm}"
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer hover:text-blue-900" 
                    onClick={() => setSearchTerm('')}
                  />
                </span>
              )}
            </motion.div>
          )}
    
          {/* Lista de patrimônios em modo Card */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#344893]"></div>
            </div>
          ) : viewMode === 'grid' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredPatrimonios.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-xl border border-gray-200">
                  <div className="mx-auto bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                    <Package className="text-gray-400" size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum patrimônio encontrado</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {isFilterActive 
                      ? "Tente ajustar os filtros para ver mais resultados."
                      : "Cadastre seu primeiro patrimônio clicando no botão 'Novo Patrimônio'."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {filteredPatrimonios.slice(0, visibleItems).map((patrimonio, index) => (
                    // Mantenha seu código existente de renderização dos cards aqui
                    <motion.div
                      key={patrimonio.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -5, boxShadow: '0 12px 20px -5px rgba(0, 0, 0, 0.1)' }}
                      className={`bg-white rounded-xl overflow-hidden shadow-sm border ${
                        patrimonio.oculto ? 'border-red-200 bg-red-50' : 'border-transparent'
                      }`}
                    >
                      {/* Topo do card com status colorido */}
                      <div className={`h-2 ${
                        patrimonio.status === 'Ativo' ? 'bg-green-500' :
                        patrimonio.status === 'Em manutenção' ? 'bg-orange-400' : 'bg-red-500'
                      }`}></div>
                      
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 truncate mr-2">{patrimonio.nome}</h3>
                          <div className="flex space-x-1">
                            {patrimonio.locado && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                                Locado
                              </span>
                            )}
                            {patrimonio.segurado && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Segurado
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Informações principais */}
                        <div className="mb-5 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tipo:</span>
                            <span className="font-medium text-gray-800">{patrimonio.tipo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status:</span>
                            <span className={`font-medium ${
                              patrimonio.status === 'Ativo' ? 'text-green-600' :
                              patrimonio.status === 'Em manutenção' ? 'text-orange-600' : 'text-red-600'
                            }`}>{patrimonio.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Valor:</span>
                            <span className="font-medium text-gray-800">{patrimonio.valor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Localização:</span>
                            <span className="font-medium text-gray-800 truncate max-w-[60%]">{patrimonio.localizacao}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Responsável:</span>
                            <span className="font-medium text-gray-800 truncate max-w-[60%]">
                              {colaboradores.find((c) => c.id === patrimonio.responsavelId)?.nome || 'N/A'} {' '}
                              {colaboradores.find((c) => c.id === patrimonio.responsavelId)?.sobrenome || ''}
                            </span>
                          </div>
                          {patrimonio.tipo === "Veículo" && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Placa:</span>
                              <span className="font-medium text-gray-800">{patrimonio.placa || 'N/A'}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Divisor */}
                        <div className="border-t border-gray-100 my-4"></div>
                        
                        {/* Botões de ações */}
                        <div className="flex justify-between">
                          <div className="flex space-x-2">
                            <PermissionGuard pageName="patrimonio" permission="canEdit">
                              <button
                                onClick={() => handleEditPatrimonio(patrimonio)}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                            </PermissionGuard>
                            <PermissionGuard pageName="patrimonio" permission="canDelete">
                              <button
                                onClick={() => handleToggleOcultar(patrimonio)}
                                className={`p-2 ${
                                  patrimonio.oculto ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                                } rounded-lg transition-colors`}
                                title={patrimonio.oculto ? "Restaurar" : "Excluir"}
                              >
                                {patrimonio.oculto ? <Eye size={16} /> : <Trash2 size={16} />}
                              </button>
                            </PermissionGuard>
                            <button
                              onClick={() => handleViewMovimentacoes(patrimonio.id)}
                              className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                              title="Movimentações"
                            >
                              <History size={16} />
                            </button>
                            <button
                              onClick={() => setSelectedPatrimonio(patrimonio)}
                              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                              title="Ver detalhes"
                            >
                              <Info size={16} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleGenerateDoc(patrimonio.id)}
                            className="p-2 bg-[#344893] bg-opacity-10 text-[#ffffff] rounded-lg hover:bg-opacity-20 transition-colors"
                            title="Gerar Termo"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Botão Ver Mais */}
                  {filteredPatrimonios.length > visibleItems && (
                    <div className="col-span-full flex justify-center mt-8">
                      <button
                        onClick={loadMoreItems}
                        className="px-6 py-3 bg-[#344893] text-white border border-gray-300 rounded-lg shadow-sm hover:bg-[#344993e3] transition-colors flex items-center"
                      >
                        Ver mais <ChevronDown size={16} className="ml-2" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            // Modo tabela aqui...
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Aquisição</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fabricante</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota Fiscal</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Nota</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Garantia</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renavan</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locado</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proprietário</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Série/Chassi</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ano/Modelo</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segurado</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seguradora</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venc. Seguro</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Franquia</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KM de Entrega</th>
                      </tr>
                    </thead>
                    {/* Dentro da visão de tabela, modifique o tbody */}
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPatrimonios.length === 0 ? (
                        <tr>
                          <td colSpan={25} className="text-center py-8 text-gray-500">
                            Nenhum patrimônio encontrado.
                          </td>
                        </tr>
                      ) : (
                        filteredPatrimonios.slice(0, visibleItems).map((patrimonio) => (
                          <tr key={patrimonio.id} className={`${patrimonio.oculto ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditPatrimonio(patrimonio)}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                  title="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleToggleOcultar(patrimonio)}
                                  className={`p-2 ${
                                    patrimonio.oculto ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                                  } rounded-lg transition-colors`}
                                  title={patrimonio.oculto ? "Restaurar" : "Excluir"}
                                >
                                  {patrimonio.oculto ? <Eye size={16} /> : <Trash2 size={16} />}
                                </button>
                                <button
                                  onClick={() => handleViewMovimentacoes(patrimonio.id)}
                                  className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                  title="Movimentações"
                                >
                                  <History size={16} />
                                </button>
                                <button
                                  onClick={() => setSelectedPatrimonio(patrimonio)}
                                  className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                  title="Ver detalhes"
                                >
                                  <Info size={16} />
                                </button>
                                <button
                                  onClick={() => handleGenerateDoc(patrimonio.id)}
                                  className="p-2 bg-[#344893] bg-opacity-10 text-[#ffffff] rounded-lg hover:bg-opacity-20 transition-colors"
                                  title="Gerar Termo"
                                >
                                  <FileText size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.nome}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.tipo}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.descricao}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(patrimonio.data_aquisicao)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.valor}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.status}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.fabricante}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.modelo}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.localizacao}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {colaboradores.find((c) => c.id === patrimonio.responsavelId)?.nome || 'N/A'} {' '}
                              {colaboradores.find((c) => c.id === patrimonio.responsavelId)?.sobrenome || ''}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.numeroNotaFiscal}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(patrimonio.dataNotaFiscal)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(patrimonio.dataGarantia)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.placa}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.renavan}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.locado ? 'Sim' : 'Não'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.proprietario}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.numeroSerie}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.anoModelo}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.segurado ? 'Sim' : 'Não'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.seguradora}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(patrimonio.dataVencimentoSeguro)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.franquia}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{patrimonio.kmEntrega}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {/* Adicione este código logo após o fechamento da tabela */}
                  {viewMode === 'table' && filteredPatrimonios.length > visibleItems && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={loadMoreItems}
                        className="px-6 py-3 bg-[#344893] text-white border border-gray-300 rounded-lg shadow-sm hover:bg-[#344993e8] transition-colors  flex items-center"
                      >
                        Ver mais <ChevronDown size={16} className="ml-2" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Modal para Criar ou Editar Patrimônio - Versão com etapas */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[90vh] relative"
            >
              {/* Cabeçalho */}
              <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {isEditModalOpen ? "Editar Patrimônio" : "Cadastrar Novo Patrimônio"}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setActiveStep(1);
                    setCamposComErro([]);
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
                      style={{width: `${(activeStep / totalSteps) * 100}%`}}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Etapa {activeStep} de {totalSteps}</span>
                    <span>{Math.round((activeStep / totalSteps) * 100)}% concluído</span>
                  </div>
                </div>

                {/* Passos do fluxo */}
                <div className="flex justify-between mb-6 text-xs">
                  <div className={`flex flex-col items-center ${activeStep >= 1 ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeStep >= 1 ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                      1
                    </div>
                    <span>Informações Básicas</span>
                    {camposComErro.some(c => ['nome', 'tipo', 'descricao', 'data_aquisicao', 'valor', 'status', 'fabricante'].includes(c)) && (
                      <span className="mt-1 text-red-500">●</span>
                    )}
                  </div>
                  
                  <div className={`flex flex-col items-center ${activeStep >= 2 ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeStep >= 2 ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                      2
                    </div>
                    <span>Detalhes Adicionais</span>
                    {camposComErro.some(c => ['localizacao', 'responsavelId'].includes(c)) && (
                      <span className="mt-1 text-red-500">●</span>
                    )}
                  </div>
                  
                  <div className={`flex flex-col items-center ${activeStep >= 3 ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeStep >= 3 ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                      3
                    </div>
                    <span>{patrimonioToEdit.tipo === "Veículo" ? "Dados do Veículo" : "Dados Específicos"}</span>
                  </div>
                  
                  <div className={`flex flex-col items-center ${activeStep >= 4 ? 'text-[#344893] font-medium' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${activeStep >= 4 ? 'bg-[#344893] text-white' : 'bg-gray-200'}`}>
                      4
                    </div>
                    <span>Seguro e Locação</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                {/* Formulário com etapas */}
                <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Etapa 1 - Informações Básicas */}
                  {activeStep === 1 && (
                    <>
                      {/* Nome */}
                      <div>
                        <label className="flex text-sm font-medium mb-1 items-center">
                          <span className={camposComErro.includes('nome') ? "text-red-600" : "text-gray-700"}>
                            Nome <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="Nome do patrimônio"
                          value={patrimonioToEdit.nome || ""}
                          onChange={(e) => {
                            setPatrimonioToEdit({ ...patrimonioToEdit, nome: e.target.value });
                            if (e.target.value && camposComErro.includes('nome')) {
                              setCamposComErro(camposComErro.filter(c => c !== 'nome'));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            camposComErro.includes('nome') 
                              ? 'border-red-300 bg-red-50 focus:ring-red-200' 
                              : 'border-gray-300 focus:ring-[#344893]'
                          } focus:ring-2 transition-colors`}
                        />
                        {camposComErro.includes('nome') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('tipo') ? "text-red-600" : "text-gray-700"}>
                            Tipo <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <select
                          value={patrimonioToEdit.tipo || ""}
                          onChange={(e) => {
                            setPatrimonioToEdit({ ...patrimonioToEdit, tipo: e.target.value });
                            if (e.target.value && camposComErro.includes('tipo')) {
                              setCamposComErro(camposComErro.filter(c => c !== 'tipo'));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            camposComErro.includes('tipo') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          } focus:ring-2 focus:ring-[#344893] transition-colors`}
                        >
                          <option value="" disabled>Selecionar o tipo</option>
                          <option value="Veículo">Veículo</option>
                          <option value="Celular">Celular</option>
                          <option value="Móveis">Móveis</option>
                          <option value="Informática">Informática</option>
                          <option value="Peça">Peça</option>
                        </select>
                        {camposComErro.includes('tipo') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Descrição */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('descricao') ? "text-red-600" : "text-gray-700"}>
                            Descrição <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <textarea
                          placeholder="Descreva o patrimônio"
                          value={patrimonioToEdit.descricao || ""}
                          onChange={(e) => {
                            setPatrimonioToEdit({ ...patrimonioToEdit, descricao: e.target.value });
                            if (e.target.value && camposComErro.includes('descricao')) {
                              setCamposComErro(camposComErro.filter(c => c !== 'descricao'));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            camposComErro.includes('descricao') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          } focus:ring-2 focus:ring-[#344893] transition-colors`}
                          rows={3}
                        />
                        {camposComErro.includes('descricao') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Restante dos campos da etapa 1 */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('data_aquisicao') ? "text-red-600" : "text-gray-700"}>
                            Data de Aquisição <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="date"
                            value={patrimonioToEdit.data_aquisicao || ""}
                            onChange={(e) => {
                              setPatrimonioToEdit({ ...patrimonioToEdit, data_aquisicao: e.target.value });
                              if (e.target.value && camposComErro.includes('data_aquisicao')) {
                                setCamposComErro(camposComErro.filter(c => c !== 'data_aquisicao'));
                              }
                            }}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg ${
                              camposComErro.includes('data_aquisicao') 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            } focus:ring-2 focus:ring-[#344893] transition-colors`}
                          />
                        </div>
                        {camposComErro.includes('data_aquisicao') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Valor */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('valor') ? "text-red-600" : "text-gray-700"}>
                            Valor <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Valor"
                            value={patrimonioToEdit.valor || ""}
                            onChange={(e) => {
                              setPatrimonioToEdit({ ...patrimonioToEdit, valor: e.target.value });
                              if (e.target.value && camposComErro.includes('valor')) {
                                setCamposComErro(camposComErro.filter(c => c !== 'valor'));
                              }
                            }}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg ${
                              camposComErro.includes('valor') 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            } focus:ring-2 focus:ring-[#344893] transition-colors`}
                          />
                        </div>
                        {camposComErro.includes('valor') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Status e Fabricante */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('status') ? "text-red-600" : "text-gray-700"}>
                            Status <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <select
                          value={patrimonioToEdit.status || ""}
                          onChange={(e) => {
                            setPatrimonioToEdit({ ...patrimonioToEdit, status: e.target.value });
                            if (e.target.value && camposComErro.includes('status')) {
                              setCamposComErro(camposComErro.filter(c => c !== 'status'));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            camposComErro.includes('status') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          } focus:ring-2 focus:ring-[#344893] transition-colors`}
                        >
                          <option value="" disabled>Selecione um status</option>
                          <option value="Ativo">Ativo</option>
                          <option value="Em manutenção">Em manutenção</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                        {camposComErro.includes('status') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('fabricante') ? "text-red-600" : "text-gray-700"}>
                            Fabricante <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="Fabricante"
                          value={patrimonioToEdit.fabricante || ""}
                          onChange={(e) => {
                            setPatrimonioToEdit({ ...patrimonioToEdit, fabricante: e.target.value });
                            if (e.target.value && camposComErro.includes('fabricante')) {
                              setCamposComErro(camposComErro.filter(c => c !== 'fabricante'));
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            camposComErro.includes('fabricante') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          } focus:ring-2 focus:ring-[#344893] transition-colors`}
                        />
                        {camposComErro.includes('fabricante') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                        <input
                          type="text"
                          placeholder="Modelo"
                          value={patrimonioToEdit.modelo || ""}
                          onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, modelo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                        />
                      </div>
                    </>
                  )}

                  {/* Etapa 2 - Detalhes Adicionais */}
                  {activeStep === 2 && (
                    <>
                      {/* Localização */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('localizacao') ? "text-red-600" : "text-gray-700"}>
                            Localização <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Localização"
                            value={patrimonioToEdit.localizacao || ""}
                            onChange={(e) => {
                              setPatrimonioToEdit({ ...patrimonioToEdit, localizacao: e.target.value });
                              if (e.target.value && camposComErro.includes('localizacao')) {
                                setCamposComErro(camposComErro.filter(c => c !== 'localizacao'));
                              }
                            }}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg ${
                              camposComErro.includes('localizacao') 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            } focus:ring-2 focus:ring-[#344893] transition-colors`}
                          />
                        </div>
                        {camposComErro.includes('localizacao') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Responsável */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <span className={camposComErro.includes('responsavelId') ? "text-red-600" : "text-gray-700"}>
                            Responsável <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Buscar responsável pelo nome..."
                            value={responsavelSearchTerm}
                            onChange={(e) => {
                              setResponsavelSearchTerm(e.target.value);
                              setShowResponsavelDropdown(true);
                            }}
                            onFocus={() => setShowResponsavelDropdown(true)}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg ${
                              camposComErro.includes('responsavelId') 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            } focus:ring-2 focus:ring-[#344893] transition-colors`}
                          />
                        </div>
                        
                        {/* Lista de Resultados */}
                        {showResponsavelDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto responsavelDropdown">
                            {filteredColaboradores.length > 0 ? (
                              filteredColaboradores.map(colaborador => (
                                <div
                                  key={colaborador.id}
                                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                    patrimonioToEdit.responsavelId === colaborador.id ? 'bg-blue-50 text-blue-700' : ''
                                  }`}
                                  onClick={() => {
                                    selectResponsavel(colaborador);
                                    if (camposComErro.includes('responsavelId')) {
                                      setCamposComErro(camposComErro.filter(c => c !== 'responsavelId'));
                                    }
                                  }}
                                >
                                  <div className="font-medium">{colaborador.nome} {colaborador.sobrenome}</div>
                                  {(colaborador.cargo || colaborador.setor) && (
                                    <div className="text-xs text-gray-500">
                                      {colaborador.cargo && `${colaborador.cargo}`}
                                      {colaborador.cargo && colaborador.setor && ` • `}
                                      {colaborador.setor && `${colaborador.setor}`}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500">
                                Nenhum responsável encontrado
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Responsável selecionado */}
                        {patrimonioToEdit.responsavelId > 0 && (
                          <div className="mt-1 p-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            <span className="font-medium">Selecionado: </span>
                            {colaboradores.find(c => c.id === patrimonioToEdit.responsavelId)?.nome || ''} {' '}
                            {colaboradores.find(c => c.id === patrimonioToEdit.responsavelId)?.sobrenome || ''}
                          </div>
                        )}
                        
                        {camposComErro.includes('responsavelId') && (
                          <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                        )}
                      </div>

                      {/* Campos adicionais da etapa 2 */}
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série/Chassi</label>
                          <input
                            type="text"
                            placeholder="Número de Série/Chassi"
                            value={patrimonioToEdit.numeroSerie || ""}
                            onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, numeroSerie: e.target.value })}
                            onBlur={handleSerialBlur}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Proprietário</label>
                          <input
                            type="text"
                            placeholder="Proprietário"
                            value={patrimonioToEdit.proprietario || ""}
                            onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, proprietario: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número da Nota Fiscal</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FileText size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Número da Nota Fiscal"
                              value={patrimonioToEdit.numeroNotaFiscal || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, numeroNotaFiscal: e.target.value })}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data da Nota Fiscal</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Calendar size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="date"
                              value={patrimonioToEdit.dataNotaFiscal || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, dataNotaFiscal: e.target.value })}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data de Garantia</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Calendar size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="date"
                              value={patrimonioToEdit.dataGarantia || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, dataGarantia: e.target.value })}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Etapa 3 - Dados do Veículo */}
                  {activeStep === 3 && (
                    <>
                      {patrimonioToEdit.tipo === "Veículo" ? (
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                            <input
                              type="text"
                              placeholder="Placa"
                              value={patrimonioToEdit.placa || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, placa: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Renavan</label>
                            <input
                              type="text"
                              placeholder="Renavan"
                              value={patrimonioToEdit.renavan || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, renavan: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Modelo</label>
                            <input
                              type="number"
                              placeholder="Ano/Modelo"
                              value={patrimonioToEdit.anoModelo || ""}
                              onChange={(e) => setPatrimonioToEdit({ 
                                ...patrimonioToEdit, 
                                anoModelo: e.target.value ? Number(e.target.value) : undefined 
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">KM de Entrega</label>
                            <input
                              type="text"
                              placeholder="KM de Entrega"
                              value={patrimonioToEdit.kmEntrega || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, kmEntrega: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="md:col-span-2 p-8 text-center">
                          <div className="bg-blue-50 p-6 rounded-lg text-blue-600 border border-blue-100">
                            <Package size={32} className="mx-auto mb-3" />
                            <h4 className="text-lg font-semibold mb-2">Dados Específicos</h4>
                            <p className="mb-4">
                              Esta etapa contém campos específicos para veículos.
                              <br />
                              Como você selecionou <strong>{patrimonioToEdit.tipo || "outro tipo"}</strong>, não são necessários campos adicionais.
                            </p>
                            <button 
                              type="button"
                              onClick={() => setActiveStep(4)}
                              className="px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Prosseguir para a próxima etapa
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Etapa 4 - Seguro e Locação */}
                  {activeStep === 4 && (
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Locado */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Locado</label>
                          <div className="flex items-center space-x-6">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="locado"
                                value="true"
                                checked={patrimonioToEdit.locado === true}
                                onChange={() => setPatrimonioToEdit({ ...patrimonioToEdit, locado: true })}
                                className="form-radio h-4 w-4 text-[#344893] focus:ring-[#344893] border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Sim</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="locado"
                                value="false"
                                checked={patrimonioToEdit.locado === false}
                                onChange={() => setPatrimonioToEdit({ ...patrimonioToEdit, locado: false })}
                                className="form-radio h-4 w-4 text-[#344893] focus:ring-[#344893] border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Não</span>
                            </label>
                          </div>
                        </div>

                        {/* Franquia - só aparece se locado for true */}
                        {patrimonioToEdit.locado && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Franquia</label>
                            <input
                              type="text"
                              placeholder="Franquia"
                              value={patrimonioToEdit.franquia || ""}
                              onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, franquia: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                            />
                          </div>
                        )}

                        {/* Segurado */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Segurado</label>
                          <div className="flex items-center space-x-6">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="segurado"
                                value="true"
                                checked={patrimonioToEdit.segurado === true}
                                onChange={() => setPatrimonioToEdit({ ...patrimonioToEdit, segurado: true })}
                                className="form-radio h-4 w-4 text-[#344893] focus:ring-[#344893] border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Sim</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="segurado"
                                value="false"
                                checked={patrimonioToEdit.segurado === false}
                                onChange={() => setPatrimonioToEdit({ ...patrimonioToEdit, segurado: false })}
                                className="form-radio h-4 w-4 text-[#344893] focus:ring-[#344893] border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Não</span>
                            </label>
                          </div>
                        </div>

                        {/* Campos adicionais de seguro - aparecem apenas se segurado for true */}
                        {patrimonioToEdit.segurado && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Seguradora</label>
                              <input
                                type="text"
                                placeholder="Seguradora"
                                value={patrimonioToEdit.seguradora || ""}
                                onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, seguradora: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento do Seguro</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Calendar size={16} className="text-gray-400" />
                                </div>
                                <input
                                  type="date"
                                  value={patrimonioToEdit.dataVencimentoSeguro || ""}
                                  onChange={(e) => setPatrimonioToEdit({ ...patrimonioToEdit, dataVencimentoSeguro: e.target.value })}
                                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] transition-colors"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </form>

                {/* Botões de navegação e indicação de campos obrigatórios */}
                <div className="mt-8 pt-4 border-t border-gray-200">
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
                      {activeStep > 1 && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                        >
                          <ArrowLeft size={16} className="mr-2" />
                          Voltar
                        </button>
                      )}
                      
                      {/* Botão Próximo - não aparece na última etapa */}
                      {activeStep < totalSteps && (
                        <button
                          type="button"
                          onClick={nextStep}
                          className="px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          Próximo
                          <ArrowRight size={16} className="ml-2" />
                        </button>
                      )}
                      
                      {/* Botão Finalizar - só aparece na última etapa */}
                      {activeStep === totalSteps && (
                        <button
                          type="button"
                          onClick={isEditModalOpen ? handleUpdatePatrimonio : handleCreatePatrimonio}
                          className="px-5 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <Check size={18} className="mr-2" />
                          {isEditModalOpen ? 'Salvar Alterações' : 'Cadastrar Patrimônio'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal para Ver Movimentações */}
        {isMovimentacoesModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Histórico de Movimentações</h2>
                  <button 
                    onClick={() => setIsMovimentacoesModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                {movimentacoes.map((mov) => (
                  <div key={mov.id} className="mb-8">
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded shadow">
                        <p className="text-sm font-medium text-gray-500">Patrimônio</p>
                        <p className="text-lg font-semibold">{mov.patrimonioNome}</p>
                      </div>
                      
                      <div className="bg-white p-4 rounded shadow">
                        <p className="text-sm font-medium text-gray-500">Responsável Atual</p>
                        <p className="text-lg font-semibold">
                          {mov.responsavelAtual 
                            ? `${mov.responsavelAtual.nome} ${mov.responsavelAtual.sobrenome}`
                            : "Não atribuído"}
                        </p>
                      </div>
                      
                      <div className="bg-white p-4 rounded shadow">
                        <p className="text-sm font-medium text-gray-500">Localização Atual</p>
                        <p className="text-lg font-semibold">{mov.localizacaoAtual}</p>
                      </div>
                      
                      {/* KM de Entrega */}
                      {mov.kmAtual && (
                        <div className="bg-white p-4 rounded shadow">
                          <p className="text-sm font-medium text-gray-500">KM Atual</p>
                          <p className="text-lg font-semibold">{mov.kmAtual}</p>
                        </div>
                      )}
                    </div>

                    {/* Histórico de Alterações */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold mb-3">Histórico de Alterações</h4>
                      {mov.historico?.map((evento) => (
                        <div key={evento.id} className="border-l-4 border-[#344893] pl-4 py-3 bg-gray-50 mb-4">
                          <p className="text-sm text-gray-600">
                            {formatDateTime(evento.data)}
                          </p>
                          
                          {/* Adicione a visualização de alteração de KM */}
                          {evento.tipo === "ALTERACAO_KM" && (
                            <div className="mt-2">
                              <p className="font-medium">Alteração de Quilometragem:</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-gray-600">
                                  KM Anterior: {evento.kmAnterior || "-"}
                                </span>
                                <span className="text-gray-400 mx-2">→</span>
                                <span className="text-gray-600">
                                  Novo KM: {evento.kmNovo || "-"}
                                </span>
                              </div>
                            </div>
                          )}

                          {evento.tipo === 'ALTERACAO_RESPONSAVEL' && evento.responsavelAnterior && (
                            <div className="mt-2">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-600 mr-2">De:</span>
                                <span>{`${evento.responsavelAnterior.nome} ${evento.responsavelAnterior.sobrenome}`}</span>
                              </div>
                              {evento.responsavelNovo && (
                                <div className="flex items-center mt-1">
                                  <span className="font-medium text-gray-600 mr-2">Para:</span>
                                  <span>{`${evento.responsavelNovo.nome} ${evento.responsavelNovo.sobrenome}`}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {evento.tipo === 'ALTERACAO_LOCALIZACAO' && evento.localizacaoAnterior && (
                            <div className="mt-2">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-600 mr-2">De:</span>
                                <span>{evento.localizacaoAnterior}</span>
                              </div>
                              {evento.localizacaoNova && (
                                <div className="flex items-center mt-1">
                                  <span className="font-medium text-gray-600 mr-2">Para:</span>
                                  <span>{evento.localizacaoNova}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {mov.historico?.length === 0 && (
                        <p className="text-center text-gray-500 py-4">
                          Nenhuma movimentação registrada
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação para Ocultar Patrimônio */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4">Confirmar Excluir Patrimônio</h3>
              <p>Você tem certeza que deseja excluir este patrimônio?</p>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors mr-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmToggleOcultar}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de exportação */}
        {isExportModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-600 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-3">Gerando relatório</h3>
              <p className="text-gray-600 mb-3">Preparando {filteredPatrimonios.length} registros para exportação...</p>
              <p className="text-gray-500 text-sm">O arquivo será salvo automaticamente quando estiver pronto.</p>
            </div>
          </div>
        )}

        {/* Modal de Detalhes do Patrimônio */}
        {selectedPatrimonio && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-y-auto max-h-[90vh] relative"
            >
              {/* Cabeçalho */}
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${
                    selectedPatrimonio.tipo === 'Veículo' ? 'bg-blue-100 text-blue-600' :
                    selectedPatrimonio.tipo === 'Celular' ? 'bg-green-100 text-green-600' :
                    selectedPatrimonio.tipo === 'Móveis' ? 'bg-amber-100 text-amber-600' :
                    selectedPatrimonio.tipo === 'Informática' ? 'bg-purple-100 text-purple-600' :
                    selectedPatrimonio.tipo === 'Peça' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <TipoIcon tipo={selectedPatrimonio.tipo} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedPatrimonio.nome}</h3>
                    <p className="text-sm text-gray-500">{selectedPatrimonio.tipo} • ID: {selectedPatrimonio.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPatrimonio(null)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Status e badges importantes */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center ${
                  selectedPatrimonio.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                  selectedPatrimonio.status === 'Em manutenção' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedPatrimonio.status === 'Ativo' && <CheckCircle size={12} className="mr-1" />}
                  {selectedPatrimonio.status === 'Em manutenção' && <AlertCircle size={12} className="mr-1" />}
                  {selectedPatrimonio.status !== 'Ativo' && selectedPatrimonio.status !== 'Em manutenção' && <X size={12} className="mr-1" />}
                  {selectedPatrimonio.status}
                </span>
                
                {selectedPatrimonio.locado && (
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full flex items-center">
                    <ArrowUpRight size={12} className="mr-1" />
                    Locado
                  </span>
                )}
                
                {selectedPatrimonio.segurado && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center">
                    <FileSpreadsheet size={12} className="mr-1" />
                    Segurado
                  </span>
                )}

                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => handleViewMovimentacoes(selectedPatrimonio.id)}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full flex items-center"
                    title="Ver histórico de movimentações"
                  >
                    <History size={12} className="mr-1" /> Histórico
                  </button>
                </div>
              </div>

              {/* Descrição do item */}
              <div className="mb-5 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Descrição</p>
                <p className="text-sm text-gray-800">{selectedPatrimonio.descricao}</p>
              </div>

              {/* Informações detalhadas organizadas em seções */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-5">
                <div className="space-y-4">
                  <div className="border-b border-gray-100 mb-2">
                    <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider pb-1">
                      Informações Básicas
                    </h4>
                  </div>
                  
                  {/* Cartões para informações básicas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Data de Aquisição</p>
                      <p className="text-sm font-medium text-gray-800">{formatDate(selectedPatrimonio.data_aquisicao)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Valor</p>
                      <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.valor}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Fabricante</p>
                    <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.fabricante}</p>
                  </div>
                  
                  {selectedPatrimonio.modelo && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Modelo</p>
                      <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.modelo}</p>
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Localização</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center">
                      <MapPin size={14} className="mr-1 text-gray-500" />
                      {selectedPatrimonio.localizacao}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Responsável</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center">
                      <User size={14} className="mr-1 text-gray-500" />
                      {colaboradores.find(c => c.id === selectedPatrimonio.responsavelId)?.nome || 'N/A'} {' '}
                      {colaboradores.find(c => c.id === selectedPatrimonio.responsavelId)?.sobrenome || ''}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border-b border-gray-100 mb-2">
                    <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider pb-1">
                      Informações Adicionais
                    </h4>
                  </div>
                  
                  {/* Nota Fiscal e Garantia agrupados */}
                  {(selectedPatrimonio.numeroNotaFiscal || selectedPatrimonio.dataNotaFiscal || selectedPatrimonio.dataGarantia) && (
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      {selectedPatrimonio.numeroNotaFiscal && (
                        <div>
                          <p className="text-xs text-gray-500">Nota Fiscal</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center">
                            <FileText size={14} className="mr-1 text-gray-500" />
                            {selectedPatrimonio.numeroNotaFiscal}
                          </p>
                        </div>
                      )}
                      
                      {selectedPatrimonio.dataNotaFiscal && (
                        <div>
                          <p className="text-xs text-gray-500">Data da Nota</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center">
                            <Calendar size={14} className="mr-1 text-gray-500" />
                            {formatDate(selectedPatrimonio.dataNotaFiscal)}
                          </p>
                        </div>
                      )}
                      
                      {selectedPatrimonio.dataGarantia && (
                        <div>
                          <p className="text-xs text-gray-500">Garantia até</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center">
                            <CalendarClock size={14} className="mr-1 text-gray-500" />
                            {formatDate(selectedPatrimonio.dataGarantia)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Informações específicas para veículos */}
                  {selectedPatrimonio.tipo === "Veículo" && (
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <h5 className="text-xs font-medium text-gray-700">Informações do Veículo</h5>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPatrimonio.placa && (
                          <div>
                            <p className="text-xs text-gray-500">Placa</p>
                            <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.placa}</p>
                          </div>
                        )}
                        
                        {selectedPatrimonio.renavan && (
                          <div>
                            <p className="text-xs text-gray-500">Renavan</p>
                            <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.renavan}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPatrimonio.anoModelo && (
                          <div>
                            <p className="text-xs text-gray-500">Ano/Modelo</p>
                            <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.anoModelo}</p>
                          </div>
                        )}
                        
                        {selectedPatrimonio.kmEntrega && (
                          <div>
                            <p className="text-xs text-gray-500">KM de Entrega</p>
                            <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.kmEntrega}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Seção de Número de Série/Chassi se existir */}
                  {selectedPatrimonio.numeroSerie && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Número de Série/Chassi</p>
                      <p className="text-sm font-medium text-gray-800">{selectedPatrimonio.numeroSerie}</p>
                    </div>
                  )}

                  {/* Informações de seguro */}
                  {selectedPatrimonio.segurado && (
                    <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                      <h5 className="text-xs font-medium text-blue-700 flex items-center">
                        <FileSpreadsheet size={14} className="mr-1" />
                        Informações do Seguro
                      </h5>
                      
                      {selectedPatrimonio.seguradora && (
                        <div>
                          <p className="text-xs text-blue-700">Seguradora</p>
                          <p className="text-sm font-medium text-blue-900">{selectedPatrimonio.seguradora}</p>
                        </div>
                      )}
                      
                      {selectedPatrimonio.dataVencimentoSeguro && (
                        <div>
                          <p className="text-xs text-blue-700">Vencimento do Seguro</p>
                          <p className="text-sm font-medium text-blue-900">{formatDate(selectedPatrimonio.dataVencimentoSeguro)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Informações de locação */}
                  {selectedPatrimonio.locado && (
                    <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                      <h5 className="text-xs font-medium text-purple-700 flex items-center">
                        <ArrowUpRight size={14} className="mr-1" />
                        Informações de Locação
                      </h5>
                      
                      {selectedPatrimonio.proprietario && (
                        <div>
                          <p className="text-xs text-purple-700">Proprietário</p>
                          <p className="text-sm font-medium text-purple-900">{selectedPatrimonio.proprietario}</p>
                        </div>
                      )}
                      
                      {selectedPatrimonio.franquia && (
                        <div>
                          <p className="text-xs text-purple-700">Franquia</p>
                          <p className="text-sm font-medium text-purple-900">{selectedPatrimonio.franquia}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de ação - Reformulados */}
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedPatrimonio(null); // Fecha o modal de detalhes
                    handleEditPatrimonio(selectedPatrimonio); // Abre o modal de edição
                  }}
                  className="flex items-center px-4 py-2 mr-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Edit size={16} className="mr-2" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    handleGenerateDoc(selectedPatrimonio.id);
                    setSelectedPatrimonio(null);
                  }}
                  className="flex items-center px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileSpreadsheet size={16} className="mr-2" />
                  Gerar Termo de Responsabilidade
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Aviso de número de série/chassi duplicado */}
        {showSerialWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4"
            >
              <div className="flex items-center mb-4 text-amber-500">
                <AlertTriangle size={24} className="mr-2" />
                <h3 className="text-lg font-semibold">Número já cadastrado</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                O {patrimonioToEdit.tipo === 'Veículo' ? 'chassi' : 'número de série'} informado já está cadastrado em outro patrimônio. Deseja continuar mesmo assim?
              </p>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => {
                    setShowSerialWarning(false);
                    // Opcional: limpar o campo de número de série
                    setPatrimonioToEdit({
                      ...patrimonioToEdit,
                      numeroSerie: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Alterar número
                </button>
                <button 
                  onClick={() => {
                    setShowSerialWarning(false);
                    setConfirmedDuplicate(true);
                    // Continua com o número duplicado
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  Continuar mesmo assim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
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
    </ProtectedRoute>
  );
}
