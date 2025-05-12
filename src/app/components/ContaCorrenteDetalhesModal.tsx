import React, { JSX } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, FileText, Calendar, Building, User, ArrowDownCircle, ArrowUpCircle, Download, Edit, Briefcase, Tag, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ContaCorrenteDetalhesModalProps {
  conta: any;
  onClose: () => void;
  onEdit: () => void;
  canEdit?: boolean;
}

export default function ContaCorrenteDetalhesModal({ conta, onClose, onEdit, canEdit }: ContaCorrenteDetalhesModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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

  // Garantir acesso correto aos dados da empresa
  const empresaNome = conta.empresa?.nome || 
                     conta.empresa?.nomeEmpresa ||
                     (typeof conta.empresa === 'string' ? conta.empresa : '-');

  // Calcular totais
  const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
  const totalEntradas = lancamentos.reduce(
    (sum: number, l: any) => sum + (l.credito ? parseFloat(l.credito) || 0 : 0), 
    0
  );
  
  const totalSaidas = lancamentos.reduce(
    (sum: number, l: any) => sum + (l.debito ? parseFloat(l.debito) || 0 : 0), 
    0
  );
  
  const saldo = totalEntradas - totalSaidas;

  // Função para exportar para Excel
  const exportToExcel = () => {
    // Preparar os dados dos lançamentos
    const lancamentosData = lancamentos.map((l: any) => ({
      'Data': formatDate(l.data),
      'Documento': l.numeroDocumento || '-',
      'Observação': l.observacao || '-',
      'Crédito (R$)': l.credito ? parseFloat(l.credito).toFixed(2).replace('.', ',') : '-',
      'Débito (R$)': l.debito ? parseFloat(l.debito).toFixed(2).replace('.', ',') : '-'
    }));
    
    // Adicionar linha de totais
    lancamentosData.push({
      'Data': '',
      'Documento': '',
      'Observação': 'TOTAIS',
      'Crédito (R$)': totalEntradas.toFixed(2).replace('.', ','),
      'Débito (R$)': totalSaidas.toFixed(2).replace('.', ',')
    });
    
    // Preparar os dados de cabeçalho da conta
    const cabecalhoData = [
      { 'Informação': 'Fornecedor/Cliente', 'Valor': conta.fornecedorCliente || '-' },
      { 'Informação': 'Empresa', 'Valor': empresaNome },
      { 'Informação': 'Tipo', 'Valor': conta.tipo || '-' },
      { 'Informação': 'Setor', 'Valor': conta.setor || '-' },
      { 'Informação': 'Data', 'Valor': formatDate(conta.data) },
      { 'Informação': 'Responsável', 'Valor': conta.colaborador?.nome ? `${conta.colaborador.nome} ${conta.colaborador.sobrenome || ''}` : '-' },
      { 'Informação': 'Observações', 'Valor': conta.observacao || '-' },
      { 'Informação': 'Total Entradas', 'Valor': formatCurrency(totalEntradas).replace('R$', '').trim() },
      { 'Informação': 'Total Saídas', 'Valor': formatCurrency(totalSaidas).replace('R$', '').trim() },
      { 'Informação': 'Saldo', 'Valor': formatCurrency(saldo).replace('R$', '').trim() }
    ];

    // Criar um workbook
    const wb = XLSX.utils.book_new();
    
    // Criar worksheet com as informações da conta
    const wsCabecalho = XLSX.utils.json_to_sheet(cabecalhoData);
    
    // Adicionar estilos aos cabeçalhos da planilha de cabeçalho
    wsCabecalho['!cols'] = [{ wch: 20 }, { wch: 40 }];
    
    // Criar worksheet com os lançamentos
    const wsLancamentos = XLSX.utils.json_to_sheet(lancamentosData);
    
    // Ajustar largura das colunas na planilha de lançamentos
    wsLancamentos['!cols'] = [
      { wch: 12 }, // Data
      { wch: 15 }, // Documento
      { wch: 40 }, // Observação
      { wch: 15 }, // Crédito
      { wch: 15 }  // Débito
    ];
    
    // Adicionar as worksheets ao workbook
    XLSX.utils.book_append_sheet(wb, wsCabecalho, "Informações da Conta");
    XLSX.utils.book_append_sheet(wb, wsLancamentos, "Lançamentos");
    
    // Gerar o arquivo Excel
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Criar nome de arquivo com data atual
    const hoje = format(new Date(), 'dd-MM-yyyy', { locale: ptBR });
    const nomeArquivo = `Conta_${conta.id || ''}_${conta.fornecedorCliente || 'SemNome'}_${hoje}.xlsx`;
    
    // Fazer download do arquivo
    saveAs(data, nomeArquivo);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Cabeçalho simplificado */}
        <div className="bg-blue-50 p-4 rounded-t-xl relative border-b border-blue-100 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {conta.fornecedorCliente || `Conta #${conta.id}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 rounded-full p-1.5 transition-all duration-200"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Resumo financeiro */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg">
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
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Saídas</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(totalSaidas)}</p>
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
                  <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
                <div className={`${saldo >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full p-1.5`}>
                  <DollarSign size={16} className={saldo >= 0 ? 'text-green-600' : 'text-red-600'} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Informações em duas colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Informações básicas */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-800 flex items-center text-sm">
                  <Info size={16} className="mr-2 text-blue-600" />
                  Informações Básicas
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Building size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Empresa</p>
                      <p className="font-medium text-gray-900">{empresaNome}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Tag size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="font-medium text-gray-900">{conta.tipo}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Briefcase size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Setor</p>
                      <p className="font-medium text-gray-900">{conta.setor || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Detalhes adicionais */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-800 flex items-center text-sm">
                  <Clock size={16} className="mr-2 text-blue-600" />
                  Detalhes Adicionais
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <User size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Colaborador</p>
                      <p className="font-medium text-gray-900">
                        {conta.colaborador?.nome} {conta.colaborador?.sobrenome || '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Calendar size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Data</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {(() => {
                          // Verificar se a data existe
                          if (!conta.data) return "";
                          
                          try {
                            // Se for uma string ISO com timezone (formato completo)
                            if (conta.data.includes('T')) {
                              // Extrair apenas a parte da data e formatar manualmente
                              const [ano, mes, dia] = conta.data.split('T')[0].split('-');
                              return `${dia}/${mes}/${ano}`;
                            }
                            
                            // Se já estiver no formato YYYY-MM-DD
                            if (/^\d{4}-\d{2}-\d{2}$/.test(conta.data)) {
                              const [ano, mes, dia] = conta.data.split('-');
                              return `${dia}/${mes}/${ano}`;
                            }
                            
                            // Para outros formatos, tentar formatar usando date-fns
                            return format(new Date(conta.data), 'dd/MM/yyyy', { locale: ptBR });
                          } catch (error) {
                            console.error("Erro ao formatar data:", error, conta.data);
                            return String(conta.data);
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conta.oculto ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {conta.oculto ? 'Oculto' : 'Visível'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fornecedor/Cliente e Observações */}
          {(conta.fornecedorCliente || conta.observacao) && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-6">
              {conta.observacao && (
                <p className="text-sm text-gray-600 italic mb-2">"{conta.observacao}"</p>
              )}
            </div>
          )}

          {/* Lançamentos */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-gray-800 flex items-center">
                <FileText size={18} className="mr-2 text-blue-600" />
                Lançamentos
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {lancamentos.length} item(s)
              </span>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Débito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lancamentos.map((lancamento: any, index: number) => (
                      <tr key={lancamento.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(lancamento.data)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {lancamento.numeroDocumento || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">
                          {lancamento.observacao || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                          {lancamento.credito ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(parseFloat(lancamento.credito) || 0)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                          {lancamento.debito ? (
                            <span className="font-medium text-red-600">
                              {formatCurrency(parseFloat(lancamento.debito) || 0)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                    {lancamentos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                          Nenhum lançamento encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 text-right font-medium text-gray-700">Totais:</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span className="text-green-600 font-semibold">{formatCurrency(totalEntradas)}</span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span className="text-red-600 font-semibold">{formatCurrency(totalSaidas)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Fechar
            </button>
            
            {canEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-[#344893] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={18} className="mr-2" />
                Editar Conta
              </button>
            )}
            
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center font-medium"
            >
              <Download size={16} className="mr-2" />
              Exportar Excel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}