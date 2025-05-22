import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MapPin, Building, User, Calendar, 
  DollarSign, Eye, Edit, Trash2, Clock, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CaixaViagemCardProps {
  caixa: any;
  onViewDetails: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

const CaixaViagemCard = ({ 
  caixa, 
  onViewDetails, 
  onEdit, 
  onToggleVisibility,
  canEdit,
  canDelete
}: CaixaViagemCardProps) => {
  // Calcular totais e saldo
  const lancamentos = Array.isArray(caixa.lancamentos) ? caixa.lancamentos : [];
  
  const entradas = lancamentos
    .filter(l => l?.entrada && !isNaN(parseFloat(String(l.entrada))))
    .reduce((sum, item) => sum + parseFloat(String(item.entrada || "0")), 0);
  
  const saidas = lancamentos
    .filter(l => l?.saida && !isNaN(parseFloat(String(l.saida))))
    .reduce((sum, item) => sum + parseFloat(String(item.saida || "0")), 0);
  
  const saldo = entradas - saidas;

  // Formatar valores para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
    >
      {/* Cabeçalho do card */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-base">
                {caixa.destino || `Caixa #${caixa.id}`}
              </h3>
              <div className="flex items-center text-gray-500 text-xs mt-1">
                <Calendar size={14} className="mr-1" />
                {formatDate(caixa.data)}
              </div>
            </div>
          </div>

          <div className="flex">
            <button 
              onClick={onViewDetails}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"
              title="Ver detalhes"
            >
              <Eye size={16} />
            </button>
            
            {canEdit && (
              <button 
                onClick={onEdit}
                className="p-1.5 hover:bg-gray-100 rounded-full text-amber-600"
                title="Editar"
              >
                <Edit size={16} />
              </button>
            )}
            
            {canDelete && (
              <button 
                onClick={onToggleVisibility}
                className="p-1.5 hover:bg-gray-100 rounded-full text-red-600"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Corpo do card */}
      <div className="p-4">
        {/* Empresa/Funcionário */}
        <div className="mb-3">
          {caixa.empresa && (
            <div className="flex items-center text-gray-600 text-sm mb-1.5">
              <Building size={15} className="mr-2" />
              <span className="truncate">
                {caixa.empresa.nome || caixa.empresa.nomeEmpresa || 'Empresa não especificada'}
              </span>
            </div>
          )}
          
          {caixa.funcionario && (
            <div className="flex items-center text-gray-600 text-sm">
              <User size={15} className="mr-2" />
              <span className="truncate">
                {caixa.funcionario.nome} {caixa.funcionario.sobrenome || ''}
                {caixa.funcionario.setor ? ` (${caixa.funcionario.setor})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Resumo financeiro */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="bg-green-50 p-2 rounded-lg">
            <div className="flex items-center mb-1">
              <ArrowDownCircle size={14} className="text-green-600 mr-1" />
              <span className="text-green-700 text-xs font-medium">Entradas</span>
            </div>
            <div className="text-green-800 font-semibold">{formatCurrency(entradas)}</div>
          </div>
          
          <div className="bg-red-50 p-2 rounded-lg">
            <div className="flex items-center mb-1">
              <ArrowUpCircle size={14} className="text-red-600 mr-1" />
              <span className="text-red-700 text-xs font-medium">Saídas</span>
            </div>
            <div className="text-red-800 font-semibold">{formatCurrency(saidas)}</div>
          </div>
          
          <div className={`p-2 rounded-lg ${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <div className="flex items-center mb-1">
              <DollarSign size={14} className={`${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'} mr-1`} />
              <span className={`${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'} text-xs font-medium`}>Saldo</span>
            </div>
            <div className={`${saldo >= 0 ? 'text-blue-800' : 'text-orange-800'} font-semibold`}>
              {formatCurrency(saldo)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Rodapé do card */}
      <div className="bg-gray-50 p-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <Clock size={14} className="mr-1" />
          <span>Criado em {formatDate(caixa.createdAt)}</span>
        </div>
        <div>
          {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
        </div>
      </div>
    </motion.div>
  );
};

export default CaixaViagemCard;