"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Package, Users, Clock, ChevronRight, Activity } from 'lucide-react';

// Registrar os componentes do Chart.js
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
);

// Interfaces
interface User {
  id: string;
  nome: string;
  email: string;
  createdAt: string;
}

interface Patrimonio {
  id: number;
  nome: string;
  tipo: string;
  createdAt: string;
  responsavel: {
    id: string;
    nome: string;
    sobrenome: string;
  };
  ultimaMovimentacao?: {
    tipo: string;
    data: string;
    autor: {
      nome: string;
      sobrenome: string;
    };
  } | null;
}

interface PatrimonioStats {
  porTipo: { [key: string]: number };
  porSetor: { [key: string]: number };
  movimentacoesPorMes: { [key: string]: number };
}

export default function Home() {
  // States
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [totalPatrimonios, setTotalPatrimonios] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patrimonioStats, setPatrimonioStats] = useState<PatrimonioStats>({
    porTipo: {},
    porSetor: {},
    movimentacoesPorMes: {}
  });

  const router = useRouter();

  // Efeito para verificar autenticação
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      setUserData(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setLoading(false);
      router.push("/login");
    }
  }, [router]);

  // Efeito para carregar dados básicos
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token não encontrado.");
        setLoading(false);
        return;
      }

      try {
        const [patrimoniosResponse, usuariosResponse] = await Promise.all([
          fetch(`/api/patrimonio?home=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/usuarios?home=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!patrimoniosResponse.ok || !usuariosResponse.ok) {
          throw new Error("Erro ao buscar dados");
        }

        const patrimoniosData = await patrimoniosResponse.json();
        const usuariosData = await usuariosResponse.json();

        setPatrimonios(patrimoniosData.ultimosPatrimonios || []);
        setUsuarios(usuariosData.ultimosUsuarios || []);
        setTotalPatrimonios(patrimoniosData.totalPatrimonios || 0);
        setTotalUsuarios(usuariosData.totalUsuarios || 0);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setError("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Efeito para carregar estatísticas
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch("/api/patrimonio/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const stats = await response.json();
          setPatrimonioStats(stats);
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

  // Adicionar um useEffect para manipular o DOM
  useEffect(() => {
    // Adicionar CSS para animação de aceno (wave)
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes wave {
        0% { transform: rotate(0deg); }
        10% { transform: rotate(14deg); }
        20% { transform: rotate(-8deg); }
        30% { transform: rotate(14deg); }
        40% { transform: rotate(-4deg); }
        50% { transform: rotate(10deg); }
        60% { transform: rotate(0deg); }
        100% { transform: rotate(0deg); }
      }
      .animate-wave {
        animation: wave 2.5s ease-in-out infinite;
        transform-origin: 70% 70%;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);

    // Função de limpeza para remover o estilo quando o componente for desmontado
    return () => {
      document.head.removeChild(style);
    };
  }, []); // Array vazio para executar apenas uma vez na montagem do componente

  // Configuração dos gráficos com cores mais distintas e contrastantes
  const chartColors = {
    // Nova paleta de cores distintas para o gráfico de pizza
    primary: [
      '#3366cc', // Azul
      '#fd7e14', // Laranja 
      '#28a745', // Verde
      '#dc3545', // Vermelho
      '#6f42c1', // Roxo
      '#20c997', // Turquesa
      '#ffc107', // Amarelo
      '#e83e8c', // Rosa
      '#6c757d', // Cinza
      '#17a2b8'  // Azul claro
    ],
    // Novos tons de azul mais escuros para o gráfico de barras (setores)
    tertiary: [
      '#1a237e', // Azul escuro
      '#283593', // Azul índigo escuro
      '#303f9f', // Azul índigo
      '#3949ab', // Azul índigo médio
      '#3f51b5', // Azul índigo primário
      '#5c6bc0'  // Azul índigo claro
    ],
    accent: '#344893',
    background: 'rgba(255, 255, 255, 0.8)'
  };

  const pieChartData = {
    labels: Object.keys(patrimonioStats.porTipo),
    datasets: [
      {
        data: Object.values(patrimonioStats.porTipo),
        backgroundColor: chartColors.primary,
        borderColor: chartColors.background,
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const pieChartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          boxWidth: 8,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: 12,
        cornerRadius: 6,
        boxPadding: 6
      }
    },
    cutout: '40%'
  };

  const barChartData = {
    labels: Object.keys(patrimonioStats.porSetor),
    datasets: [
      {
        label: 'Patrimônios por Setor',
        data: Object.values(patrimonioStats.porSetor),
        // Use a nova paleta de azuis escuros
        backgroundColor: chartColors.tertiary,
        // Ajuste a opacidade da borda para combinar com as cores
        borderColor: chartColors.tertiary.map(color => color.replace(')', ', 0.9)').replace('#', 'rgba(')),
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 35,
      },
    ],
  };

  const barChartOptions = {
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: 12
      }
    },
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const lineChartData = {
    labels: Object.keys(patrimonioStats.movimentacoesPorMes),
    datasets: [
      {
        label: 'Movimentações',
        data: Object.values(patrimonioStats.movimentacoesPorMes),
        borderColor: chartColors.accent,
        backgroundColor: `${chartColors.accent}20`,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: chartColors.accent,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: 12
      }
    },
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Loading state com animação
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#344893] to-blue-800 flex justify-center items-center">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-white border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Carregando...
            </span>
          </div>
          <p className="mt-4 text-white text-xl font-light">Carregando seu dashboard</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">{error || "Você precisa estar autenticado para acessar esta página."}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-[#344893] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  // Renderização do dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 pt-16">
        {/* Hero section com saudação e destaques */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mt-16 mb-8"
        >
          <div className="bg-gradient-to-r from-[#344893] to-blue-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="relative px-8 py-12">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="white" d="M47.5,-57.2C59.9,-45.8,67.3,-29.1,70.3,-11.5C73.4,6.2,72.1,24.7,63.1,38.8C54.1,52.8,37.4,62.3,19.9,67.2C2.3,72.2,-16.2,72.5,-33.3,66.4C-50.4,60.3,-66,47.8,-73.8,31.1C-81.5,14.4,-81.3,-6.6,-74,-24.3C-66.8,-42,-52.4,-56.4,-36.6,-66.2C-20.7,-76.1,-3.3,-81.4,12.3,-78.8C27.9,-76.3,55.8,-66,45.7,-57.2C35.6,-48.5,12,-42.7,-1.8,-33.9C-15.6,-25.1,-19.5,-13.4,-18.9,-0.3C-18.2,12.7,-13,27.7,-9.8,27.9C-6.7,28.1,-5.5,13.3,5.1,12.8C15.7,12.2,35.7,26,37.4,25.1C39,24.2,22.4,8.8,18.3,-3.1C14.2,-14.9,22.8,-23.3,31.3,-34.7L31.3,-34.7Z" transform="translate(100 100)" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <h1 className="text-white text-3xl md:text-4xl font-bold flex items-center">
                  Bem-vindo, {userData?.nome}!
                  <span className="ml-2 inline-block animate-wave">👋</span>
                </h1>
                <p className="mt-2 text-blue-100 opacity-90">
                  Confira o resumo do sistema e os dados mais recentes
                </p>

                {/* Cards de destaque */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <motion.div 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-white rounded-lg shadow-md p-5 flex items-center"
                  >
                    <div className="rounded-full p-3 bg-blue-100 text-[#344893]">
                      <Package size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs text-gray-500">Total Patrimônios</p>
                      <h3 className="font-bold text-2xl">{totalPatrimonios}</h3>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-white rounded-lg shadow-md p-5 flex items-center"
                  >
                    <div className="rounded-full p-3 bg-orange-100 text-orange-600">
                      <Users size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs text-gray-500">Usuários</p>
                      <h3 className="font-bold text-2xl">{totalUsuarios}</h3>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-white rounded-lg shadow-md p-5 flex items-center"
                  >
                    <div className="rounded-full p-3 bg-green-100 text-green-600">
                      <TrendingUp size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs text-gray-500">Movimentações Mês</p>
                      <h3 className="font-bold text-2xl">
                        {Object.values(patrimonioStats.movimentacoesPorMes).reduce((a, b) => a + b, 0)}
                      </h3>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-white rounded-lg shadow-md p-5 flex items-center"
                  >
                    <div className="rounded-full p-3 bg-purple-100 text-purple-600">
                      <Activity size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs text-gray-500">Atividade</p>
                      <h3 className="font-bold text-2xl">
                        {patrimonios.length + usuarios.length}
                      </h3>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navegação por tabs */}
        <div className="mb-8">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'dashboard' 
                  ? 'text-[#344893] border-b-2 border-[#344893]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveTab('recent')} 
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'recent' 
                  ? 'text-[#344893] border-b-2 border-[#344893]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Atividades Recentes
            </button>
          </div>
        </div>

        {/* Conteúdo baseado na tab ativa */}
        {activeTab === 'dashboard' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Seção de Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Gráfico de pizza - tipos de patrimônio */}
              <motion.div
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl shadow-md overflow-hidden lg:col-span-1"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Tipos de Patrimônio</h2>
                  <p className="text-sm text-gray-500">Distribuição por categorias</p>
                </div>
                <div className="p-6">
                  <div className="h-64">
                    <Pie data={pieChartData} options={pieChartOptions} />
                  </div>
                </div>
              </motion.div>

              {/* Gráfico de barras - patrimônios por setor */}
              <motion.div
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl shadow-md overflow-hidden lg:col-span-2"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Patrimônios por Setor</h2>
                  <p className="text-sm text-gray-500">Comparação entre setores</p>
                </div>
                <div className="p-6">
                  <div className="h-64">
                    <Bar data={barChartData} options={barChartOptions} />
                  </div>
                </div>
              </motion.div>

              {/* Gráfico de linha - movimentações ao longo do tempo */}
              <motion.div
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl shadow-md overflow-hidden lg:col-span-3"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Movimentações Mensais</h2>
                  <p className="text-sm text-gray-500">Evolução ao longo do tempo</p>
                </div>
                <div className="p-6">
                  <div className="h-72">
                    <Line data={lineChartData} options={lineChartOptions} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Dicas rápidas */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm mb-8">
              <h3 className="font-semibold text-[#344893]">Dicas rápidas</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-md bg-blue-100 text-[#344893] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-700">Novo patrimônio</p>
                    <p className="text-xs text-gray-500">Registre novos itens com todos os detalhes</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-700">Movimentação</p>
                    <p className="text-xs text-gray-500">Registre transferências entre setores</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-700">Relatórios</p>
                    <p className="text-xs text-gray-500">Exporte dados em Excel para análises</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Últimos Patrimônios */}
            <motion.div
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Últimos Patrimônios</h2>
                  {patrimonios.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Mostrando {patrimonios.length} mais recentes
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => router.push('/controlepatrimonio')}
                  className="text-sm text-[#344893] hover:underline flex items-center"
                >
                  Ver todos <ChevronRight size={16} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {patrimonios.length > 0 ? (
                  patrimonios.map((patrimonio, index) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      key={patrimonio.id}
                      className="p-4 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start">
                          <div className="rounded-lg h-10 w-10 flex items-center justify-center bg-blue-100 text-[#344893]">
                            {patrimonio.tipo === "Veículo" ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                                <circle cx="7" cy="17" r="2"></circle>
                                <circle cx="17" cy="17" r="2"></circle>
                              </svg>
                            ) : patrimonio.tipo === "Celular" ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                <line x1="12" y1="18" x2="12" y2="18"></line>
                              </svg>
                            ) : patrimonio.tipo === "Móveis" ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <rect x="4" y="4" width="16" height="16" rx="1"></rect>
                                <path d="M4 12h16"></path>
                              </svg>
                            ) : (
                              <Package size={20} />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-800">{patrimonio.nome}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Responsável: {patrimonio.responsavel.nome} {patrimonio.responsavel.sobrenome}
                            </p>
                          </div>
                        </div>
                        {patrimonio.ultimaMovimentacao && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                            {patrimonio.ultimaMovimentacao.tipo.replace('_', ' ').toLowerCase()}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-blue-50 p-3">
                      <Package size={24} className="text-blue-500" />
                    </div>
                    <p className="mt-4 text-gray-500 font-medium">Nenhum patrimônio encontrado</p>
                    <p className="text-sm text-gray-400 mt-1">Os itens adicionados aparecerão aqui</p>
                    <button 
                      onClick={() => router.push('/controlepatrimonio')}
                      className="mt-4 px-4 py-2 bg-[#344893] text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Adicionar patrimônio
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Últimos Usuários */}
            <motion.div
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Últimos Usuários</h2>
                  {usuarios.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Mostrando {usuarios.length} mais recentes
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => router.push('/controleusuarios')}
                  className="text-sm text-[#344893] hover:underline flex items-center"
                >
                  Ver todos <ChevronRight size={16} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {usuarios.length > 0 ? (
                  usuarios.map((usuario, index) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      key={usuario.id}
                      className="p-4 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center font-medium">
                          {usuario.nome.substring(0, 1)}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-800">{usuario.nome}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-0.5">
                            <span>{usuario.email}</span>
                            <span className="mx-1">•</span>
                            <span>{new Date(usuario.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-orange-50 p-3">
                      <Users size={24} className="text-orange-500" />
                    </div>
                    <p className="mt-4 text-gray-500 font-medium">Nenhum usuário encontrado</p>
                    <p className="text-sm text-gray-400 mt-1">Os usuários cadastrados aparecerão aqui</p>
                    <button 
                      onClick={() => router.push('/usuarios')} 
                      className="mt-4 px-4 py-2 bg-[#344893] text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Gerenciar usuários
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Rodapé */}
        <div className="py-8 mt-12 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Sistema de Controle de Patrimônio</p>
        </div>
      </div>
    </div>
  );
}