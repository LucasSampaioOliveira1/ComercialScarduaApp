import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MapPin, Building, User, Calendar, Truck,
  DollarSign, Eye, Edit, Trash2, Clock, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CaixaViagemCardProps {
  caixa: any;
  empresas?: any[];
  funcionarios?: any[];
  veiculos?: any[];
  onViewDetails: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

const CaixaViagemCard = ({ 
  caixa, 
  empresas,
  funcionarios,
  veiculos,
  onViewDetails, 
  onEdit, 
  onToggleVisibility,
  canEdit,
  canDelete
}: CaixaViagemCardProps) => {
  // Calcular totais e saldo
  const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
  
  // Encontrar entidades relacionadas
  const empresa = caixa.empresa || empresas?.find(emp => emp.id === caixa.empresaId);
  const funcionario = caixa.funcionario || funcionarios?.find(func => func.id === caixa.funcionarioId);
  const veiculo = caixa.veiculo || veiculos?.find(veic => veic.id === caixa.veiculoId);
  
  interface Lancamento {
    entrada?: number | string | null;
    saida?: number | string | null;
  }
  
  const entradas: number = lancamentos
    .filter((l: Lancamento) => l?.entrada && !isNaN(parseFloat(String(l.entrada).replace(/[^\d.,]/g, '').replace(',', '.'))))
    .reduce((sum: number, item: Lancamento) => {
      const valor = parseFloat(String(item.entrada || "0").replace(/[^\d.,]/g, '').replace(',', '.'));
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
  
  const saidas: number = lancamentos
    .filter((l: Lancamento) => l?.saida && !isNaN(parseFloat(String(l.saida).replace(/[^\d.,]/g, '').replace(',', '.'))))
    .reduce((sum: number, item: Lancamento) => {
      const valor = parseFloat(String(item.saida || "0").replace(/[^\d.,]/g, '').replace(',', '.'));
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
  
  const saldo = entradas - saidas;

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

  // Determinar a classe de borda baseada no saldo
  const borderColorClass = saldo > 0 
    ? 'border-t-green-500' 
    : saldo < 0 
      ? 'border-t-red-500' 
      : 'border-t-blue-500';

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100 ${borderColorClass} border-t-4 overflow-hidden`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className={`rounded-full p-2 ${saldo >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <MapPin size={20} />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
                {caixa.destino || `Caixa #${caixa.id}`}
              </h3>
              <p className="text-sm text-gray-600">
                {formatDate(caixa.data)}
              </p>
            </div>
          </div>
          {caixa.oculto && (
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
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-xs font-medium text-green-700 flex items-center">
                <ArrowDownCircle size={14} className="mr-1" />
                Entradas
              </span>
              <div className="flex items-center">
                <span className="text-green-600 font-medium">
                  {formatCurrency(entradas)}
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
                  {formatCurrency(saidas)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Detalhes */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <Building size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
              <span className="ml-2 text-gray-600 truncate max-w-[calc(100%-20px)]">
                {empresa?.nome || empresa?.nomeEmpresa || '-'}
              </span>
            </div>
            
            <div className="flex items-start">
              <User size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
              <span className="ml-2 text-gray-600 truncate max-w-[calc(100%-20px)]">
                {funcionario ? `${funcionario.nome} ${funcionario.sobrenome || ''}` : '-'}
              </span>
            </div>
            
            {veiculo && (
              <div className="flex items-start">
                <Truck size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
                <span className="ml-2 text-gray-600 truncate max-w-[calc(100%-20px)]">
                  {veiculo.placa ? `${veiculo.modelo} - ${veiculo.placa}` : veiculo.modelo || '-'}
                </span>
              </div>
            )}
            
            <div className="flex items-start">
              <DollarSign size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
              <span className="ml-2 text-gray-600">
                {lancamentos.length} lançamentos
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end space-x-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={onViewDetails}
              className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-full transition-colors"
              title="Ver detalhes"
            >
              <Eye size={16} />
            </button>
            
            {canEdit && (
              <button
                onClick={onEdit}
                className="text-amber-600 hover:text-amber-800 p-1.5 hover:bg-amber-50 rounded-full transition-colors"
                title="Editar"
              >
                <Edit size={16} />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={onToggleVisibility}
                className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                title="Excluir/Ocultar"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaixaViagemCard;