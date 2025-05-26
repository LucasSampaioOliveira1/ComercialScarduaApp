import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Calendar, DollarSign, Map, Building, User, Loader2, AlertTriangle, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';

// Função para obter a data atual no formato YYYY-MM-DD
const getLocalISODate = () => {
  const now = new Date();
  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0];
};

// Função para preservar a data local
const preserveLocalDate = (dateString?: string): string => {
  if (!dateString) return getLocalISODate();
  
  // Se já estiver no formato YYYY-MM-DD, retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  try {
    // Se for um ISO string com timestamp (formato que vem do banco)
    if (dateString.includes('T')) {
      const [datePart] = dateString.split('T');
      return datePart;
    }
    
    // Para outros formatos, converter usando uma data local
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Erro ao preservar data local:", e);
    return getLocalISODate();
  }
};

// Tipos e interfaces
interface LancamentoViagem {
  id?: number;
  caixaViagemId?: number;
  data: string;
  custo: string;
  clienteFornecedor: string;
  numeroDocumento: string; // Corrigido para usar o nome do schema
  historicoDoc: string;    // Corrigido para usar o nome do schema
  entrada?: string | number | null;
  saida?: string | number | null;
}

interface Empresa {
  id: number;
  nome?: string;
  nomeEmpresa?: string;
}

interface Funcionario {
  id: number;
  nome: string;
  sobrenome?: string;
}

interface Veiculo {
  id: number;
  nome?: string; // Adicionando nome como propriedade opcional
  placa?: string;
  modelo?: string;
  descricao?: string;
}

interface Usuario {
  id: string;
  nome: string;
  sobrenome?: string;
  email: string;
}

interface CaixaViagem {
  id?: number;
  userId: string;
  empresaId?: number | null;
  funcionarioId?: number | null;
  veiculoId?: number | null;
  destino: string;
  observacao?: string;
  data: string;
  numeroCaixa?: number; // Novo campo para número sequencial
  saldoAnterior?: number; // Novo campo para saldo do caixa anterior
  oculto: boolean;
  lancamentos: LancamentoViagem[];
  user?: Usuario;
  empresa?: Empresa;
  funcionario?: Funcionario;
}

interface CaixaViagemSaveData {
  caixaViagem: CaixaViagem;
  lancamentos: LancamentoViagem[];
}

interface CaixaViagemModalAdminProps {
  isOpen: boolean;
  onClose: () => void;
  caixa?: CaixaViagem | null;
  isEdit?: boolean;
  onSave: (dados: CaixaViagemSaveData) => void;
  empresas: Empresa[];
  funcionarios: Funcionario[];
  veiculos: Veiculo[]; // Adicionado veículos da tabela patrimônio
  usuarios: Usuario[];
  isLoading: boolean;
}

