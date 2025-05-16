import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, DollarSign, User, Building, ArrowDownCircle, ArrowUpCircle, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaCorrenteCardProps {
  conta: any;
  onViewDetails: (conta: any) => void;
  onEdit: (conta: any) => void;
  onToggleVisibility: (conta: any) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const formatCurrency = (value: any): string => {
  // Converter para número e verificar se é válido
  const numericValue = Number(value);
  
  if (isNaN(numericValue)) {
    return "R$ 0,00";
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue);
};

const formatarData = (dataString?: string) => {
  if (!dataString) return "";
  
  try {
    // Se for uma data em formato ISO com 'T' (timestamp)
    if (dataString.includes('T')) {
      // Extrair apenas a parte da data (YYYY-MM-DD)
      const [ano, mes, dia] = dataString.split('T')[0].split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    // Se for formato ISO simples (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    // Para outros formatos
    const date = new Date(dataString);
    // Usar método manual para evitar problemas de timezone
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return dataString;
  }
};

// Função segura para calcular totais
const calcularValoresSeguros = (conta: any) => {
  // Garantir que lancamentos é um array
  const lancamentos = Array.isArray(conta?.lancamentos) ? conta.lancamentos : [];
  
  // Calcular créditos de forma segura
  const creditos = lancamentos
    .filter((l: any) => l?.credito && !isNaN(parseFloat(String(l.credito))))
    .reduce((sum: number, item: any) => sum + parseFloat(String(item.credito || "0")), 0);
  
  // Calcular débitos de forma segura  
  const debitos = lancamentos
    .filter((l: any) => l?.debito && !isNaN(parseFloat(String(l.debito))))
    .reduce((sum: number, item: any) => sum + parseFloat(String(item.debito || "0")), 0);
  
  // Calcular saldo (usar o da conta se disponível, senão calcular)
  const saldo = conta?.saldo !== undefined && !isNaN(Number(conta.saldo))
    ? Number(conta.saldo)
    : creditos - debitos;
  
  return { creditos, debitos, saldo };
};

const ContaCorrenteCard: React.FC<ContaCorrenteCardProps> = ({
  conta,
  onViewDetails,
  onEdit,
  onToggleVisibility,
  canEdit,
  canDelete
}) => {
  // Calcular o saldo
  const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
  interface Lancamento {
    credito?: string | number;
    debito?: string | number;
  }

  const creditos: number = lancamentos
    .filter((l: Lancamento) => l?.credito && !isNaN(parseFloat(String(l.credito))))
    .reduce((sum: number, item: Lancamento) => sum + parseFloat(String(item.credito || "0")), 0);
  
  const debitos: number = lancamentos
    .filter((l: Lancamento) => l?.debito && !isNaN(parseFloat(String(l.debito))))
    .reduce((sum: number, item: Lancamento) => sum + parseFloat(String(item.debito || "0")), 0);
  
  const saldo = creditos - debitos;
  
  // Determinar a classe de borda baseada no saldo
  const borderColorClass = saldo > 0 
    ? 'border-t-green-500' 
    : saldo < 0 
      ? 'border-t-red-500' 
      : 'border-t-blue-500'; // Azul para saldo zero

  // Adicionando lógica para determinar o nome da empresa
  const empresaNome = conta.empresa?.nome || 
                      conta.empresa?.nomeEmpresa || 
                      (conta.empresaId ? `Empresa #${conta.empresaId}` : '-');
  
  // Adicionar estado para o modal de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Modificar a função para gerar termo PDF para abrir o modal de confirmação em vez de gerar imediatamente
  const handleGerarTermoClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Evitar que abra o modal de detalhes
    setShowConfirmModal(true);
  };
  
  // Função para gerar o PDF após confirmação
  const confirmarGerarTermoPDF = async () => {
    try {
      setShowConfirmModal(false);
      const response = await fetch('/api/contacorrente/generate-termo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contaId: conta.id }),
      });

      if (!response.ok) throw new Error('Erro ao gerar termo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo_conta_corrente_${conta.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao gerar termo:', error);
      alert('Erro ao gerar o termo de conta corrente');
    }
  };

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100 ${borderColorClass} border-t-4 overflow-hidden`}
      >
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className={`rounded-full p-2 ${saldo >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <DollarSign size={20} />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {conta.fornecedorCliente || `Conta #${conta.id}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {formatarData(conta.data)} • {conta.colaborador?.nome || 'Sem colaborador'}
                </p>
              </div>
            </div>
            {conta.oculto && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                Oculto
              </span>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Saldo:</span>
              <div className={`font-semibold text-xl ${
                saldo > 0 
                  ? 'text-green-600' 
                  : saldo < 0 
                    ? 'text-red-600' 
                    : 'text-blue-600'
              }`}>
                {formatCurrency(saldo)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-xs font-medium text-green-700 flex items-center">
                  <ArrowDownCircle size={14} className="mr-1" />
                  Entradas
                </span>
                <div className="flex items-center">
                  <span className="text-green-600 font-medium">
                    {formatCurrency(creditos)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-xs font-medium text-red-700 flex items-center">
                  <ArrowUpCircle size={14} className="mr-1" />
                  Saídas
                </span>
                <div className="flex items-center">
                  <span className="text-red-600 font-medium">
                    {formatCurrency(debitos)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Mais detalhes */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Tipo:</span>
              <span className="text-sm text-gray-600">{conta.tipo}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Setor:</span>
              <span className="text-sm text-gray-600">{conta.setor || '-'}</span>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Empresa:</span>
              <span className="text-sm text-gray-600 truncate max-w-[60%] text-right" title={empresaNome}>
                {empresaNome}
              </span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Lançamentos:</span>
              <span className="text-sm text-gray-600">{Array.isArray(conta.lancamentos) ? conta.lancamentos.length : 0}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onViewDetails(conta)}
                className="text-blue-600 hover:text-blue-800"
                title="Ver detalhes"
              >
                <Eye size={18} />
              </button>
              
              {/* Botão de editar - só aparece com permissão */}
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="text-orange-600 hover:text-orange-800"
                  title="Editar"
                >
                  <Edit size={18} />
                </button>
              )}
              
              {/* Botão de excluir - só aparece com permissão */}
              {canDelete && (
                <button
                  onClick={onToggleVisibility}
                  className="text-red-600 hover:text-red-800"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              )}
              
              {/* Botão para gerar termo PDF - agora abre o modal de confirmação */}
              <button
                onClick={(e) => handleGerarTermoClick(e)}
                className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
                title="Gerar Termo"
              >
                <FileText size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-4"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Confirmar geração de termo</h3>
            <p className="text-gray-600 mb-4">
              Deseja gerar o termo em PDF para esta conta corrente?
            </p>
            
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarGerarTermoPDF}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
              >
                <FileText size={16} className="mr-2" />
                Gerar Termo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default ContaCorrenteCard;

// Se ainda não aparecer, verifique na chamada da API o retorno da empresa
const fetchMinhasContas = async () => {
  // Resto do código...
  // Declare and initialize contasArray
    const contasArray: any[] = []; // Replace with actual data source or API response
    const contasProcessadas = contasArray.map((conta: any) => {
    // Log temporário
    if (conta.empresaId) {
      console.log("Empresa da conta:", conta.id, {
        empresaId: conta.empresaId,
        empresa: conta.empresa
      });
    }
    
    // Resto do processamento...
  });
};