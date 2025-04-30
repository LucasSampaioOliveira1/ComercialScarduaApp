import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, DollarSign, User, Building, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaCorrenteCardProps {
  conta: any;
  onViewDetails: () => void;
  onToggleVisibility: () => void;
  canEdit: boolean;
}

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

export default function ContaCorrenteCard({ conta, onViewDetails, onToggleVisibility, canEdit }: ContaCorrenteCardProps) {
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
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 15px -5px rgba(0, 0, 0, 0.1)' }}
      className={`bg-white rounded-lg shadow-sm overflow-hidden ${conta.oculto ? 'border border-dashed border-gray-300 bg-gray-50' : ''}`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className={`rounded-full p-2 ${conta.saldo >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <DollarSign size={20} />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {conta.fornecedorCliente || `Conta #${conta.id}`}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(conta.data)} • {conta.user?.nome} {conta.user?.sobrenome}
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
            <span className={`text-lg font-bold ${conta.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(conta.saldo)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-xs font-medium text-green-700 flex items-center">
                <ArrowDownCircle size={14} className="mr-1" />
                Entradas
              </span>
              <span className="text-sm font-bold text-green-700">{formatCurrency(totalEntradas)}</span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-red-50 rounded">
              <span className="text-xs font-medium text-red-700 flex items-center">
                <ArrowUpCircle size={14} className="mr-1" />
                Saídas
              </span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(totalSaidas)}</span>
            </div>
          </div>
          
          {/* Mais detalhes */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Tipo:</span>
            <span className="text-sm text-gray-800">{conta.tipo}</span>
          </div>
          
          {conta.setor && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Veículo/Setor:</span>
              <span className="text-sm text-gray-800">{conta.setor}</span>
            </div>
          )}
          
          {conta.empresa && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Empresa:</span>
              <span className="text-sm text-gray-800">{conta.empresa.nome}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Lançamentos:</span>
            <span className="text-sm text-gray-800">{conta.lancamentos.length}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onViewDetails}
            className="text-[#344893] hover:text-blue-700 text-sm font-medium flex items-center"
          >
            <Eye size={16} className="mr-1" />
            Detalhes
          </button>
          
          {canEdit && (
            <button
              onClick={onToggleVisibility}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center"
            >
              {conta.oculto ? (
                <>
                  <Eye size={16} className="mr-1" />
                  Mostrar
                </>
              ) : (
                <>
                  <EyeOff size={16} className="mr-1" />
                  Ocultar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}