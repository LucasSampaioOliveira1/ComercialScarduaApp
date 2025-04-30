import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, PlusCircle, Calendar, DollarSign, Clock, User, Building } from 'lucide-react';
import { format } from 'date-fns';

// Definição das interfaces
interface Lancamento {
  id?: number;
  contaCorrenteId?: number;
  data: string;
  numeroDocumento?: string;
  observacao?: string;
  credito?: string;
  debito?: string;
  clienteFornecedor?: string;
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

interface User {
  id: string;
  nome: string;
  sobrenome?: string;
  email: string;
  role?: string;
}

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
  saldo?: number;
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

interface ContaCorrenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: ContaCorrente | null;
  empresas?: Empresa[];
  colaboradores?: Colaborador[];
  usuarios?: User[];
  isLoading?: boolean;
}

const ContaCorrenteModal: React.FC<ContaCorrenteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  empresas = [],
  colaboradores = [],
  usuarios = [],
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    id: 0,
    userId: '',
    empresaId: '',
    colaboradorId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'PESSOAL',
    fornecedorCliente: '',
    observacao: '',
    setor: '',
    oculto: false
  });

  // Estado para os lançamentos (no estilo tabela Excel)
  const [lancamentos, setLancamentos] = useState<{
    id?: number;
    data: string;
    clienteFornecedor: string;
    entrada: string;
    saida: string;
    documento: string;
    historico: string;
  }[]>([
    // Linha inicial em branco
    {
      data: new Date().toISOString().split('T')[0],
      clienteFornecedor: '',
      entrada: '',
      saida: '',
      documento: '',
      historico: '',
    }
  ]);

  // Carregar dados iniciais se for edição
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || 0,
        userId: initialData.userId || '',
        empresaId: initialData.empresaId?.toString() || '',
        colaboradorId: initialData.colaboradorId?.toString() || '',
        data: initialData.data ? format(new Date(initialData.data), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
        tipo: initialData.tipo || 'PESSOAL',
        fornecedorCliente: initialData.fornecedorCliente || '',
        observacao: initialData.observacao || '',
        setor: initialData.setor || '',
        oculto: initialData.oculto || false
      });

      if (initialData.lancamentos && Array.isArray(initialData.lancamentos) && initialData.lancamentos.length > 0) {
        try {
          setLancamentos(initialData.lancamentos.map((l: any) => ({
            id: l.id,
            data: l.data ? format(new Date(l.data), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            clienteFornecedor: l.clienteFornecedor || '',
            entrada: l.credito || '', 
            saida: l.debito || '',
            documento: l.numeroDocumento || '',
            historico: l.observacao || ''
          })));
        } catch (error) {
          console.error("Erro ao processar lançamentos:", error);
          // Manter o estado padrão com uma linha em branco
        }
      }
    }
  }, [initialData]);

  // Adicionar nova linha à tabela
  const adicionarLinha = () => {
    setLancamentos([...lancamentos, {
      data: new Date().toISOString().split('T')[0],
      clienteFornecedor: '',
      entrada: '',
      saida: '',
      documento: '',
      historico: '',
    }]);
  };

  // Remover linha da tabela
  const removerLinha = (index: number) => {
    const novasLinhas = [...lancamentos];
    novasLinhas.splice(index, 1);
    setLancamentos(novasLinhas);
  };

  // Atualizar dados de uma linha
  const atualizarLinha = (index: number, campo: string, valor: string) => {
    const novasLinhas = [...lancamentos];
    novasLinhas[index] = { ...novasLinhas[index], [campo]: valor };
    setLancamentos(novasLinhas);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converter os lançamentos para o formato esperado pela API
    const lancamentosFormatados = lancamentos
      .filter(l => l.entrada || l.saida) // Filtra linhas em branco
      .map(l => ({
        id: l.id, // Manter o ID se existir (caso de edição)
        data: l.data,
        numeroDocumento: l.documento,
        observacao: l.historico,
        credito: l.entrada || null,
        debito: l.saida || null,
        clienteFornecedor: l.clienteFornecedor
      }));
    
    onSave({
      ...formData,
      lancamentos: lancamentosFormatados
    });
  };

  // Calcular saldo total
  const calcularSaldo = () => {
    return lancamentos.reduce((total, linha) => {
      const entrada = linha.entrada ? parseFloat(linha.entrada) : 0;
      const saida = linha.saida ? parseFloat(linha.saida) : 0;
      return total + entrada - saida;
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-auto py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 my-auto"
      >
        {/* Cabeçalho com estilo semelhante à imagem */}
        <div className="bg-blue-700 text-white p-4">
          <h2 className="text-2xl font-bold">CAIXA VIAGEM - Dinheiro</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">EMPRESA:</label>
              <select 
                value={formData.empresaId} 
                onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              >
                <option value="">Selecione...</option>
                {Array.isArray(empresas) && empresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">FUNC.:</label>
              <select 
                value={formData.colaboradorId}
                onChange={(e) => setFormData({...formData, colaboradorId: e.target.value})}
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              >
                <option value="">Selecione...</option>
                {Array.isArray(colaboradores) && colaboradores.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.nome} {col.sobrenome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">CAIXA Nº</label>
              <input 
                type="text" 
                value={formData.id || ''}
                disabled
                className="w-full px-2 py-1.5 bg-gray-100 text-gray-800 border border-gray-300 rounded"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">Veículo:</label>
              <input 
                type="text" 
                value={formData.setor || ''}
                onChange={(e) => setFormData({...formData, setor: e.target.value})}
                placeholder="Veículo utilizado"
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">Destino:</label>
              <input 
                type="text" 
                value={formData.fornecedorCliente || ''}
                onChange={(e) => setFormData({...formData, fornecedorCliente: e.target.value})}
                placeholder="Local/Cliente"
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">Obs:</label>
              <input 
                type="text" 
                value={formData.observacao || ''}
                onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                placeholder="Observações"
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">Data inicial:</label>
              <input 
                type="date" 
                value={formData.data}
                onChange={(e) => setFormData({...formData, data: e.target.value})}
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-xs text-white opacity-80 mb-1">Data final:</label>
              <input 
                type="date" 
                className="w-full px-2 py-1.5 bg-white text-gray-800 border border-gray-300 rounded"
              />
            </div>
            
            <div className="col-span-2 flex items-center gap-2 pt-6">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="encerrado"
                  className="h-4 w-4" 
                />
                <label htmlFor="encerrado" className="ml-1 text-sm text-white">Encerrado</label>
              </div>
              
              <div className="flex items-center ml-6">
                <input 
                  type="checkbox" 
                  id="cartao"
                  className="h-4 w-4" 
                />
                <label htmlFor="cartao" className="ml-1 text-sm text-white">Cartão</label>
              </div>
            </div>
          </div>

          {/* Informações de Saldo */}
          <div className="mt-4 border-t border-blue-500 pt-2">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-bold">SALDO ANTERIOR</p>
                <p className="text-lg font-bold">R$ 0,00</p>
              </div>
              <div>
                <p className="text-sm font-bold">SALDO FINAL</p>
                <p className="text-lg font-bold">R$ {calcularSaldo().toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Lançamentos (Estilo Excel) */}
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500 w-16">num</th>
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500">CLIENTE / FORNECEDOR</th>
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500 w-24">entrada</th>
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500 w-24">saída</th>
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500 w-24">data</th>
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500 w-24">doc</th>
                <th className="border px-2 py-2 text-left text-sm font-medium text-gray-500">historico</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((lancamento, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                  <td className="border px-2 py-2 text-sm">{index + 1}</td>
                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={lancamento.clienteFornecedor}
                      onChange={(e) => atualizarLinha(index, 'clienteFornecedor', e.target.value)}
                      className="w-full px-1 py-0.5 border-0 bg-transparent"
                      placeholder="Nome do cliente/fornecedor"
                    />
                  </td>
                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={lancamento.entrada}
                      onChange={(e) => atualizarLinha(index, 'entrada', e.target.value)}
                      className="w-full px-1 py-0.5 border-0 bg-transparent text-green-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={lancamento.saida}
                      onChange={(e) => atualizarLinha(index, 'saida', e.target.value)}
                      className="w-full px-1 py-0.5 border-0 bg-transparent text-red-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="border px-2 py-2">
                    <input
                      type="date"
                      value={lancamento.data}
                      onChange={(e) => atualizarLinha(index, 'data', e.target.value)}
                      className="w-full px-1 py-0.5 border-0 bg-transparent"
                    />
                  </td>
                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={lancamento.documento}
                      onChange={(e) => atualizarLinha(index, 'documento', e.target.value)}
                      className="w-full px-1 py-0.5 border-0 bg-transparent"
                      placeholder="Nº Doc"
                    />
                  </td>
                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={lancamento.historico}
                      onChange={(e) => atualizarLinha(index, 'historico', e.target.value)}
                      className="w-full px-1 py-0.5 border-0 bg-transparent"
                      placeholder="Descrição do lançamento"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removerLinha(index)}
                      className="text-red-500 hover:text-red-700"
                      title="Remover linha"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={adicionarLinha}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <PlusCircle size={16} className="mr-1" /> Adicionar linha
            </button>

            <div className="flex space-x-4 text-sm">
              <span><strong>Entradas no caixa:</strong> R$ {lancamentos.reduce((total, linha) => total + (linha.entrada ? parseFloat(linha.entrada) || 0 : 0), 0).toFixed(2).replace('.', ',')}</span>
              <span><strong>Saídas no caixa:</strong> R$ {lancamentos.reduce((total, linha) => total + (linha.saida ? parseFloat(linha.saida) || 0 : 0), 0).toFixed(2).replace('.', ',')}</span>
              <span><strong>Saldo do caixa:</strong> R$ {calcularSaldo().toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="border-t border-gray-200 p-4 flex justify-between bg-gray-50">
          <div className="flex space-x-2">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Atualizar Saldo
            </button>
            
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Novo
            </button>
            
            <button
              type="button"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Excluir
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Clock className="inline-block animate-spin mr-2" size={16} />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ContaCorrenteModal;