const CaixaViagemModalAdmin: React.FC<CaixaViagemModalAdminProps> = ({
  isOpen,
  onClose,
  caixa = null,
  isEdit = false,
  onSave,
  empresas = [],
  funcionarios = [],
  veiculos = [], // Nova prop para veículos
  usuarios = [],
  isLoading = false
}) => {
  // Estado para o formulário principal
  const [caixaData, setCaixaData] = useState<Partial<CaixaViagem>>({
    id: undefined,
    userId: '',
    empresaId: null,
    funcionarioId: null,
    veiculoId: null,
    destino: '',
    observacao: '',
    data: getLocalISODate(),
    numeroCaixa: 1, // Valor padrão inicial
    saldoAnterior: 0, // Valor padrão inicial
    oculto: false
  });

  // Estado para os lançamentos
  const [lancamentos, setLancamentos] = useState<LancamentoViagem[]>([
    {
      id: undefined,
      data: getLocalISODate(),
      custo: '',
      clienteFornecedor: '',
      numeroDocumento: '',
      historicoDoc: '',
      entrada: '',
      saida: ''
    }
  ]);

  // Estado para modal de confirmação de exclusão de lançamento
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<number | null>(null);

  // Efeito para carregar dados ao abrir para edição
  useEffect(() => {
    // Se não estiver em modo de edição OU se o modal foi fechado, limpar os dados
    if (!isEdit || !isOpen) {
      setCaixaData({
        id: undefined,
        userId: '',
        empresaId: null,
        funcionarioId: null,
        veiculoId: null,
        destino: '',
        observacao: '',
        data: getLocalISODate(),
        numeroCaixa: 1, // Valor padrão inicial
        saldoAnterior: 0, // Valor padrão inicial
        oculto: false
      });
      
      setLancamentos([{
        id: undefined,
        data: getLocalISODate(),
        custo: '',
        clienteFornecedor: '',
        numeroDocumento: '',
        historicoDoc: '',
        entrada: '',
        saida: ''
      }]);
      
      return;
    }
    
    if (isEdit && caixa) {
      setCaixaData({
        id: caixa.id,
        userId: caixa.userId || '',
        empresaId: caixa.empresaId,
        funcionarioId: caixa.funcionarioId,
        veiculoId: caixa.veiculoId,
        destino: caixa.destino || '',
        observacao: caixa.observacao || '',
        data: preserveLocalDate(caixa.data),
        numeroCaixa: caixa.numeroCaixa || 1, // Carregar número do caixa
        saldoAnterior: caixa.saldoAnterior || 0, // Carregar saldo anterior
        oculto: caixa.oculto || false
      });

      // Carregar lançamentos se existirem
      if (caixa.lancamentos && caixa.lancamentos.length > 0) {
        const lancamentosFormatados = caixa.lancamentos.map(l => {
          return {
            id: l.id,
            data: preserveLocalDate(l.data),
            numeroDocumento: l.numeroDocumento || '', // Usando o nome do schema
            historicoDoc: l.historicoDoc || '',       // Usando o nome do schema
            custo: l.custo || '',
            clienteFornecedor: l.clienteFornecedor || '',
            entrada: l.entrada ? formatCurrency(parseFloat(String(l.entrada))) : '',
            saida: l.saida ? formatCurrency(parseFloat(String(l.saida))) : ''
          };
        });
        
        setLancamentos(lancamentosFormatados);
      } else {
        // Se não houver lançamentos, criar um vazio
        setLancamentos([{
          id: undefined,
          data: getLocalISODate(),
          custo: '',
          clienteFornecedor: '',
          numeroDocumento: '',
          historicoDoc: '',
          entrada: '',
          saida: ''
        }]);
      }
    }
  }, [caixa, isEdit, isOpen]);

  // Adicionar função para buscar o último caixa do funcionário
  const buscarUltimoCaixaFuncionario = async (funcionarioId: number) => {
    try {
      if (!funcionarioId) return;
      
      // Não buscar se já estamos editando um caixa existente
      if (isEdit && caixa?.id) return;
      
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Token de autenticação não encontrado");
        return;
      }
      
      // Adicionar tratamento de erro e feedback visual
      toast.info("Buscando informações do último caixa...", {
        autoClose: 2000
      });
      
      const response = await fetch(`/api/caixaviagem/ultimo-caixa/${funcionarioId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(`Erro ${response.status} ao buscar último caixa:`, errorData);
        toast.error(`Erro ao buscar dados do último caixa: ${errorData?.error || response.statusText}`);
        return;
      }
      
      const data = await response.json();
      
      // Atualizar caixaData com as informações recebidas
      setCaixaData(prev => ({
        ...prev,
        numeroCaixa: data.proximoNumero,
        saldoAnterior: data.saldoAnterior
      }));
      
      // Se for o primeiro caixa (proximoNumero === 1), mostrar toast informativo
      if (data.proximoNumero === 1) {
        toast.info(`Este será o primeiro caixa de ${data.funcionario?.nome || 'este funcionário'}.`);
      } else {
        // Mostrar toast com informações do último caixa
        toast.info(
          `Caixa anterior: #${data.ultimoCaixa.numeroCaixa} | Saldo: ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(data.saldoAnterior)}`
        );
      }
    } catch (error) {
      console.error("Erro ao buscar último caixa:", error);
      toast.error("Falha ao obter informações do último caixa");
    }
  };

  // Função para ressetar informações de sequência ao mudar o funcionário durante edição
  const resetSequenceInfo = () => {
    setCaixaData(prev => ({
      ...prev,
      numeroCaixa: undefined,
      saldoAnterior: 0
    }));
  };

  // Handlers para atualização de campos
  const handleCaixaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'oculto') {
      setCaixaData(prev => ({ 
        ...prev, 
        [name]: (e.target as HTMLInputElement).checked 
      }));
    } else if (name === 'empresaId' || name === 'funcionarioId' || name === 'veiculoId') {
      const numeroValor = value ? parseInt(value) : null;
      setCaixaData(prev => ({ 
        ...prev, 
        [name]: numeroValor
      }));
      
      // Se o campo for funcionarioId e tiver valor, buscar último caixa
      if (name === 'funcionarioId' && numeroValor) {
        if (isEdit && caixa?.funcionarioId !== numeroValor) {
          // Funcionário mudou durante uma edição, confirmar com o usuário
          if (window.confirm("Ao mudar o funcionário, as informações de sequência do caixa serão recalculadas. Deseja continuar?")) {
            resetSequenceInfo();
            buscarUltimoCaixaFuncionario(numeroValor);
          } else {
            // Reverter para o funcionário original
            return setCaixaData(prev => ({
              ...prev,
              funcionarioId: caixa?.funcionarioId || null
            }));
          }
        } else {
          // Caso normal - buscar último caixa do funcionário selecionado
          buscarUltimoCaixaFuncionario(numeroValor);
        }
      }
    } else {
      setCaixaData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Atualizar um lançamento
  const atualizarLinha = (index: number, campo: string, valor: string) => {
    const novasLinhas = [...lancamentos];
    
    novasLinhas[index] = {
      ...novasLinhas[index],
      [campo]: valor
    };
    
    setLancamentos(novasLinhas);
  };

  // Formatar campo de valor ao perder foco
  const formatarAoPerderFoco = (index: number, campo: string) => {
    if (campo !== 'entrada' && campo !== 'saida') return;
    
    const valor = lancamentos[index][campo as keyof LancamentoViagem];
    
    if (!valor || typeof valor !== 'string' || valor.trim() === '') return;
    
    try {
      // Limpar formatação
      let valorLimpo = valor.replace(/[^\d.,]/g, '');
      valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
      
      const numero = parseFloat(valorLimpo);
      
      if (isNaN(numero)) return;
      
      // Formatar para moeda brasileira
      const valorFormatado = numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const novasLinhas = [...lancamentos];
      novasLinhas[index] = { 
        ...novasLinhas[index], 
        [campo]: valorFormatado
      };
      
      setLancamentos(novasLinhas);
    } catch (error) {
      console.error('Erro ao formatar valor:', error);
    }
  };

  // Função para criar um novo lançamento vazio
  const adicionarLancamento = () => {
    setLancamentos([...lancamentos, {
      id: undefined,
      data: getLocalISODate(),
      custo: '',
      clienteFornecedor: '',
      numeroDocumento: '', // Usando o nome do campo do schema
      historicoDoc: '',    // Usando o nome do campo do schema
      entrada: '',
      saida: ''
    }]);
  };

  // Função para abrir o modal de confirmação de exclusão
  const removerLancamento = (index: number) => {
    if (lancamentos.length <= 1) return; // Manter pelo menos um lançamento
    setLancamentoParaExcluir(index);
    setIsDeleteModalOpen(true);
  };

  // Função para confirmar a exclusão do lançamento
  const confirmarExclusaoLancamento = () => {
    if (lancamentoParaExcluir === null) return;
    
    const updatedLancamentos = lancamentos.filter((_, i) => i !== lancamentoParaExcluir);
    
    // Se não sobrou nenhum lançamento, adicionar um vazio
    if (updatedLancamentos.length === 0) {
      updatedLancamentos.push({
        id: undefined,
        data: getLocalISODate(),
        custo: '',
        clienteFornecedor: '',
        numeroDocumento: '',
        historicoDoc: '',
        entrada: '',
        saida: ''
      });
    }
    
    setLancamentos(updatedLancamentos);
    setIsDeleteModalOpen(false);
    setLancamentoParaExcluir(null);
  };

  // Função para converter valor para API (string para número)
  const formatarValorParaAPI = (valor: string | number | undefined | null): number | null => {
    if (valor === null || valor === undefined || valor === '') return null;
    
    if (typeof valor === 'number') return valor;
    
    // Se for string, limpar formatação
    let valorLimpo = valor.replace(/[R$\s]/g, '');
    
    // Substituir vírgula por ponto
    valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
    
    // Converter para número ou retornar null
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? null : numero;
  };

  // Calcular totais
  const calcularTotalEntradas = () => {
    return lancamentos.reduce((total, lancamento) => {
      if (!lancamento.entrada || (typeof lancamento.entrada === 'string' && lancamento.entrada.trim() === '')) {
        return total;
      }
      
      const valorNumerico = formatarValorParaAPI(lancamento.entrada);
      return total + (valorNumerico || 0);
    }, 0);
  };

  const calcularTotalSaidas = () => {
    return lancamentos.reduce((total, lancamento) => {
      if (!lancamento.saida || (typeof lancamento.saida === 'string' && lancamento.saida.trim() === '')) {
        return total;
      }
      
      const valorNumerico = formatarValorParaAPI(lancamento.saida);
      return total + (valorNumerico || 0);
    }, 0);
  };

  // Modificar a função de cálculo de saldo para incluir o saldo anterior
  const calcularSaldo = () => {
    const saldoAnterior = caixaData.saldoAnterior || 0;
    const totalEntradas = calcularTotalEntradas();
    const totalSaidas = calcularTotalSaidas();
    
    return saldoAnterior + totalEntradas - totalSaidas;
  };

  // Formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Handler para salvar os dados
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!caixaData.userId) {
      toast.error("Por favor, selecione um usuário.");
      return;
    }
    
    if (!caixaData.empresaId) {
      toast.error("Por favor, selecione uma empresa.");
      return;
    }
    
    if (!caixaData.funcionarioId) {
      toast.error("Por favor, selecione um funcionário.");
      return;
    }
    
    if (!caixaData.destino) {
      toast.error("Por favor, informe o destino.");
      return;
    }
    
    // Validar se há lançamentos válidos
    const lancamentosValidos = lancamentos.filter(l => {
      const temEntrada = l.entrada && 
        (typeof l.entrada === 'number' || 
        (typeof l.entrada === 'string' && l.entrada.trim() !== ''));
        
      const temSaida = l.saida && 
        (typeof l.saida === 'number' || 
        (typeof l.saida === 'string' && l.saida.trim() !== ''));
        
      return temEntrada || temSaida;
    });
    
    if (lancamentosValidos.length === 0) {
      toast.error("É necessário adicionar pelo menos um lançamento com valor de entrada ou saída.");
      return;
    }
    
    // Processar lançamentos
    const lancamentosFormatados = lancamentosValidos.map(l => {
      return {
        id: l.id,
        data: l.data,
        custo: l.custo || '',
        clienteFornecedor: l.clienteFornecedor || '',
        numeroDocumento: l.numeroDocumento || '', // Usar nome do schema
        historicoDoc: l.historicoDoc || '',       // Usar nome do schema
        entrada: typeof l.entrada !== 'undefined' ? formatarValorParaAPI(l.entrada) : null,
        saida: typeof l.saida !== 'undefined' ? formatarValorParaAPI(l.saida) : null
      };
    });
    
    // Preparar dados completos
    const dadosCompletos = {
      caixaViagem: {
        id: isEdit && caixa ? caixa.id : undefined,
        userId: caixaData.userId || '',
        empresaId: caixaData.empresaId,
        funcionarioId: caixaData.funcionarioId,
        veiculoId: caixaData.veiculoId,
        destino: caixaData.destino || '',
        observacao: caixaData.observacao || '',
        data: caixaData.data || getLocalISODate(),
        numeroCaixa: caixaData.numeroCaixa || 1, // Número sequencial do caixa
        saldoAnterior: caixaData.saldoAnterior || 0, // Saldo do caixa anterior
        oculto: caixaData.oculto || false,
        lancamentos: lancamentosFormatados
      },
      lancamentos: lancamentosFormatados
    };
    
    // Se por algum motivo não temos o número do caixa, buscar novamente
    if (!caixaData.numeroCaixa && caixaData.funcionarioId) {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await fetch(`/api/caixaviagem/ultimo-caixa/${caixaData.funcionarioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setCaixaData(prev => ({
              ...prev,
              numeroCaixa: data.proximoNumero,
              saldoAnterior: data.saldoAnterior
            }));
          }
        }
      } catch (error) {
        console.error("Erro ao buscar informações de sequência:", error);
      }
    }
    
    // Chamar função de salvamento
    onSave(dadosCompletos);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-3 my-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Cabeçalho do modal com cores claras */}
          <div className="bg-gradient-to-r from-gray-100 to-blue-50 p-3 rounded-t-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {isEdit ? 'Editar Caixa de Viagem' : 'Nova Caixa de Viagem'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 p-1 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Campo de seleção de usuário - exclusivo para o modal admin */}
            <div className="mt-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-xs text-gray-700 mb-1 font-medium">
                SELECIONE O USUÁRIO <span className="text-red-500">*</span>
              </label>
              <select 
                value={caixaData.userId || ''}
                onChange={(e) => handleCaixaChange({ 
                  target: { name: 'userId', value: e.target.value } 
                } as React.ChangeEvent<HTMLSelectElement>)}
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                required
                disabled={isLoading || (isEdit && !!caixa?.id)}
              >
                <option value="">-- Selecione um usuário --</option>
                {Array.isArray(usuarios) && usuarios.map(usuario => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nome} {usuario.sobrenome || ''} - {usuario.email}
                  </option>
                ))}
              </select>
              {isEdit && !!caixa?.id && (
                <p className="text-xs text-blue-600 mt-1">
                  O usuário não pode ser alterado durante a edição.
                </p>
              )}
            </div>
            
            {/* Primeira linha - Empresa e Funcionário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <label htmlFor="empresaId" className="block text-xs text-gray-700 mb-1 font-medium">
                  EMPRESA <span className="text-red-500">*</span>
                </label>
                <select
                  id="empresaId"
                  name="empresaId"
                  value={caixaData.empresaId || ''}
                  onChange={handleCaixaChange}
                  className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  disabled={isLoading}
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome || empresa.nomeEmpresa}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <label htmlFor="funcionarioId" className="block text-xs text-gray-700 mb-1 font-medium">
                  FUNCIONÁRIO <span className="text-red-500">*</span>
                </label>
                <select
                  id="funcionarioId"
                  name="funcionarioId"
                  value={caixaData.funcionarioId || ''}
                  onChange={handleCaixaChange}
                  className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  disabled={isLoading}
                  required
                >
                  <option value="">Selecione um funcionário</option>
                  {funcionarios.map(funcionario => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome} {funcionario.sobrenome || ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Segunda linha - Veículo e Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <label htmlFor="veiculoId" className="block text-xs text-gray-700 mb-1 font-medium">
                  VEÍCULO
                </label>
                <select
                  id="veiculoId"
                  name="veiculoId"
                  value={caixaData.veiculoId || ''}
                  onChange={handleCaixaChange}
                  className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  disabled={isLoading}
                >
                  <option value="">Selecione um veículo</option>
                  {veiculos.map(veiculo => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa ? `${veiculo.placa} - ${veiculo.nome}` : veiculo.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <label htmlFor="destino" className="block text-xs text-gray-700 mb-1 font-medium">
                  DESTINO <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="destino"
                  name="destino"
                  value={caixaData.destino || ''}
                  onChange={handleCaixaChange}
                  required
                  placeholder="Ex: São Paulo, Belo Horizonte, etc."
                  className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* Terceira linha - Data e Observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <label htmlFor="data" className="block text-xs text-gray-700 mb-1 font-medium">
                  DATA <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="data"
                  name="data"
                  value={caixaData.data || ''}
                  onChange={handleCaixaChange}
                  required
                  className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <label htmlFor="observacao" className="block text-xs text-gray-700 mb-1 font-medium">
                  OBSERVAÇÕES
                </label>
                <textarea
                  id="observacao"
                  name="observacao"
                  value={caixaData.observacao || ''}
                  onChange={handleCaixaChange}
                  placeholder="Observações adicionais sobre esta caixa de viagem"
                  rows={1}
                  className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* Opção de ocultar caixa - visível somente na edição */}
            {isEdit && (
              <div className="mt-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="oculto"
                    name="oculto"
                    checked={caixaData.oculto || false}
                    onChange={handleCaixaChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <label htmlFor="oculto" className="ml-2 block text-sm text-gray-700">
                    Ocultar caixa de viagem
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Caixas ocultas não aparecem na listagem principal do usuário.
                </p>
              </div>
            )}
            
            {/* Informações de Saldo */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="text-center p-1.5 bg-blue-50 rounded-lg">
                <span className="block text-xs font-medium text-blue-500">
                  TOTAL ENTRADAS
                </span>
                <span className="text-base font-bold text-green-600">
                  {formatCurrency(calcularTotalEntradas())}
                </span>
              </div>
              <div className="text-center p-1.5 bg-blue-50 rounded-lg">
                <span className="block text-xs font-medium text-blue-500">
                  TOTAL SAÍDAS
                </span>
                <span className="text-base font-bold text-red-600">
                  {formatCurrency(calcularTotalSaidas())}
                </span>
              </div>
              <div className="text-center p-1.5 bg-blue-50 rounded-lg">
                <span className="block text-xs font-medium text-blue-500">
                  SALDO FINAL
                </span>
                <span className={`text-base font-bold ${calcularSaldo() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calcularSaldo())}
                </span>
              </div>
            </div>

            {/* Informações do Caixa de Viagem - Número e Saldo Anterior */}
            {caixaData.numeroCaixa && caixaData.funcionarioId && (
              <div className="bg-gray-50 p-3 mb-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Caixa #{caixaData.numeroCaixa}</span> - 
                  {funcionarios.find(f => f.id === caixaData.funcionarioId)?.nome || 'Funcionário'}
                </div>
                {caixaData.saldoAnterior !== 0 && (
                  <div className="text-sm flex justify-between items-center">
                    <span className="text-gray-600">Saldo anterior:</span>
                    <span className={`font-medium ${(caixaData.saldoAnterior ?? 0) > 0 ? 'text-green-600' : (caixaData.saldoAnterior ?? 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {formatCurrency(caixaData.saldoAnterior ?? 0)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabela de Lançamentos com campos mais largos e sem auto-expansão vertical */}
          <div className="p-3 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Lançamentos</h3>
              <button
                type="button"
                onClick={adicionarLancamento}
                className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                <Plus size={16} className="mr-2" /> Adicionar lançamento
              </button>
            </div>
            
            {/* Tabela com maior largura total para permitir campos maiores */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[1200px]">
                <thead>
                  <tr>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[3%]">
                      #
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                      Data
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Custo
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">
                      Cliente/Fornecedor
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                      Documento
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                      Histórico
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[7%]">
                      Entrada
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[7%]">
                      Saída
                    </th>
                    <th className="border-b-2 border-gray-200 px-2 py-2 w-[3%]"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lancamentos.map((lancamento, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="px-2 py-3">
                        {index + 1}
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="date"
                          value={lancamento.data || ''}
                          onChange={(e) => atualizarLinha(index, 'data', e.target.value)}
                          className="block w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-2 py-3">
                        {/* Campo com maior largura e altura fixa */}
                        <input
                          type="text"
                          value={lancamento.custo}
                          onChange={(e) => atualizarLinha(index, 'custo', e.target.value)}
                          className="block w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Tipo de custo"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-2 py-3">
                        {/* Campo com maior largura e altura fixa */}
                        <input
                          type="text"
                          value={lancamento.clienteFornecedor}
                          onChange={(e) => atualizarLinha(index, 'clienteFornecedor', e.target.value)}
                          className="block w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nome do cliente/fornecedor"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={lancamento.numeroDocumento || ''} // Usando o nome do schema
                          onChange={(e) => atualizarLinha(index, 'numeroDocumento', e.target.value)} // Usando o nome do schema
                          className="block w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nº Doc"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-2 py-3">
                        {/* Campo com maior largura e altura fixa */}
                        <input
                          type="text"
                          value={lancamento.historicoDoc || ''} // Usando o nome do schema
                          onChange={(e) => atualizarLinha(index, 'historicoDoc', e.target.value)} // Usando o nome do schema
                          className="block w-full px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Histórico"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                          <input
                            type="text"
                            value={typeof lancamento.entrada === 'string' || typeof lancamento.entrada === 'number' ? lancamento.entrada : ''}
                            onChange={(e) => atualizarLinha(index, 'entrada', e.target.value)}
                            onBlur={() => formatarAoPerderFoco(index, 'entrada')}
                            className={`block w-full pl-8 pr-2 py-2 text-xs border rounded-md focus:ring-2 focus:outline-none
                              ${(!lancamento.entrada && !lancamento.saida) 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`}
                            placeholder="0,00"
                            disabled={isLoading}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                          <input
                            type="text"
                            value={typeof lancamento.saida === 'string' || typeof lancamento.saida === 'number' ? lancamento.saida : ''}
                            onChange={(e) => atualizarLinha(index, 'saida', e.target.value)}
                            onBlur={() => formatarAoPerderFoco(index, 'saida')}
                            className={`block w-full pl-8 pr-2 py-2 text-xs border rounded-md focus:ring-2 focus:outline-none
                              ${(!lancamento.entrada && !lancamento.saida) 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-red-500 focus:border-red-500'}`}
                            placeholder="0,00"
                            disabled={isLoading}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button 
                          onClick={() => removerLancamento(index)}
                          type="button"
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                          title="Remover lançamento"
                          disabled={isLoading || lancamentos.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-3 text-right font-medium">Totais:</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(calcularTotalEntradas())}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(calcularTotalSaidas())}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="border-t border-gray-200 p-3 flex justify-end bg-gray-50 rounded-b-xl">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 font-medium text-xs rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin mr-2" size={18} />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Check className="mr-2" size={18} />
                    <span>Salvar</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Modal de confirmação de exclusão de lançamento */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-3"
            >
              <div className="flex items-center text-amber-600 mb-4">
                <AlertTriangle className="mr-2" size={24} />
                <h3 className="text-lg font-semibold">Confirmar exclusão</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setLancamentoParaExcluir(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExclusaoLancamento}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CaixaViagemModalAdmin;
