import React, { useState } from 'react';
import { 
  X, Download, ArrowDownCircle, ArrowUpCircle, DollarSign, Edit, Trash2, 
  MapPin, Building, Calendar, User, Truck, FileText // Adicionar FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Atualizar a interface para incluir onGenerateTermo
interface CaixaViagemDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caixa: any;
  empresas?: any[];
  funcionarios?: any[];
  veiculos?: any[];
  onEdit?: (caixa: any) => void;
  onDelete?: (caixa: any) => void;
  onGenerateTermo?: (caixa: any) => void; // Nova propriedade
  canEdit: boolean;
  canDelete: boolean;
}

const CaixaViagemDetalhesModal = ({
  isOpen,
  onClose,
  caixa,
  empresas,
  funcionarios,
  veiculos,
  onEdit,
  onDelete,
  onGenerateTermo, // Novo parâmetro
  canEdit,
  canDelete
}: CaixaViagemDetalhesModalProps) => {
  const [activeTab, setActiveTab] = useState<'detalhes' | 'lancamentos'>('detalhes');

  if (!isOpen || !caixa) return null;

  const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
  
  // Encontrar entidades relacionadas
  const empresa = empresas?.find(emp => emp.id === caixa.empresaId);
  const funcionario = funcionarios?.find(func => func.id === caixa.funcionarioId);
  const veiculo = veiculos?.find(v => v.id === caixa.veiculoId) || caixa.veiculo;

  // Calcular totais
  interface Lancamento {
    id?: string | number;
    entrada?: string | number;
    saida?: string | number;
    data?: string;
    documento?: string;
    historico?: string;
    clienteFornecedor?: string;
    custo?: string;
    // Campos alternativos para compatibilidade
    numeroDocumento?: string;
    historicoDoc?: string;
  }

  const totalEntradas: number = lancamentos
    .filter((l: Lancamento) => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
    .reduce((sum: number, item: Lancamento) => sum + parseFloat(String(item.entrada || "0")), 0);
  
  const totalSaidas: number = lancamentos
    .filter((l: Lancamento) => l?.saida && !isNaN(parseFloat(String(l.saida))))
    .reduce((sum: number, item: Lancamento) => sum + parseFloat(String(item.saida || "0")), 0);

  // Calcular o total de adiantamentos
  const totalAdiantamentos: number = Array.isArray(caixa.adiantamentos)
    ? caixa.adiantamentos.reduce((sum: number, adiantamento: any) => {
        const valor = parseFloat(String(adiantamento.saida || "0"));
        return sum + (isNaN(valor) ? 0 : valor);
      }, 0)
    : 0;
  
  // Calcular o saldo incluindo adiantamentos
  const saldo = totalEntradas - totalSaidas - totalAdiantamentos;

  // Formatar valores para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Modificar a função formatDate para ser mais robusta, como no ContaCorrenteDetalhesModal
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    
    try {
      // Abordagem direta: extrair componentes da data sem usar o construtor Date
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Processamento seguro para outros formatos
      if (dateString.includes('T')) {
        const [datePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Último recurso com o método tradicional
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
        'Empresa': empresa?.nome || empresa?.nomeEmpresa || 'N/A',
        'Funcionário': funcionario ? 
          `${funcionario.nome} ${funcionario.sobrenome || ''}` : 'N/A',
        'Veículo': veiculo ? 
          `${veiculo.modelo} - ${veiculo.placa}` : 'N/A',
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
        'Histórico': lancamento.historicoDoc || '',
        'Entrada': lancamento.entrada ? formatCurrency(parseFloat(String(lancamento.entrada))) : '',
        'Saída': lancamento.saida ? formatCurrency(parseFloat(String(lancamento.saida))) : ''
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
          {/* Cabeçalho Reformulado */}
          <div className="bg-blue-50 p-4 rounded-t-lg relative border-b border-blue-100">
            <div className="sm:flex sm:items-start justify-between">
              <div className="flex items-center">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <User className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    {funcionario ? 
                      `${funcionario.nome} ${funcionario.sobrenome || ''}`.trim() : 
                      "Sem Funcionário"}
                    {caixa.numeroCaixa && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
                        #{caixa.numeroCaixa}
                      </span>
                    )}
                  </h3>
                  {caixa.oculto && <span className="text-sm text-orange-500 mt-1">(Oculto)</span>}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {onGenerateTermo && (
                  <button
                    onClick={() => onGenerateTermo(caixa)}
                    type="button"
                    className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                    title="Gerar Termo de Responsabilidade"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                )}
                
                <button
                  onClick={exportToExcel}
                  type="button"
                  className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                  title="Exportar para Excel"
                >
                  <Download className="h-5 w-5" />
                </button>
                
                {canEdit && onEdit && (
                  <button
                    onClick={() => onEdit(caixa)}
                    type="button"
                    className="p-2 bg-amber-100 text-amber-600 rounded-full hover:bg-amber-200 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                
                {canDelete && onDelete && (
                  <button
                    onClick={() => onDelete(caixa)}
                    type="button"
                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                    title="Excluir/Ocultar"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  type="button"
                  className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Guias do modal */}
            <div className="mt-4">
              <div className="border-b border-gray-200 -mx-4 px-4">
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
              <div>
                {/* Resumo financeiro em 3 colunas */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Entradas</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
                      </div>
                      <div className="bg-green-100 rounded-full p-1.5">
                        <ArrowDownCircle size={16} className="text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Saídas + Adiantamentos</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(totalSaidas + totalAdiantamentos)}</p>
                      </div>
                      <div className="bg-red-100 rounded-full p-1.5">
                        <ArrowUpCircle size={16} className="text-red-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Saldo</p>
                        <div className={`text-xl font-semibold ${
                          saldo > 0 
                            ? 'text-green-600' 
                            : saldo < 0 
                              ? 'text-red-600' 
                              : 'text-blue-600'}`}>
                          {formatCurrency(saldo)}
                        </div>
                      </div>
                      <div className={`${saldo >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full p-1.5`}>
                        <DollarSign size={16} className={saldo >= 0 ? 'text-green-600' : 'text-red-600'} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Informações em duas colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detalhes da viagem */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800 flex items-center text-sm">
                        <MapPin size={16} className="mr-2 text-blue-600" />
                        Detalhes da Viagem
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {/* Adicionando destino - agora como primeiro item */}
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Destino</p>
                            <p className="text-sm font-medium">
                              {caixa.destino || 'Não informado'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Adicionando data - agora como segundo item */}
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Data</p>
                            <p className="text-sm font-medium">
                              {formatDate(caixa.data)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Empresa</p>
                            <p className="text-sm font-medium">
                              {empresa?.nome || empresa?.nomeEmpresa || 'Não vinculada'}
                            </p>
                          </div>
                        </div>
                        
                        {veiculo && (
                          <div className="flex items-center">
                            <Truck className="h-5 w-5 text-gray-500 mr-2" />
                            <div>
                              <p className="text-xs text-gray-500">Veículo</p>
                              <p className="text-sm font-medium">
                                {veiculo.nome ? 
                                  `${veiculo.nome} ${veiculo.modelo ? `(${veiculo.modelo})` : ''}` : 
                                  veiculo.modelo || 'Não informado'} 
                                {veiculo.placa ? `- ${veiculo.placa}` : ''}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Observações */}
                      {caixa.observacao && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="bg-blue-50 p-3 rounded border border-blue-100">
                            <p className="text-xs text-gray-600 mb-1">Observações</p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{caixa.observacao}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Informações adicionais */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800 flex items-center text-sm">
                        <Calendar size={16} className="mr-2 text-blue-600" />
                        Informações Adicionais
                      </h3>
                    </div>
                    <div className="p-4">
                      <div>
                        {caixa.saldoAnterior !== 0 && caixa.saldoAnterior !== undefined && (
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Saldo Inicial:</span>
                            <span className="text-sm font-medium">{formatCurrency(Number(caixa.saldoAnterior))}</span>
                          </div>
                        )}
                        
                        <div className="mt-4 text-xs text-gray-500">
                          <div className="flex justify-between mb-1">
                            <span>ID da Caixa:</span>
                            <span className="text-gray-700">{caixa.id}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span>Criado em:</span>
                            <span className="text-gray-700">{formatDate(caixa.createdAt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Última atualização:</span>
                            <span className="text-gray-700">{formatDate(caixa.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Adicionar uma nova seção para mostrar os adiantamentos vinculados */}
                {Array.isArray(caixa.adiantamentos) && caixa.adiantamentos.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-800 mb-3 text-sm">Adiantamentos Aplicados</h3>
                    <div className="bg-red-50 rounded-lg border border-red-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-red-200">
                          <thead className="bg-red-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-700">Data</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-700">Nome</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-700">Observação</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-red-700">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-200">
                            {caixa.adiantamentos.map((adiantamento: any) => (
                              <tr key={adiantamento.id} className="bg-white hover:bg-red-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(adiantamento.data)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{adiantamento.nome}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{adiantamento.observacao || "-"}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-red-600">
                                  {formatCurrency(parseFloat(String(adiantamento.saida)))}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-red-50">
                              <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-red-700">Total de Adiantamentos:</td>
                              <td className="px-4 py-2 text-right text-sm font-medium text-red-700">
                                {formatCurrency(
                                  caixa.adiantamentos.reduce((total: number, adiantamento: any) => {
                                    const valor = parseFloat(String(adiantamento.saida));
                                    return total + (isNaN(valor) ? 0 : valor);
                                  }, 0)
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
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
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Data</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Custo</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Cliente/Fornecedor</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Documento</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">Histórico</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Entrada</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Saída</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lancamentos.map((lancamento: any, index: number) => (
                          <tr key={lancamento.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(lancamento.data)}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{lancamento.custo || '-'}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{lancamento.clienteFornecedor || '-'}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{lancamento.numeroDocumento || '-'}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{lancamento.historicoDoc || '-'}</td>
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
                          <td colSpan={5} className="px-6 py-3 text-right text-sm">Totais (Lançamentos):</td>
                          <td className="px-6 py-3 text-right text-green-600 font-semibold">{formatCurrency(totalEntradas)}</td>
                          <td className="px-6 py-3 text-right text-red-600 font-semibold">{formatCurrency(totalSaidas)}</td>
                        </tr>
                        
                        {/* Adicionar linha para adiantamentos se existirem */}
                        {totalAdiantamentos > 0 && (
                          <tr className="bg-red-50 font-medium">
                            <td colSpan={6} className="px-6 py-3 text-right text-sm">Total de Adiantamentos:</td>
                            <td className="px-6 py-3 text-right text-red-600 font-semibold">{formatCurrency(totalAdiantamentos)}</td>
                          </tr>
                        )}

                        {/* Linha de saldo */}
                        <tr className="bg-gray-100">
                          <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium">Saldo (incluindo adiantamentos):</td>
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
