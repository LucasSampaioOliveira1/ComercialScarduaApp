import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MapPin, Building, User, Calendar, Truck,
  DollarSign, Eye, Edit, Trash2, Clock, ArrowUpCircle, ArrowDownCircle,
  FileText, Link as LinkIcon // Importação do ícone LinkIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

// Atualizar a interface para incluir a propriedade onGenerateTermo
interface CaixaViagemCardProps {
  caixa: any;
  empresas?: any[];
  funcionarios?: any[];
  veiculos?: any[];
  onViewDetails: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onGenerateTermo: () => void; // Nova propriedade
  onAplicarAdiantamento: () => void; // Nova propriedade
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
  onGenerateTermo,
  onAplicarAdiantamento, // Garantir que este prop está sendo usado
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
  
  // Usar o saldo da API diretamente, em vez de recalcular
  const calcularSaldo = () => {
    // Usar o saldo já calculado pelo backend quando disponível
    if (caixa.saldo !== undefined) {
      // Calcular apenas entradas e saídas para exibição
      let totalEntradas = 0;
      let totalSaidas = 0;
      
      // Calcular entradas e saídas para exibição nos cards
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
      
      // Retornar o saldo da API e os totais calculados
      return {
        saldo: caixa.saldo, // Usar o valor calculado pelo backend
        entradas: totalEntradas,
        saidas: totalSaidas
      };
    }
    
    // Fallback para o cálculo local (caso o backend não tenha fornecido o saldo)
    // Garantir que estamos trabalhando com números
    const saldoAnterior = typeof caixa.saldoAnterior === 'number' 
      ? caixa.saldoAnterior 
      : parseFloat(String(caixa.saldoAnterior || 0));
    
    let totalEntradas = 0;
    let totalSaidas = 0;
    
    // Calcular entradas e saídas
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
    
    // O saldo é a soma do saldo anterior com entradas menos saídas
    return {
      saldo: saldoAnterior + totalEntradas - totalSaidas,
      entradas: totalEntradas,
      saidas: totalSaidas
    };
  };

  const { saldo, entradas, saidas } = calcularSaldo();

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
      
      // Último recurso com o método tradicional - evitando problemas de timezone
      const date = new Date(dateString);
      // Ajuste para evitar problemas com timezone
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      return format(adjustedDate, 'dd/MM/yyyy', { locale: ptBR });
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
      : 'border-t-blue-500'; // Azul para saldo zero

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className={`rounded-full p-2 ${
              saldo > 0 
                ? 'bg-green-100 text-green-600' 
                : saldo < 0 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-blue-100 text-blue-600'}`}>
              <User size={20} />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold mb-1 text-gray-900 flex items-center">
                {funcionario?.nome || "Sem Funcionário"} {funcionario?.sobrenome || ""} 
                {caixa.numeroCaixa && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full ml-2">
                    #{caixa.numeroCaixa}
                  </span>
                )}
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
            <div className={`text-lg font-semibold ${
              saldo > 0 
                ? 'text-green-600' 
                : saldo < 0 
                  ? 'text-red-600' 
                  : 'text-blue-600'}`}>
              {formatCurrency(saldo)}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            {caixa.saldoAnterior !== 0 && (
              <div className="text-xs text-gray-500">
                <span>
                  Saldo Inicial: {formatCurrency(Number(caixa.saldoAnterior))}
                </span>
              </div>
            )}
            <div className={`text-lg font-semibold ${
              saldo > 0 
                ? 'text-green-600' 
                : saldo < 0 
                  ? 'text-red-600' 
                  : 'text-blue-600'}`}>
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
              <MapPin size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
              <span className="ml-2 text-gray-600 truncate max-w-[calc(100%-20px)]">
                {caixa.destino || 'Sem destino'}
              </span>
            </div>
            
            <div className="flex items-start">
              <Building size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
              <span className="ml-2 text-gray-600 truncate max-w-[calc(100%-20px)]">
                {empresa?.nome || empresa?.nomeEmpresa || '-'}
              </span>
            </div>
            
            {caixa.veiculo && (
              <div className="flex items-start">
                <Truck size={14} className="mt-0.5 text-gray-500 flex-shrink-0" />
                <span className="ml-2 text-gray-600 truncate max-w-[calc(100%-20px)]">
                  {caixa.veiculo.nome ? 
                    `${caixa.veiculo.nome} (${caixa.veiculo.modelo || ''})` : 
                    caixa.veiculo.modelo} {caixa.veiculo.placa ? `- ${caixa.veiculo.placa}` : ''}
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
        
        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end space-x-3">
          <div className="flex items-center space-x-3">
            {/* Botão para aplicar adiantamento */}
            <button
              onClick={onAplicarAdiantamento}
              className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-full transition-colors"
              title="Aplicar Adiantamento"
            >
              <LinkIcon size={18} />
            </button>
            
            {/* Outros botões existentes... */}
            <button
              onClick={onGenerateTermo}
              className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
              title="Gerar Termo"
            >
              <FileText size={16} />
            </button>
            
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