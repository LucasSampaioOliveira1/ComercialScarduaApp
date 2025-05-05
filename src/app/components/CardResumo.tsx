import React, { ReactNode } from 'react';

interface CardResumoProps {
  titulo: string;
  valor: string | number;
  icone: ReactNode;
  cor: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
}

const CardResumo: React.FC<CardResumoProps> = ({ titulo, valor, icone, cor }) => {
  // Mapeia cores para classes do Tailwind - ajustado para o estilo do sistema
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-[#344893]',
      icon: 'text-[#344893]',
      iconBg: 'bg-white',
      border: 'border-blue-100'
    },
    green: {
      bg: 'bg-green-50', 
      text: 'text-green-600',
      icon: 'text-green-500',
      iconBg: 'bg-white',
      border: 'border-green-100'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      icon: 'text-red-500',
      iconBg: 'bg-white',
      border: 'border-red-100'
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      icon: 'text-orange-500',
      iconBg: 'bg-white',
      border: 'border-orange-100'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      icon: 'text-purple-500',
      iconBg: 'bg-white',
      border: 'border-purple-100'
    },
    gray: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      icon: 'text-gray-500',
      iconBg: 'bg-white',
      border: 'border-gray-100'
    }
  };

  const colorClasses = colorMap[cor];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden`}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-medium text-gray-500">{titulo}</h2>
          <p className={`text-2xl font-bold mt-1 ${colorClasses.text}`}>{valor}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses.bg}`}>
          <div className={colorClasses.icon}>{icone}</div>
        </div>
      </div>
      
      {/* Linha sutil para separação visual */}
      <div 
        className={`absolute bottom-0 left-0 h-1 w-full opacity-70 ${
          cor === 'blue' ? 'bg-[#344893]' : 
          cor === 'green' ? 'bg-green-500' :
          cor === 'red' ? 'bg-red-500' :
          cor === 'orange' ? 'bg-orange-500' :
          cor === 'purple' ? 'bg-purple-500' : 'bg-gray-500'
        }`}
      ></div>
    </div>
  );
};

export default CardResumo;