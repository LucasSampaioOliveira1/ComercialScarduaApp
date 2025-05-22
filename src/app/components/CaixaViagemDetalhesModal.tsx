import React, { useState } from 'react';
import { X, Download, ArrowDownCircle, ArrowUpCircle, DollarSign, Edit, Trash2, MapPin, Building, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface CaixaViagemDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caixa: any;
  empresas?: any[];
  funcionarios?: any[];
  onEdit?: (caixa: any) => void;
  onDelete?: (caixa: any) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const CaixaViagemDetalhesModal = ({
  isOpen,
  onClose,
  caixa,
  empresas,
  funcionarios,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}: CaixaViagemDetalhesModalProps) => {
  const [activeTab, setActiveTab] = useState<'detalhes' | 'lancamentos'>('detalhes');

  if (!isOpen || !caixa) return null;

  const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
  
  // Calcular totais
  const totalEntradas = lancamentos
    .filter(l => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
    .reduce((sum, item) => sum + parseFloat(String(item.entrada || "0")), 0);
  
  const totalSaidas = lancamentos
    .filter(l => l?.saida && !isNaN(parseFloat(String(l.saida))))
    .reduce((sum, item) => sum + parseFloat(String(item.saida || "0")), 0);
  
  const saldo = totalEntradas - totalSaidas;

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

  // Função para exportar dados para Excel
  const exportToExcel = () => {
    try {
      // Preparar dados da caixa para a planilha
      const caixaData = {
        'ID': caixa.id,
        'Destino': caixa.destino,
        'Data': formatDate(caixa.data),
        'Empresa': caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || 'N/A',
        'Funcionário': caixa.funcionario ? 
          `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}` : 'N/A',
        'Usuário': caixa.user ? 
          `${caixa.user.nome} ${caixa.user.sobrenome || ''}` : 'N/A',
        'Total Entradas': formatCurrency(totalEntradas),
        'Total Saídas': formatCurrency(totalSaidas),
        'Saldo': formatCurrency(saldo),
        'Observação': caixa.observacao || 'N/A',
        'Criado em': formatDate(caixa.createdAt),
        'Atualizado em': formatDate(caixa.updatedAt)
      };

      // Preparar dados dos lançamentos para a planilha
      const lancamentosData = lancamentos.map((lancamento: any, index: number) => ({
        '#': index + 1,
        'Data': formatDate(lancamento.data),
        'Documento': lancamento.numeroDocumento || '',
        'Custo': lancamento.custo || '',
        'Cliente/Fornecedor': lancamento.clienteFornecedor || '',
        'Entrada': lancamento.entrada ? formatCurrency(parseFloat(String(lancamento.entrada))) : '',
        'Saída': lancamento.saida ? formatCurrency(parseFloat(String(lancamento.saida))) : '',
        'Descrição': lancamento.historicoDoc || ''
      }));

      // Criar um novo workbook
      const wb = XLSX.utils.book_new();
      
      // Adicionar a aba com os dados da caixa
      const wsCaixa = XLSX.utils.json_to_sheet([caixaData]);
      XLSX.utils.book_append_sheet(wb, wsCaixa, 'Detalhes da Caixa');
      
      // Adicionar a aba com os lançamentos
      if (lancamentosData.length > 0) {
        const wsLancamentos = XLSX.utils.json_to_sheet(lancamentosData);
        XLSX.utils.book_append_sheet(wb, wsLancamentos, 'Lançamentos');
      }
      
      // Gerar o nome do arquivo
      const fileName = `caixa-viagem-${caixa.id}-${caixa.destino.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
      
      // Criar o arquivo Excel e fazer o download
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, fileName);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      alert('Erro ao exportar dados');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl"
        >
          {/* Cabeçalho */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="sm:flex sm:items-start justify-between">
              <div className="flex items-center">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <MapPin className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {caixa.destino || `Caixa de Viagem #${caixa.id}`}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(caixa.data)} 
                    {caixa.oculto && <span className="ml-2 text-orange-500">(Oculto)</span>}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 sm:mt-0 flex items-center space-x-3">
                <button
                  onClick={exportToExcel}
                  type="button"
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Exportar para Excel"
                >
                  <Download className="h-5 w-5" />
                </button>
                
                {canEdit && onEdit && (
                  <button
                    onClick={() => onEdit(caixa)}
                    type="button"
                    className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                
                {canDelete && onDelete && (
                  <button
                    onClick={() => onDelete(caixa)}
                    type="button"
                    className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir/Ocultar"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  type="button"
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Guias */}
            <div className="mt-4">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('detalhes')}
                    className={`${
                      activeTab === 'detalhes'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Detalhes da Caixa
                  </button>
                  <button
                    onClick={() => setActiveTab('lancamentos')}
                    className={`${
                      activeTab === 'lancamentos'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Lançamentos ({lancamentos.length})
                  </button>
                </nav>
              </div>
            </div>
          </div>
          
          {/* Corpo do modal */}
          <div className="bg-white px-4 py-5 sm:p-6">
            {activeTab === 'detalhes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações da Caixa */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Informações da Caixa</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Destino</p>
                        <p className="text-sm font-medium">{caixa.destino || 'Não informado'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Data</p>
                        <p className="text-sm font-medium">{formatDate(caixa.data)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Empresa</p>
                        <p className="text-sm font-medium">
                          {caixa.empresa?.nome || caixa.empresa?.nomeEmpresa || 'Não vinculada'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Funcionário</p>
                        <p className="text-sm font-medium">
                          {caixa.funcionario ? 
                            `${caixa.funcionario.nome} ${caixa.funcionario.sobrenome || ''}` : 
                            'Não vinculado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Responsável</p>
                        <p className="text-sm font-medium">
                          {caixa.user ? 
                            `${caixa.user.nome} ${caixa.user.sobrenome || ''}` : 
                            'Não informado'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {caixa.observacao && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs text-gray-500">Observações</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{caixa.observacao}</p>
                    </div>
                  )}
                </div>
                
                {/* Resumo Financeiro */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Resumo Financeiro</h4>
                  
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center">
                        <ArrowDownCircle className="h-8 w-8 text-green-500 mr-3" />
                        <div>
                          <p className="text-xs text-gray-500">Total de Entradas</p>
                          <p className="text-lg font-semibold text-green-500">{formatCurrency(totalEntradas)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center">
                        <ArrowUpCircle className="h-8 w-8 text-red-500 mr-3" />
                        <div>
                          <p className="text-xs text-gray-500">Total de Saídas</p>
                          <p className="text-lg font-semibold text-red-500">{formatCurrency(totalSaidas)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-blue-500 mr-3" />
                        <div>
                          <p className="text-xs text-gray-500">Saldo</p>
                          <p className={`text-lg font-semibold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(saldo)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      <p>Criado em: {formatDate(caixa.createdAt)}</p>
                      <p>Última atualização: {formatDate(caixa.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'lancamentos' && (
              <div>
                {lancamentos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">Nenhum lançamento registrado para esta caixa de viagem.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente/Fornecedor</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saída</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lancamentos.map((lancamento: any) => (
                          <tr key={lancamento.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(lancamento.data)}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{lancamento.numeroDocumento || '-'}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{lancamento.historicoDoc || '-'}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{lancamento.clienteFornecedor || '-'}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{lancamento.custo || '-'}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                              {lancamento.entrada ? formatCurrency(parseFloat(String(lancamento.entrada))) : ''}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                              {lancamento.saida ? formatCurrency(parseFloat(String(lancamento.saida))) : ''}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Linha de total */}
                        <tr className="bg-gray-50 font-medium">
                          <td colSpan={5} className="px-6 py-3 text-right text-sm">Totais:</td>
                          <td className="px-6 py-3 text-right text-green-600 font-semibold">{formatCurrency(totalEntradas)}</td>
                          <td className="px-6 py-3 text-right text-red-600 font-semibold">{formatCurrency(totalSaidas)}</td>
                        </tr>
                        
                        {/* Linha de saldo */}
                        <tr className="bg-gray-100">
                          <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium">Saldo:</td>
                          <td colSpan={2} className={`px-6 py-3 text-right font-semibold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(saldo)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Rodapé do modal */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CaixaViagemDetalhesModal;
