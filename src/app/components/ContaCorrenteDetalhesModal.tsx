import React from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, FileText, Calendar, MapPin, Building, User, ArrowDownCircle, ArrowUpCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaCorrenteDetalhesModalProps {
  conta: any;
  onClose: () => void;
  onEdit: () => void;
}

export default function ContaCorrenteDetalhesModal({ conta, onClose, onEdit }: ContaCorrenteDetalhesModalProps) {
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
      return dateString;
    }
  };

  // Calcular totais
  const totalEntradas = conta.lancamentos.reduce(
    (sum: number, l: any) => sum + (l.credito ? parseFloat(l.credito) || 0 : 0), 
    0
  );
  
  const totalSaidas = conta.lancamentos.reduce(
    (sum: number, l: any) => sum + (l.debito ? parseFloat(l.debito) || 0 : 0), 
    0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Cabeçalho */}
        <div className="bg-blue-700 text-white p-6 flex justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {conta.fornecedorCliente || `Conta Corrente #${conta.id}`}
            </h2>
            <p className="text-blue-100">
              {formatDate(conta.data)} • {conta.user?.nome} {conta.user?.sobrenome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Cards com resumos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-start">
                <div className={`rounded-full p-2 ${conta.saldo >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <DollarSign size={24} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Saldo Total</p>
                  <p className={`text-xl font-bold ${conta.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(conta.saldo)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-start">
                <div className="rounded-full p-2 bg-green-100 text-green-600">
                  <ArrowDownCircle size={24} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total de Entradas</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(totalEntradas)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-start">
                <div className="rounded-full p-2 bg-red-100 text-red-600">
                  <ArrowUpCircle size={24} />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-500">Total de Saídas</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(totalSaidas)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Informações da conta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-gray-700">Informações Gerais</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Tipo:</span>
                  <span className="text-sm">{conta.tipo}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Data:</span>
                  <span className="text-sm">{formatDate(conta.data)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Fornecedor/Cliente:</span>
                  <span className="text-sm">{conta.fornecedorCliente || '-'}</span>
                </div>
                
                {conta.setor && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Veículo/Setor:</span>
                    <span className="text-sm">{conta.setor}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-gray-700">Entidade Relacionada</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Usuário:</span>
                  <span className="text-sm flex items-center">
                    <User size={14} className="mr-1 text-blue-500" />
                    {conta.user?.nome} {conta.user?.sobrenome}
                  </span>
                </div>
                
                {conta.empresa && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Empresa:</span>
                    <span className="text-sm flex items-center">
                      <Building size={14} className="mr-1 text-blue-500" />
                      {conta.empresa.nome}
                    </span>
                  </div>
                )}
                
                {conta.colaborador && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Colaborador:</span>
                    <span className="text-sm flex items-center">
                      <User size={14} className="mr-1 text-blue-500" />
                      {conta.colaborador.nome} {conta.colaborador.sobrenome}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          {conta.observacao && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-gray-700">Observações</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">{conta.observacao}</p>
              </div>
            </div>
          )}

          {/* Tabela de lançamentos */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-gray-700">Lançamentos</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Histórico
                    </th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrada
                    </th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saída
                    </th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conta.lancamentos.map((lancamento: any, index: number) => {
                    // Calcular saldo acumulativo
                    const saldoAteAqui = conta.lancamentos.slice(0, index + 1).reduce(
                      (acc: number, l: any) => 
                        acc + (l.credito ? parseFloat(l.credito) || 0 : 0) - 
                              (l.debito ? parseFloat(l.debito) || 0 : 0),
                      0
                    );
                    
                    return (
                      <tr key={lancamento.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
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
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right">
                          <span className={saldoAteAqui >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(saldoAteAqui)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-sm font-bold text-right">
                      Totais:
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-right text-green-600">
                      {formatCurrency(totalEntradas)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-right text-red-600">
                      {formatCurrency(totalSaidas)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-right">
                      <span className={conta.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(conta.saldo)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="mt-8 flex justify-between border-t pt-6">
            <div>
              <button 
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Editar Conta
              </button>
            </div>
            <div className="space-x-3">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  // Lógica para exportar extrato
                }}
              >
                <Download size={16} className="inline-block mr-1" />
                Exportar Extrato
              </button>
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}