import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, PlusCircle, Calendar, DollarSign, Clock, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Adicione esta interface no início do arquivo:
interface ContaCorrenteSaveData {
  contaCorrente: any;
  lancamentos: any[];
}

// Definição das interfaces
interface Lancamento {
  id?: number;
  contaCorrenteId?: number;
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
  nome?: string;
  nomeEmpresa?: string;
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

interface ContaCorrente {
  id?: number;
  userId?: string;
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
  lancamentos: Lancamento[];
  user?: User;
  empresa?: Empresa;
  colaborador?: Colaborador;
  saldo?: number;
}

// Então atualize a interface do modal:
interface ContaCorrenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dados: ContaCorrenteSaveData) => void;
  isEditMode: boolean;
  conta: ContaCorrente | null;
  empresas: Empresa[];
  colaboradores: Colaborador[];
  usuarios: User[];
  setores?: string[];
  isLoading?: boolean;
  isAdminMode?: boolean;
  currentUserId?: string;
}

const ContaCorrenteModal: React.FC<ContaCorrenteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isEditMode,
  conta = null,
  empresas = [],
  colaboradores = [],
  usuarios = [],
  setores = [],
  isLoading = false,
  isAdminMode = false,
  currentUserId = ''
}) => {
  // Estado para o formulário principal
  const [formData, setFormData] = useState({
    id: 0,
    userId: isAdminMode ? '' : currentUserId,
    empresaId: '',
    colaboradorId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'EXTRA_CAIXA',
    fornecedorCliente: '',
    observacao: '',
    setor: '',
    oculto: false
  });

  // Estado para os lançamentos
  const [lancamentos, setLancamentos] = useState<{
    id?: number;
    data: string;
    numeroDocumento: string;
    observacao: string;
    credito: string;
    debito: string;
  }[]>([
    {
      data: new Date().toISOString().split('T')[0],
      numeroDocumento: '',
      observacao: '',
      credito: '',
      debito: '',
    }
  ]);

  // Carregar dados iniciais se for edição
  useEffect(() => {
    if (conta) {
      setFormData({
        id: conta.id || 0,
        userId: conta.userId || (isAdminMode ? '' : currentUserId),
        empresaId: conta.empresaId?.toString() || '',
        colaboradorId: conta.colaboradorId?.toString() || '',
        data: conta.data ? format(new Date(conta.data), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
        tipo: conta.tipo || 'EXTRA_CAIXA',
        fornecedorCliente: conta.fornecedorCliente || '',
        observacao: conta.observacao || '',
        setor: conta.setor || '',
        oculto: conta.oculto || false
      });

      if (conta.lancamentos && Array.isArray(conta.lancamentos) && conta.lancamentos.length > 0) {
        try {
          setLancamentos(conta.lancamentos.map((l: any) => ({
            id: l.id,
            data: l.data ? format(new Date(l.data), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            numeroDocumento: l.numeroDocumento || '',
            observacao: l.observacao || '',
            credito: l.credito || '',
            debito: l.debito || ''
          })));
        } catch (error) {
          console.error("Erro ao processar lançamentos:", error);
        }
      }
    }
  }, [conta, isAdminMode, currentUserId]);

  // Adicionar nova linha à tabela
  const adicionarLinha = () => {
    setLancamentos([...lancamentos, {
      data: new Date().toISOString().split('T')[0],
      numeroDocumento: '',
      observacao: '',
      credito: '',
      debito: '',
    }]);
  };

  // Remover linha da tabela
  const removerLinha = (index: number) => {
    if (lancamentos.length <= 1) return; // Mantém pelo menos uma linha
    
    const novasLinhas = [...lancamentos];
    novasLinhas.splice(index, 1);
    setLancamentos(novasLinhas);
  };

  // Adicione esta função para formatar valores monetários no input
  const formatarValorMonetario = (valor: string): string => {
    // Remover qualquer caractere que não seja dígito
    let apenasNumeros = valor.replace(/\D/g, '');
    
    // Se não houver números, retorna vazio
    if (!apenasNumeros) return '';
    
    // Converter para número
    const numero = parseInt(apenasNumeros, 10) / 100;
    
    // Formatar para moeda brasileira, sem o símbolo
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Atualizar a função atualizarLinha para usar o formatador
  const atualizarLinha = (index: number, campo: string, valor: string) => {
    const novasLinhas = [...lancamentos];
    
    // Se o campo for crédito ou débito, formatar como moeda
    if (campo === 'credito' || campo === 'debito') {
      novasLinhas[index] = { 
        ...novasLinhas[index], 
        [campo]: formatarValorMonetario(valor)
      };
    } else {
      novasLinhas[index] = { ...novasLinhas[index], [campo]: valor };
    }
    
    setLancamentos(novasLinhas);
  };

  // Função auxiliar para formatar valores monetários
  const formatarValorParaAPI = (valor: string | null | undefined): number | null => {
    if (!valor || valor.trim() === '') return null;
    
    // Remove qualquer caractere não numérico, exceto ponto e vírgula
    const valorLimpo = valor.replace(/[^\d.,]/g, '');
    
    // Substitui vírgula por ponto para cálculos
    const valorNumerico = valorLimpo.replace(',', '.');
    
    // Converte para número ou retorna null se não for possível
    const numero = parseFloat(valorNumerico);
    return isNaN(numero) ? null : numero;
  };

  // Adicione esta função para garantir que pelo menos o primeiro lançamento tenha um valor:
  const validarLancamentos = (): boolean => {
    // Se não houver lançamentos, adicione um
    if (lancamentos.length === 0) {
      setLancamentos([{
        data: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        observacao: '',
        credito: '',
        debito: '',
      }]);
      return false;
    }
    
    // Verificar se pelo menos um lançamento tem valor
    const temValor = lancamentos.some(l => {
      const creditoValido = l.credito && l.credito.trim() !== '';
      const debitoValido = l.debito && l.debito.trim() !== '';
      return creditoValido || debitoValido;
    });
    
    return temValor;
  };

  // No modal de criação de lançamentos
  const validarLancamento = (lancamento: Lancamento): boolean => {
    // Formatar valores para garantir que são numéricos
    if (lancamento.credito) {
      const creditoLimpo = lancamento.credito.replace(/[^\d.,]/g, '').replace(',', '.');
      if (isNaN(parseFloat(creditoLimpo))) {
        return false;
      }
    }
    
    if (lancamento.debito) {
      const debitoLimpo = lancamento.debito.replace(/[^\d.,]/g, '').replace(',', '.');
      if (isNaN(parseFloat(debitoLimpo))) {
        return false;
      }
    }
    
    return true;
  };

  // Melhorar o handleSubmit para garantir o formato correto
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se há pelo menos um lançamento válido
    const lancamentosValidos = lancamentos.filter(l => {
      const temCredito = l.credito && l.credito.trim() !== '';
      const temDebito = l.debito && l.debito.trim() !== '';
      return temCredito || temDebito;
    });
    
    if (lancamentosValidos.length === 0) {
      alert("É necessário adicionar pelo menos um lançamento com valor de crédito ou débito.");
      return;
    }
    
    // Processar lançamentos
    const lancamentosFormatados = lancamentosValidos.map(l => {
      // Limpar e formatar valores, removendo símbolos de moeda e formatação
      const creditoLimpo = l.credito ? l.credito.replace(/[^\d.,]/g, '').replace(',', '.') : null;
      const debitoLimpo = l.debito ? l.debito.replace(/[^\d.,]/g, '').replace(',', '.') : null;
      
      return {
        id: l.id || undefined,
        data: l.data,
        numeroDocumento: l.numeroDocumento || '',
        observacao: l.observacao || '',
        credito: creditoLimpo,
        debito: debitoLimpo
      };
    });
    
    // Dados da conta corrente
    const dadosContaCorrente = {
      id: formData.id || undefined,
      userId: formData.userId || currentUserId,
      empresaId: formData.empresaId ? parseInt(formData.empresaId) : null,
      colaboradorId: formData.colaboradorId ? parseInt(formData.colaboradorId) : null,
      data: formData.data,
      tipo: formData.tipo,
      fornecedorCliente: formData.fornecedorCliente || '',
      observacao: formData.observacao || '',
      setor: formData.setor || '',
      oculto: formData.oculto || false
    };
    
    // Log para depuração
    console.log("Enviando dados para salvar:", {
      contaCorrente: dadosContaCorrente,
      lancamentos: lancamentosFormatados
    });
    
    // Chamar função de salvamento
    onSave({
      contaCorrente: dadosContaCorrente,
      lancamentos: lancamentosFormatados
    });
  };

  // Calcular saldo total
  const calcularSaldo = () => {
    return lancamentos.reduce((total, linha) => {
      const entrada = linha.credito ? parseFloat(linha.credito) : 0;
      const saida = linha.debito ? parseFloat(linha.debito) : 0;
      return total + entrada - saida;
    }, 0);
  };

  const calcularTotalCreditos = () => {
    return lancamentos.reduce((total, linha) => {
      return total + (linha.credito ? parseFloat(linha.credito) || 0 : 0);
    }, 0);
  };

  const calcularTotalDebitos = () => {
    return lancamentos.reduce((total, linha) => {
      return total + (linha.debito ? parseFloat(linha.debito) || 0 : 0);
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 overflow-auto py-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 my-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Cabeçalho do modal com cores claras */}
          <div className="bg-gradient-to-r from-gray-100 to-blue-50 p-6 rounded-t-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditMode ? 'Editar Conta Corrente' : 'Nova Conta Corrente'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Primeira linha de campos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">EMPRESA</label>
                <select 
                  value={formData.empresaId} 
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Selecione...</option>
                  {Array.isArray(empresas) && empresas.map(empresa => (
                    empresa && (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nomeEmpresa || empresa.nome || `Empresa ${empresa.id}`}
                      </option>
                    )
                  ))}
                </select>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">FUNCIONÁRIO</label>
                <select 
                  value={formData.colaboradorId}
                  onChange={(e) => setFormData({...formData, colaboradorId: e.target.value})}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Selecione...</option>
                  {Array.isArray(colaboradores) && colaboradores.map(col => (
                    col && (
                      <option key={col.id} value={col.id}>
                        {col.nome} {col.sobrenome || ''}
                      </option>
                    )
                  ))}
                </select>
              </div>

              {/* Campo de seleção de usuário (apenas em modo admin) */}
              {isAdminMode ? (
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="block text-xs text-gray-700 mb-2 font-medium">RESPONSÁVEL</label>
                  <select 
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Selecione...</option>
                    {Array.isArray(usuarios) && usuarios.map(usuario => (
                      usuario && (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nome} {usuario.sobrenome || ''}
                        </option>
                      )
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            
            {/* Segunda linha - Tipo, Setor e Data - reorganizados em 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">TIPO</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="EXTRA_CAIXA">Extra Caixa</option>
                  <option value="PERMUTA">Permuta</option>
                  <option value="DEVOLUCAO">Devolução</option>
                </select>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">SETOR</label>
                <select 
                  value={formData.setor || ''}
                  onChange={(e) => setFormData({...formData, setor: e.target.value})}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Selecione um setor...</option>
                  {Array.isArray(setores) && setores.length > 0 ? (
                    setores.map((setor, index) => (
                      <option key={`setor-${index}`} value={setor}>
                        {setor}
                      </option>
                    ))
                  ) : (
                    <option disabled>Nenhum setor disponível</option>
                  )}
                </select>
              </div>
              
              {/* Data movida para esta linha */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">DATA</label>
                <input 
                  type="date" 
                  value={formData.data}
                  onChange={(e) => setFormData({...formData, data: e.target.value})}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Terceira linha - Agora com Fornecedor/Cliente ocupando toda a largura para dar destaque */}
            <div className="mt-5">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">FORNECEDOR/CLIENTE</label>
                <input 
                  type="text" 
                  value={formData.fornecedorCliente || ''}
                  onChange={(e) => setFormData({...formData, fornecedorCliente: e.target.value})}
                  placeholder="Nome do fornecedor ou cliente"
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Observações - permanece full width como estava */}
            <div className="mt-5 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-xs text-gray-700 mb-2 font-medium">OBSERVAÇÕES</label>
              <textarea 
                value={formData.observacao || ''}
                onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                placeholder="Observações adicionais"
                className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md h-20 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Informações de Saldo - com cores mais suaves */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100 shadow-sm">
                <p className="text-xs uppercase font-semibold text-blue-600 mb-1">Total Entradas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(calcularTotalCreditos())}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100 shadow-sm">
                <p className="text-xs uppercase font-semibold text-blue-600 mb-1">Total Saídas</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(calcularTotalDebitos())}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100 shadow-sm">
                <p className="text-xs uppercase font-semibold text-blue-600 mb-1">Saldo Final</p>
                <p className={`text-xl font-bold ${calcularSaldo() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calcularSaldo())}
                </p>
              </div>
            </div>
          </div>

          {/* Tabela de Lançamentos - redesenhada com visual mais clean */}
          <div className="p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Lançamentos</h3>
              <button
                type="button"
                onClick={adicionarLinha}
                className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                <PlusCircle size={16} className="mr-2" /> Adicionar lançamento
              </button>
            </div>
            
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Débito</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lancamentos.map((lancamento, index) => (
                  // Adicione feedback visual para campos de valor vazios
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={lancamento.data}
                        onChange={(e) => atualizarLinha(index, 'data', e.target.value)}
                        className="block w-full px-3 py-1.5 text-base text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={lancamento.numeroDocumento}
                        onChange={(e) => atualizarLinha(index, 'numeroDocumento', e.target.value)}
                        className="block w-full px-3 py-1.5 text-base text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nº Doc"
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={lancamento.observacao}
                        onChange={(e) => atualizarLinha(index, 'observacao', e.target.value)}
                        className="block w-full px-3 py-1.5 text-base text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descrição do lançamento"
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={lancamento.credito}
                          onChange={(e) => atualizarLinha(index, 'credito', e.target.value)}
                          className={`block w-full pl-10 pr-3 py-1.5 text-base border rounded-md focus:ring-2 focus:outline-none
                            ${!lancamento.credito && !lancamento.debito 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                          placeholder="0,00"
                          disabled={isLoading}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={lancamento.debito}
                          onChange={(e) => atualizarLinha(index, 'debito', e.target.value)}
                          className={`block w-full pl-10 pr-3 py-1.5 text-base border rounded-md focus:ring-2 focus:outline-none
                            ${!lancamento.credito && !lancamento.debito 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                          placeholder="0,00"
                          disabled={isLoading}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => removerLinha(index)}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:text-gray-400 focus:outline-none"
                        title="Remover linha"
                        disabled={isLoading || lancamentos.length <= 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right font-medium">Totais:</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(calcularTotalCreditos())}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(calcularTotalDebitos())}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Botões de ação - redesenhados */}
          <div className="border-t border-gray-200 p-6 flex justify-end bg-gray-50 rounded-b-xl">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Clock className="animate-spin mr-2" size={18} />
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
      </motion.div>
    </div>
  );
};

export default ContaCorrenteModal;