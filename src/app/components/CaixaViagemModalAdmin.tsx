import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Calendar, DollarSign, Map, Building, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface CaixaViagemModalAdminProps {
  isOpen: boolean;
  onClose: () => void;
  caixa?: any;
  isEdit?: boolean;
  onSave: (dados: any) => void;
  empresas: any[];
  funcionarios: any[];
  usuarios: any[];
  isLoading: boolean;
}

const CaixaViagemModalAdmin = ({
  isOpen,
  onClose,
  caixa,
  isEdit = false,
  onSave,
  empresas,
  funcionarios,
  usuarios,
  isLoading
}: CaixaViagemModalAdminProps) => {
  const [caixaData, setCaixaData] = useState<any>({
    id: undefined,
    userId: '',
    destino: '',
    data: new Date().toISOString().split('T')[0],
    empresaId: '',
    funcionarioId: '',
    observacao: '',
    oculto: false
  });

  const [lancamentos, setLancamentos] = useState<any[]>([
    {
      id: undefined,
      data: new Date().toISOString().split('T')[0],
      numeroDocumento: '',
      historicoDoc: '',
      custo: '',
      clienteFornecedor: '',
      entrada: '',
      saida: ''
    }
  ]);

  // Efeito para carregar dados ao abrir para edição
  useEffect(() => {
    if (isEdit && caixa) {
      setCaixaData({
        id: caixa.id,
        userId: caixa.userId || localStorage.getItem('userId') || '',
        destino: caixa.destino || '',
        data: caixa.data || new Date().toISOString().split('T')[0],
        empresaId: caixa.empresaId || '',
        funcionarioId: caixa.funcionarioId || '',
        observacao: caixa.observacao || '',
        oculto: caixa.oculto || false
      });

      // Carregar lançamentos se existirem, ou criar um vazio
      if (caixa.lancamentos && caixa.lancamentos.length > 0) {
        setLancamentos(caixa.lancamentos.map((l: any) => ({
          id: l.id,
          data: l.data || new Date().toISOString().split('T')[0],
          numeroDocumento: l.numeroDocumento || '',
          historicoDoc: l.historicoDoc || '',
          custo: l.custo || '',
          clienteFornecedor: l.clienteFornecedor || '',
          entrada: l.entrada || '',
          saida: l.saida || ''
        })));
      }
    } else {
      // Caso de nova caixa, usar o ID do usuário atual se não for admin
      setCaixaData(prev => ({
        ...prev,
        userId: localStorage.getItem('userId') || ''
      }));
    }
  }, [isEdit, caixa, isOpen]);

  // Handlers para atualização de campos
  const handleCaixaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const val = name === 'oculto' ? (e.target as HTMLInputElement).checked : value;
    setCaixaData(prev => ({ ...prev, [name]: val }));
  };

  const handleLancamentoChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedLancamentos = [...lancamentos];
    updatedLancamentos[index] = { ...updatedLancamentos[index], [name]: value };
    setLancamentos(updatedLancamentos);
  };

  const addLancamento = () => {
    setLancamentos([
      ...lancamentos,
      {
        id: undefined,
        data: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        historicoDoc: '',
        custo: '',
        clienteFornecedor: '',
        entrada: '',
        saida: ''
      }
    ]);
  };

  const removeLancamento = (index: number) => {
    if (lancamentos.length <= 1) return;
    const updatedLancamentos = lancamentos.filter((_, i) => i !== index);
    setLancamentos(updatedLancamentos);
  };

  // Handler para salvar os dados
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      caixaViagem: caixaData,
      lancamentos: lancamentos
    });
  };

  // Formatação de valores
  const formatCurrency = (value: string): string => {
    if (!value) return '';
    // Remover caracteres não numéricos, exceto ponto e vírgula
    const cleanValue = value.replace(/[^\d.,]/g, '');
    // Converter para número
    const number = parseFloat(cleanValue.replace(',', '.'));
    if (isNaN(number)) return '';
    // Formatar como moeda
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Cabeçalho do modal */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEdit ? 'Editar Caixa de Viagem' : 'Nova Caixa de Viagem'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        {/* Corpo do modal - formulário */}
        <div className="flex-grow overflow-y-auto p-4 space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Usuário (apenas para admin) */}
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                  Usuário <span className="text-red-500">*</span>
                </label>
                <select
                  id="userId"
                  name="userId"
                  value={caixaData.userId}
                  onChange={handleCaixaChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893]"
                >
                  <option value="">Selecione um usuário</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome} {usuario.sobrenome || ''} ({usuario.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destino */}
              <div>
                <label htmlFor="destino" className="block text-sm font-medium text-gray-700 mb-1">
                  Destino <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Map size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="destino"
                    name="destino"
                    value={caixaData.destino}
                    onChange={handleCaixaChange}
                    required
                    placeholder="Ex: São Paulo, Belo Horizonte, etc."
                    className="pl-10 pr-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893]"
                  />
                </div>
              </div>

              {/* Data */}
              <div>
                <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
                  Data <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="data"
                    name="data"
                    value={caixaData.data}
                    onChange={handleCaixaChange}
                    required
                    className="pl-10 pr-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893]"
                  />
                </div>
              </div>

              {/* Empresa */}
              <div>
                <label htmlFor="empresaId" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building size={16} className="text-gray-400" />
                  </div>
                  <select
                    id="empresaId"
                    name="empresaId"
                    value={caixaData.empresaId}
                    onChange={handleCaixaChange}
                    className="pl-10 pr-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893]"
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome || empresa.nomeEmpresa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Funcionário */}
              <div>
                <label htmlFor="funcionarioId" className="block text-sm font-medium text-gray-700 mb-1">
                  Funcionário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <select
                    id="funcionarioId"
                    name="funcionarioId"
                    value={caixaData.funcionarioId}
                    onChange={handleCaixaChange}
                    className="pl-10 pr-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893]"
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

              {/* Observação */}
              <div className="md:col-span-2">
                <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-1">
                  Observação
                </label>
                <textarea
                  id="observacao"
                  name="observacao"
                  value={caixaData.observacao}
                  onChange={handleCaixaChange}
                  placeholder="Observações adicionais sobre esta caixa de viagem"
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893]"
                />
              </div>

              {/* Ocultado - Apenas para edição */}
              {isEdit && (
                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="oculto"
                      name="oculto"
                      checked={caixaData.oculto}
                      onChange={handleCaixaChange}
                      className="h-4 w-4 rounded border-gray-300 text-[#344893] focus:ring-[#344893]"
                    />
                    <label htmlFor="oculto" className="ml-2 block text-sm text-gray-700">
                      Ocultar caixa de viagem
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Caixas ocultas não aparecem na listagem principal.</p>
                </div>
              )}
            </div>

            {/* Seção de lançamentos */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Lançamentos</h3>
                <button
                  type="button"
                  onClick={addLancamento}
                  className="flex items-center text-sm font-medium text-[#344893] hover:text-[#2a3b78]"
                >
                  <Plus size={16} className="mr-1" />
                  Adicionar lançamento
                </button>
              </div>

              <div className="space-y-4">
                {lancamentos.map((lancamento, index) => (
                  <div 
                    key={index} 
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium text-gray-700">
                        Lançamento #{index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeLancamento(index)}
                        className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
                        disabled={lancamentos.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Data */}
                      <div>
                        <label htmlFor={`lancamentos[${index}].data`} className="block text-xs font-medium text-gray-700 mb-1">
                          Data
                        </label>
                        <input
                          type="date"
                          id={`lancamentos[${index}].data`}
                          name="data"
                          value={lancamento.data}
                          onChange={(e) => handleLancamentoChange(index, e)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893] text-sm"
                        />
                      </div>

                      {/* Número do documento */}
                      <div>
                        <label htmlFor={`lancamentos[${index}].numeroDocumento`} className="block text-xs font-medium text-gray-700 mb-1">
                          Número do documento
                        </label>
                        <input
                          type="text"
                          id={`lancamentos[${index}].numeroDocumento`}
                          name="numeroDocumento"
                          value={lancamento.numeroDocumento}
                          onChange={(e) => handleLancamentoChange(index, e)}
                          placeholder="Nº do comprovante, nota fiscal, etc."
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893] text-sm"
                        />
                      </div>

                      {/* Custo */}
                      <div>
                        <label htmlFor={`lancamentos[${index}].custo`} className="block text-xs font-medium text-gray-700 mb-1">
                          Custo
                        </label>
                        <input
                          type="text"
                          id={`lancamentos[${index}].custo`}
                          name="custo"
                          value={lancamento.custo}
                          onChange={(e) => handleLancamentoChange(index, e)}
                          placeholder="Ex: Combustível, Hotel, Alimentação"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893] text-sm"
                        />
                      </div>

                      {/* Cliente/Fornecedor */}
                      <div>
                        <label htmlFor={`lancamentos[${index}].clienteFornecedor`} className="block text-xs font-medium text-gray-700 mb-1">
                          Cliente/Fornecedor
                        </label>
                        <input
                          type="text"
                          id={`lancamentos[${index}].clienteFornecedor`}
                          name="clienteFornecedor"
                          value={lancamento.clienteFornecedor}
                          onChange={(e) => handleLancamentoChange(index, e)}
                          placeholder="Nome do fornecedor ou cliente"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893] text-sm"
                        />
                      </div>

                      {/* Entrada */}
                      <div>
                        <label htmlFor={`lancamentos[${index}].entrada`} className="block text-xs font-medium text-gray-700 mb-1">
                          Entrada
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign size={14} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id={`lancamentos[${index}].entrada`}
                            name="entrada"
                            value={lancamento.entrada}
                            onChange={(e) => handleLancamentoChange(index, e)}
                            placeholder="0,00"
                            className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Saída */}
                      <div>
                        <label htmlFor={`lancamentos[${index}].saida`} className="block text-xs font-medium text-gray-700 mb-1">
                          Saída
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign size={14} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id={`lancamentos[${index}].saida`}
                            name="saida"
                            value={lancamento.saida}
                            onChange={(e) => handleLancamentoChange(index, e)}
                            placeholder="0,00"
                            className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Histórico/Descrição */}
                      <div className="md:col-span-2">
                        <label htmlFor={`lancamentos[${index}].historicoDoc`} className="block text-xs font-medium text-gray-700 mb-1">
                          Histórico/Descrição
                        </label>
                        <textarea
                          id={`lancamentos[${index}].historicoDoc`}
                          name="historicoDoc"
                          value={lancamento.historicoDoc}
                          onChange={(e) => handleLancamentoChange(index, e)}
                          placeholder="Descreva os detalhes deste lançamento"
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#344893] focus:border-[#344893] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Rodapé do modal */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#344893] text-white rounded-md hover:bg-[#2a3b78] flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Check size={18} className="mr-2" />
                Salvar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CaixaViagemModalAdmin;