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
import { 
  PlusCircle, DollarSign, Search, ArrowDownCircle, ArrowUpCircle, 
  ChevronDown, ChevronUp, Calendar, X, Check, Filter as FilterIcon,
  User, Building, RefreshCw, Download, Clock, FileText, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ProtectedRoute from '../components/ProtectedRoute';

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
  saldo: number; // Calculado no frontend
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
  nome: string;
}

interface Colaborador {
  id: number;
  nome: string;
  sobrenome?: string;
  cargo?: string;
  setor?: string;
}

interface DecodedToken {
  id: string;
  email: string;
  role?: string;
}

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

export default function ContaCorrentePage() {
  const router = useRouter();
  const [contasCorrente, setContasCorrente] = useState<ContaCorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados para dados auxiliares
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Estados para filtragem e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  
  // Estados para modais
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaCorrente | null>(null);

  // Verificar autenticação
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      router.push("/login");
      return;
    }
    
    setToken(token);
    
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setUserId(user.id);
      setIsAdmin(user.role === "ADMIN");
      
      if (user.id) {
        fetchMinhasContas(token, user.id);
        fetchDadosAuxiliares(token);
      }
    } catch (error) {
      console.error("Erro ao obter dados do usuário:", error);
      router.push("/login");
    }
  }, [router]);

  // Buscar contas do usuário
  const fetchMinhasContas = async (authToken: string, userID: string) => {
    try {
      setLoading(true);
      const url = `/api/contacorrente?userId=${userID}&showHidden=${showHidden}`;
      
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
      console.log("Resposta da API contasCorrente:", data);
      
      // Usar a função auxiliar para garantir que teremos um array
      const contasArray = ensureArray<ContaCorrente>(data);
      setContasCorrente(contasArray);
      
      if (!Array.isArray(data)) {
        console.warn("API retornou formato inesperado - convertido para array:", data);
      }
    } catch (error) {
      console.error("Erro ao buscar contas corrente:", error);
      toast.error("Erro ao buscar suas contas corrente");
      setContasCorrente([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados auxiliares (empresas, colaboradores)
  const fetchDadosAuxiliares = async (authToken: string) => {
    try {
      const empresasPromise = fetch("/api/empresas", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const colaboradoresPromise = fetch("/api/colaboradores", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const usuariosPromise = fetch("/api/usuarios", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const [empresasResponse, colaboradoresResponse, usuariosResponse] = 
        await Promise.all([empresasPromise, colaboradoresPromise, usuariosPromise]);
      
      if (empresasResponse.ok) {
        const empresasData = await empresasResponse.json();
        setEmpresas(empresasData);
      }
      
      if (colaboradoresResponse.ok) {
        const colaboradoresData = await colaboradoresResponse.json();
        setColaboradores(colaboradoresData);
      }
      
      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json();
        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error("Erro ao buscar dados auxiliares:", error);
    }
  };

  // Atualizar quando o filtro de ocultos mudar
  useEffect(() => {
    if (token && userId) {
      fetchMinhasContas(token, userId);
    }
  }, [showHidden, token, userId]);

  // Função para criar uma conta corrente
  const handleCreateConta = async (formData: any) => {
    setLoadingAction(true);
    
    try {
      // Garantir que a conta seja criada para o usuário logado
      const payload = {
        ...formData,
        userId: userId,
        data: new Date().toISOString() // Campo data obrigatório
      };
      
      const response = await fetch("/api/contacorrente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Erro ao criar conta corrente");
      }
      
      // Recarregar contas
      fetchMinhasContas(token!, userId!);
      
      setIsContaModalOpen(false);
      toast.success("Conta corrente criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar conta corrente:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar conta corrente");
    } finally {
      setLoadingAction(false);
    }
  };

  // Função para adicionar lançamento
  const handleAddLancamento = async (formData: any) => {
    setLoadingAction(true);
    
    try {
      const payload = {
        contaCorrenteId: contaSelecionada?.id,
        data: formData.data,
        numeroDocumento: formData.numeroDocumento,
        observacao: formData.observacao,
        credito: formData.tipo === 'CREDITO' ? formData.valor : null,
        debito: formData.tipo === 'DEBITO' ? formData.valor : null
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
        throw new Error(errorData.error || "Erro ao adicionar lançamento");
      }
      
      // Recarregar contas
      fetchMinhasContas(token!, userId!);
      
      setIsLancamentoModalOpen(false);
      toast.success("Lançamento adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar lançamento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar lançamento");
    } finally {
      setLoadingAction(false);
    }
  };

  // Ver detalhes de uma conta
  const handleVerDetalhes = (conta: ContaCorrente) => {
    setContaSelecionada(conta);
    setIsDetalhesModalOpen(true);
  };

  // Editar conta
  const handleEditarConta = () => {
    setIsDetalhesModalOpen(false);
    setIsContaModalOpen(true);
  };

  // Filtrar contas pelo termo de busca
  const filteredContas = (Array.isArray(contasCorrente) ? contasCorrente : []).filter(conta => 
    (conta?.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (conta?.fornecedorCliente?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (conta?.setor?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (conta?.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow p-4 md:p-6 lg:p-8 mt-20 max-w-7xl mx-auto w-full">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Minhas Contas Corrente
              </h1>
              <p className="text-gray-600">
                Gerencie suas contas corrente e lançamentos
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setContaSelecionada(null);
                  setIsContaModalOpen(true);
                }}
                className="inline-flex items-center justify-center px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <PlusCircle size={18} className="mr-2" />
                Nova Conta
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Filtros e busca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por descrição, fornecedor, setor..."
                  className="pl-10 pr-3 py-2 block w-full rounded-md border-gray-300 border focus:ring-[#344893] focus:border-[#344893]"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                    showHidden ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {showHidden ? 'Ocultar arquivadas' : 'Mostrar arquivadas'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lista de contas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow-sm">
              <Loader2 size={40} className="animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Carregando suas contas...</span>
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
                {searchTerm ? "Nenhum resultado para sua busca." : 
                  showHidden ? "Você não possui nenhuma conta corrente." : 
                  "Você não possui contas corrente ativas."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setContaSelecionada(null);
                    setIsContaModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#344893] hover:bg-blue-700"
                >
                  <PlusCircle size={16} className="mr-1" />
                  Criar Nova Conta
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContas.map(conta => (
                <ContaCorrenteCard
                  key={conta.id}
                  conta={conta}
                  onViewDetails={() => handleVerDetalhes(conta)}
                  onToggleVisibility={() => {
                    // Implementar toggle de visibilidade aqui
                    toast.info("Funcionalidade em desenvolvimento");
                  }}
                  canEdit={true} // Usuário sempre pode editar suas próprias contas
                />
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Modal para criar/editar conta corrente */}
      {isContaModalOpen && (
        <ContaCorrenteModal
          isOpen={isContaModalOpen}
          onClose={() => setIsContaModalOpen(false)}
          onSave={handleCreateConta}
          initialData={contaSelecionada}
          empresas={Array.isArray(empresas) ? empresas : []}
          colaboradores={Array.isArray(colaboradores) ? colaboradores : []}
          usuarios={Array.isArray(usuarios) ? usuarios : []}
          isLoading={loadingAction}
        />
      )}

      {/* Modal para detalhes da conta */}
      {isDetalhesModalOpen && contaSelecionada && (
        <ContaCorrenteDetalhesModal
          conta={contaSelecionada}
          onClose={() => setIsDetalhesModalOpen(false)}
          onEdit={handleEditarConta}
        />
      )}

      {/* Você pode adicionar um modal para lançamentos, se necessário */}

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
      />
    </div>
  );
}