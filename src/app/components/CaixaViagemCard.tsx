import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MapPin, Building, User, Calendar, Truck,
  DollarSign, Eye, Edit, Trash2, Clock, ArrowUpCircle, ArrowDownCircle,
  FileText, Link as LinkIcon
} from 'lucide-react';

interface CaixaViagemCardProps {
  caixa: any;
  empresas?: any[];
  funcionarios?: any[];
  veiculos?: any[];
  onViewDetails: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onGenerateTermo: () => void;
  onAplicarAdiantamento: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

interface Adiantamento {
  id: number;
  saida: string | number;
}

interface Lancamento {
  entrada?: number | string | null;
  saida?: number | string | null;
}

const CaixaViagemCard = ({ 
  caixa, 
  empresas,
  funcionarios,
  veiculos,
  onViewDetails, 
  onEdit, 
  onToggleVisibility,
  onGenerateTermo,
  onAplicarAdiantamento,
  canEdit,
  canDelete
}: CaixaViagemCardProps) => {
  // Calcular totais e saldo
  const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
  
  // Encontrar entidades relacionadas
  const empresa = caixa.empresa || empresas?.find(emp => emp.id === caixa.empresaId);
  const funcionario = caixa.funcionario || funcionarios?.find(func => func.id === caixa.funcionarioId);
  const veiculo = caixa.veiculo || veiculos?.find(veic => veic.id === caixa.veiculoId);
  
  const calcularSaldo = () => {
    const saldoAnterior = typeof caixa.saldoAnterior === 'number' 
      ? caixa.saldoAnterior 
      : parseFloat(String(caixa.saldoAnterior || 0));
    
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalAdiantamentos = 0;
    
    if (Array.isArray(caixa.lancamentos)) {
      caixa.lancamentos.forEach((lancamento: Lancamento) => {
        if (lancamento.entrada) {
          const valorEntrada: number = parseFloat(String(lancamento.entrada).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(valorEntrada)) {
            totalEntradas += valorEntrada;
          }
        }
        if (lancamento.saida) {
          const valorSaida: number = parseFloat(String(lancamento.saida).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(valorSaida)) {
            totalSaidas += valorSaida;
          }
        }
      });
    }

    if (Array.isArray(caixa.adiantamentos)) {
      caixa.adiantamentos.forEach((adiantamento: Adiantamento) => {
        if (adiantamento.saida) {
          const valorAdiantamento: number = parseFloat(String(adiantamento.saida).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(valorAdiantamento)) {
            totalAdiantamentos += valorAdiantamento;
          }
        }
      });
    }
    
    const saldoCalculado = saldoAnterior + totalEntradas + totalAdiantamentos - totalSaidas;
    
    return {
      saldo: saldoCalculado, 
      entradas: totalEntradas + totalAdiantamentos, // Incluir adiantamentos nas entradas totais
      saidas: totalSaidas, // Manter apenas saídas dos lançamentos
      saldoAnterior: saldoAnterior,
      totalAdiantamentos: totalAdiantamentos
    };
  };

  const { saldo, entradas, saidas, saldoAnterior, totalAdiantamentos } = calcularSaldo();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      
      if (dateString.includes('T')) {
        const [datePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
      }
      
      const date = new Date(dateString);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      return format(adjustedDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden backdrop-blur-sm">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header Compacto */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center flex-1 min-w-0">
            <div className={`rounded-xl p-2.5 shadow-sm transition-all duration-300 group-hover:scale-105 ${
              saldo > 0 
                ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-600' 
                : saldo < 0 
                  ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-600' 
                  : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600'}`}>
              <User size={18} />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {funcionario?.nome?.trim() || "Sem Funcionário"} {funcionario?.sobrenome?.trim() || ""}
                </h3>
                {caixa.numeroCaixa && (
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-lg shadow-sm">
                    #{caixa.numeroCaixa}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center">
                <Calendar size={12} className="mr-1" />
                {formatDate(caixa.data)}
              </p>
            </div>
          </div>
          {caixa.oculto && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg">
              Oculto
            </span>
          )}
        </div>
        
        {/* Saldo Compacto */}
        <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 rounded-xl p-3 mb-3 border border-gray-100/50 group-hover:border-blue-200/50 transition-colors duration-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600">Saldo</span>
            <div className={`text-lg font-bold transition-colors duration-300 ${
              saldo > 0 
                ? 'text-green-600 group-hover:text-green-700' 
                : saldo < 0 
                  ? 'text-red-600 group-hover:text-red-700' 
                  : 'text-blue-600 group-hover:text-blue-700'}`}>
              {formatCurrency(saldo)}
            </div>
          </div>
          
          {saldoAnterior !== 0 && (
            <div className="text-xs text-gray-500 mb-2">
              Inicial: <span className="font-medium text-gray-600">{formatCurrency(saldoAnterior)}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            {/* ALTERAÇÃO: Entradas agora incluem adiantamentos e mantém cor verde */}
            <div className="bg-green-50 border border-green-100 rounded-lg p-2 transition-all duration-200 group-hover:bg-green-100/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700 flex items-center">
                  <ArrowUpCircle size={10} className="mr-1" />
                  Entradas
                </span>
                <span className="text-green-600 font-medium text-xs">
                  {formatCurrency(entradas)}
                </span>
              </div>
            </div>
            
            {/* Saídas mantém apenas os lançamentos de saída */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 transition-all duration-200 group-hover:bg-red-100/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-700 flex items-center">
                  <ArrowDownCircle size={10} className="mr-1" />
                  Saídas
                </span>
                <span className="text-red-600 font-medium text-xs">
                  {formatCurrency(saidas)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Informações Compactas */}
        <div className="space-y-2 mb-3 flex-1">
          <div className="flex items-center text-xs">
            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
            <span className="ml-2 text-gray-700 font-medium truncate">
              {caixa.destino || 'Sem destino'}
            </span>
          </div>
          
          <div className="flex items-center text-xs">
            <Building size={12} className="text-gray-400 flex-shrink-0" />
            <span className="ml-2 text-gray-600 truncate">
              {empresa?.nome || empresa?.nomeEmpresa || 'Sem empresa'}
            </span>
          </div>
          
          {veiculo && (
            <div className="flex items-center text-xs">
              <Truck size={12} className="text-gray-400 flex-shrink-0" />
              <span className="ml-2 text-gray-600 truncate">
                {veiculo.nome || veiculo.modelo} 
                {veiculo.placa && <span className="text-gray-500"> - {veiculo.placa}</span>}
              </span>
            </div>
          )}
          
          <div className="flex items-center text-xs">
            <DollarSign size={12} className="text-gray-400 flex-shrink-0" />
            <span className="ml-2 text-gray-600">
              {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* ALTERAÇÃO: Badge Adiantamentos agora em verde (entrada positiva) */}
        {Array.isArray(caixa.adiantamentos) && caixa.adiantamentos.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-green-700 flex items-center">
                <ArrowUpCircle size={10} className="mr-1" />
                Adiantamentos
              </span>
              <span className="text-xs font-bold text-green-600">
                {formatCurrency(totalAdiantamentos)}
              </span>
            </div>
            <div className="text-xs text-green-600 mt-1 opacity-75">
              {caixa.adiantamentos.length} adiantamento{caixa.adiantamentos.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        
        {/* Botões Modernos */}
        <div className="pt-3 border-t border-gray-100 mt-auto">
          <div className="flex justify-end gap-1">
            <button
              onClick={onAplicarAdiantamento}
              className="p-2 text-teal-600 hover:text-white hover:bg-teal-500 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-teal-200"
              title="Aplicar Adiantamento"
            >
              <LinkIcon size={16} />
            </button>
            
            <button
              onClick={onGenerateTermo}
              className="p-2 text-orange-600 hover:text-white hover:bg-orange-500 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-orange-200"
              title="Gerar Termo"
            >
              <FileText size={16} />
            </button>
            
            <button
              onClick={onViewDetails}
              className="p-2 text-blue-600 hover:text-white hover:bg-blue-500 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-200"
              title="Ver detalhes"
            >
              <Eye size={16} />
            </button>
            
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-amber-600 hover:text-white hover:bg-amber-500 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-amber-200"
                title="Editar"
              >
                <Edit size={16} />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={onToggleVisibility}
                className="p-2 text-red-600 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-200"
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