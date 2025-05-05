import React from 'react';
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

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return dateString;
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

export default function ContaCorrenteCard({ conta, onViewDetails, onEdit, onToggleVisibility, canEdit }: ContaCorrenteCardProps) {
  // Debugging para verificar a estrutura
  console.log("Conta recebida no card:", {
    id: conta.id,
    fornecedorCliente: conta.fornecedorCliente,
    empresa: conta.empresa,
    empresaId: conta.empresaId
  });

  // Garantir acesso correto aos dados da empresa
  const empresaNome = conta.empresa?.nome || 
                     conta.empresa?.nomeEmpresa || // Possível variação no nome da propriedade
                     (typeof conta.empresa === 'string' ? conta.empresa : '-');
  
  // Calcular valores de forma segura
  const { creditos, debitos, saldo } = calcularValoresSeguros(conta);

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 15px -5px rgba(0, 0, 0, 0.1)' }}
      className={`bg-white rounded-lg shadow-sm overflow-hidden ${conta.oculto ? 'border border-dashed border-gray-300 bg-gray-50' : ''}`}
    >
      <div className={`h-2 ${saldo >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
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
              <p className="text-sm text-gray-500">
                {formatDate(conta.data)} • {conta.colaborador?.nome} {conta.colaborador?.sobrenome || ''}
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
            <div className={`font-semibold text-xl ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <span className="text-sm font-medium text-gray-600">Tipo:</span>
            <span className="text-sm text-gray-800">{conta.tipo}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Setor:</span>
            <span className="text-sm text-gray-800">{conta.setor || '-'}</span>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Empresa:</span>
            <span className="text-sm text-gray-800">{empresaNome}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Lançamentos:</span>
            <span className="text-sm text-gray-800">{Array.isArray(conta.lancamentos) ? conta.lancamentos.length : 0}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={() => onViewDetails(conta)}
            className="text-[#344893] hover:text-blue-700 text-sm font-medium flex items-center"
          >
            <Eye size={16} className="mr-1" />
            Detalhes
          </button>
          
          {canEdit && (
            <>
              <button
                onClick={() => onEdit(conta)}
                className="text-orange-500 hover:text-orange-700 text-sm font-medium flex items-center"
              >
                <Edit size={16} className="mr-1" />
                Editar
              </button>
              
              <button
                onClick={() => onToggleVisibility(conta)}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Excluir
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

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