import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, PlusCircle, Calendar, DollarSign, Clock, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';

// Função auxiliar para obter a data de hoje no formato YYYY-MM-DD no fuso horário local
const getLocalISODate = () => {
  const now = new Date();
  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0];
};

// Substituir a função formatarDataISO atual por esta:
const formatarDataISO = (dataString?: string) => {
  if (!dataString) return getLocalISODate();
  
  try {
    // Se já estiver no formato ISO, retornar como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      return dataString;
    }
    
    // Processamento seguro para datas com timestamp
    if (dataString.includes('T')) {
      const [datePart] = dataString.split('T');
      return datePart;
    }
    
    // Para lidar com formato dd/mm/aaaa
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataString)) {
      const [dia, mes, ano] = dataString.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    
    // Processamento seguro para outros formatos
    const parts = dataString.split(/[-\/.]/);
    if (parts.length >= 3) {
      // Tentar descobrir qual é qual baseado no formato mais comum
      let year, month, day;
      
      if (parts[0].length === 4) { // Se começa com ano (yyyy-mm-dd)
        [year, month, day] = parts;
      } else if (parts[2].length === 4) { // Se termina com ano (dd/mm/yyyy)
        [day, month, year] = parts;
      } else { // Padrão americano (mm/dd/yyyy)
        [month, day, year] = parts;
      }
      
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    return getLocalISODate();
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return getLocalISODate();
  }
};

// Definição das interfaces
interface Lancamento {
  id?: number;
  contaCorrenteId?: number;
  data: string;
  numeroDocumento?: string;
  observacao?: string;
  credito?: string | number;
  debito?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

interface Empresa {
  id: number;
  nome?: string;
  nomeEmpresa?: string;
}

interface Colaborador {
  id: number;
  nome: string;
  sobrenome?: string;
  cargo?: string;
  setor?: string;
}

interface User {
  id: string;
  nome: string;
  sobrenome?: string;
  email: string;
  role?: string;
}

interface ContaCorrente {
  id?: number;
  userId?: string;
  empresaId?: number;
  colaboradorId?: number;
  descricao?: string;
  data: string;
  fornecedorCliente?: string;
  observacao?: string;
  setor?: string;
  tipo?: string;
  oculto: boolean;
  createdAt?: string;
  updatedAt?: string;
  lancamentos: Lancamento[];
  user?: User;
  empresa?: Empresa;
  colaborador?: Colaborador;
  saldo?: number;
}

interface ContaCorrenteModalAdminProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  empresas: Empresa[];
  colaboradores: Colaborador[];
  usuarios: User[];
  setores: any[];
  isLoading: boolean;
  isEditMode?: boolean;
  contaSelecionada?: ContaCorrente | null;
}

const ContaCorrenteModalAdmin: React.FC<ContaCorrenteModalAdminProps> = ({
  isOpen,
  onClose,
  onSave,
  empresas = [],
  colaboradores = [],
  usuarios = [],
  setores: setoresProp = [],
  isLoading = false,
  isEditMode = false,
  contaSelecionada = null
}) => {
  // Estado para o formulário principal - sem a descrição e tipo padrão EXTRA_CAIXA
  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
    userId: '',
    empresaId: '',
    colaboradorId: '',
    data: getLocalISODate(),
    tipo: 'EXTRA_CAIXA', // Tipo padrão é EXTRA_CAIXA
    fornecedorCliente: '',
    observacao: '',
    setor: '',
    oculto: false
  });

  // Estado para os lançamentos
  const [lancamentos, setLancamentos] = useState<{
    id?: number;
    data: string;
    numeroDocumento: string;
    observacao: string;
    credito: string;
    debito: string;
  }[]>([
    {
      data: getLocalISODate(),
      numeroDocumento: '',
      observacao: '',
      credito: '',
      debito: '',
    }
  ]);

  // Estado para os setores
  const [setores, setSetores] = useState<string[]>(setoresProp);

  // Carregar dados iniciais e setores
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        // Buscar colaboradores para extrair seus setores
        const responseColaboradores = await fetch('/api/colaboradores');
        if (responseColaboradores.ok) {
          const colaboradores = await responseColaboradores.json();
          
          // Extrair setores únicos dos colaboradores
          const setoresColaboradores = colaboradores
            .filter((c: any) => c.setor)
            .map((c: any) => c.setor);
          
          // Adicionar os setores padrão do sistema
          const setoresPadrao = [
            "Administração", 
            "Comercial", 
            "Diretoria",
            "Financeiro", 
            "Logística", 
            "Marketing", 
            "Operacional", 
            "Peças",
            "Pós-vendas",
            "Produção",
            "RH", 
            "Serviço Externo",
            "Serviço Interno",
            "TI",
            "Vendedor Externo",
            "Vendedor Interno"
          ];
          
          // Combinar todos os setores, remover duplicatas e ordenar
          const todosSetores = [...new Set([...setoresPadrao, ...setoresColaboradores, ...setoresProp])];
          todosSetores.sort();
          
          // Atualizar o estado com os setores
          setSetores(todosSetores);
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      }
    };

    carregarDadosIniciais();

    // Se estiver em modo de edição e tiver uma conta selecionada, carregar os dados
    if (isEditMode && contaSelecionada) {
      const dadosCarregados = {
        id: contaSelecionada.id,
        userId: contaSelecionada.userId || contaSelecionada.user?.id || '',
        empresaId: contaSelecionada.empresaId?.toString() || '',
        colaboradorId: contaSelecionada.colaboradorId?.toString() || '',
        data: contaSelecionada.data || getLocalISODate(),
        tipo: contaSelecionada.tipo || 'EXTRA_CAIXA',
        fornecedorCliente: contaSelecionada.fornecedorCliente || '',
        observacao: contaSelecionada.observacao || '',
        setor: contaSelecionada.setor || '',
        oculto: contaSelecionada.oculto || false
      };

      setFormData(dadosCarregados);
      
      // Garantir que os lançamentos sejam carregados corretamente
      if (contaSelecionada.lancamentos && contaSelecionada.lancamentos.length > 0) {
        const lancamentosFormatados = contaSelecionada.lancamentos.map(l => ({
          id: l.id,
          data: formatarDataISO(l.data), // Formatar data para ISO
          numeroDocumento: l.numeroDocumento || '',
          observacao: l.observacao || '',
          credito: l.credito ? String(l.credito) : '', // Usar string vazia em vez de null
          debito: l.debito ? String(l.debito) : ''    // Usar string vazia em vez de null
        }));
        setLancamentos(lancamentosFormatados);
      }
    } else {
      // Resetar formulário para nova conta
      setFormData({
        id: undefined,
        userId: '',
        empresaId: '',
        colaboradorId: '',
        data: getLocalISODate(),
        tipo: 'EXTRA_CAIXA',
        fornecedorCliente: '',
        observacao: '',
        setor: '',
        oculto: false
      });

      setLancamentos([{
        data: getLocalISODate(),
        numeroDocumento: '',
        observacao: '',
        credito: '',
        debito: ''
      }]);
    }
  }, [isEditMode, contaSelecionada, isOpen, setoresProp]);

  useEffect(() => {
    if (contaSelecionada) {
      console.log("Dados recebidos para edição:", contaSelecionada);
      
      setFormData({
        id: contaSelecionada.id,
        userId: contaSelecionada.userId || contaSelecionada.user?.id || '',
        empresaId: contaSelecionada.empresaId?.toString() || '',
        colaboradorId: contaSelecionada.colaboradorId?.toString() || '',
        data: contaSelecionada.data || getLocalISODate(),
        tipo: contaSelecionada.tipo || 'EXTRA_CAIXA',
        fornecedorCliente: contaSelecionada.fornecedorCliente || '',
        observacao: contaSelecionada.observacao || '',
        setor: contaSelecionada.setor || '',
        oculto: contaSelecionada.oculto || false
      });

      if (contaSelecionada.lancamentos && contaSelecionada.lancamentos.length > 0) {
        // LOG para depuração
        console.log("Lançamentos originais:", contaSelecionada.lancamentos);
        
        const lancamentosFormatados = contaSelecionada.lancamentos.map(l => {
          // Garantir que os valores são strings para evitar erros com null
          const creditoFormatado = l.credito !== null && l.credito !== undefined ? String(l.credito) : '';
          const debitoFormatado = l.debito !== null && l.debito !== undefined ? String(l.debito) : '';
          
          return {
            id: l.id,
            // Garantir que a data está no formato correto para input date
            data: l.data || getLocalISODate(),
            numeroDocumento: l.numeroDocumento || '',
            observacao: l.observacao || '',
            credito: creditoFormatado,
            debito: debitoFormatado
          };
        });
        
        // LOG para depuração
        console.log("Lançamentos formatados para edição:", lancamentosFormatados);
        setLancamentos(lancamentosFormatados);
      }
    }
  }, [contaSelecionada]);

  // Atualizar o formulário
  const handleFormChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Adicionar nova linha de lançamento
  const adicionarLinha = () => {
    // Usar a data atual para o novo lançamento, garantindo formato YYYY-MM-DD
    const dataAtual = new Date().toISOString().split('T')[0];
    
    setLancamentos([
      ...lancamentos,
      {
        id: 0,
        data: dataAtual,
        numeroDocumento: '',
        observacao: '',
        credito: '',
        debito: ''
      }
    ]);
  };

  // Remover linha da tabela
  const removerLinha = (index: number) => {
    if (lancamentos.length <= 1) return; // Mantém pelo menos uma linha
    
    const novasLinhas = [...lancamentos];
    novasLinhas.splice(index, 1);
    setLancamentos(novasLinhas);
  };

  // Função segura para remover lançamento
  const removerLancamento = (index: number, e: React.MouseEvent) => {
    // Importante: Impedir a propagação do evento
    e.preventDefault();
    e.stopPropagation();
    
    // Criar uma cópia do array de lançamentos
    const novosLancamentos = [...lancamentos];
    
    // Log para verificar se estamos removendo um lançamento com ID (existente) ou sem ID (novo)
    console.log("Removendo lançamento:", lancamentos[index]);
    
    // Remover o lançamento
    novosLancamentos.splice(index, 1);
    
    // Se não houver lançamentos após a remoção, adicione um em branco
    if (novosLancamentos.length === 0) {
      novosLancamentos.push({
        data: getLocalISODate(),
        numeroDocumento: '',
        observacao: '',
        credito: '',
        debito: '',
      });
    }
    
    setLancamentos(novosLancamentos);
  };

  // Formatar valor para a API
  const formatarValorParaAPI = (valor: string | null | undefined): number | null => {
    if (!valor || valor.trim() === '') return null;
    
    // Remover símbolos de moeda e espaços extras
    let valorLimpo = valor.replace(/[R$\s]/g, '');
    
    // Detectar o formato do valor
    const temPonto = valorLimpo.includes('.');
    const temVirgula = valorLimpo.includes(',');
    
    if (temPonto && temVirgula) {
      // Formato brasileiro completo: 1.234,56
      valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
    } else if (temVirgula && !temPonto) {
      // Formato brasileiro simples: 1234,56
      valorLimpo = valorLimpo.replace(',', '.');
    }
    
    // Converte para número ou retorna null se não for possível
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? null : numero;
  };

  // Formatar valor para exibição nos inputs
  const formatarValorMonetario = (valor: string): string => {
    // Remover qualquer caractere que não seja dígito
    let apenasNumeros = valor.replace(/\D/g, '');
    
    // Se não houver números, retorna vazio
    if (!apenasNumeros) return '';
    
    // Converter para número decimal (dividir por 100 para considerar centavos)
    const numero = parseInt(apenasNumeros, 10) / 100;
    
    // Formatar para moeda brasileira (sem o símbolo R$)
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Atualizar uma linha de lançamento
  const atualizarLinha = (index: number, campo: string, valor: string) => {
    const novasLinhas = [...lancamentos];
    
    if (campo === 'data') {
      // Preservar o formato da data exatamente como foi inserido
      novasLinhas[index] = { ...novasLinhas[index], [campo]: valor };
      console.log(`Data atualizada para: ${valor}`); // Log para debug
    }
    else {
      novasLinhas[index] = { ...novasLinhas[index], [campo]: valor };
    }
    
    setLancamentos(novasLinhas);
  };

  // Calcular total de créditos
  const calcularTotalCreditos = () => {
    return lancamentos.reduce((total, linha) => {
      if (!linha.credito || linha.credito.trim() === '') return total;
      
      const valorNumerico = formatarValorParaAPI(linha.credito);
      return total + (valorNumerico || 0);
    }, 0);
  };

  // Calcular total de débitos
  const calcularTotalDebitos = () => {
    return lancamentos.reduce((total, linha) => {
      if (!linha.debito || linha.debito.trim() === '') return total;
      
      const valorNumerico = formatarValorParaAPI(linha.debito);
      return total + (valorNumerico || 0);
    }, 0);
  };

  // Calcular saldo
  const calcularSaldo = () => {
    return lancamentos.reduce((total, linha) => {
      const credito = linha.credito ? formatarValorParaAPI(linha.credito) || 0 : 0;
      const debito = linha.debito ? formatarValorParaAPI(linha.debito) || 0 : 0;
      return total + credito - debito;
    }, 0);
  };

  // Formatar valor para exibição na moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Submeter o formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.userId) {
      toast.error("Por favor, selecione um usuário.");
      return;
    }
    
    // Validar se há lançamentos válidos
    const lancamentosValidos = lancamentos.filter(l => {
      const temCredito = l.credito && l.credito.toString().trim() !== '' && l.credito !== '0' && l.credito !== '0,00';
      const temDebito = l.debito && l.debito.toString().trim() !== '' && l.debito !== '0' && l.debito !== '0,00';
      return temCredito || temDebito;
    });
    
    if (lancamentosValidos.length === 0) {
      toast.error("É necessário adicionar pelo menos um lançamento com valor de crédito ou débito.");
      return;
    }
    
    // Processar lançamentos
    const lancamentosFormatados = lancamentosValidos.map(l => {
      return {
        id: l.id, // Preservar ID se existir
        data: l.data || getLocalISODate(),
        numeroDocumento: l.numeroDocumento || '',
        observacao: l.observacao || '',
        credito: l.credito ? formatarValorParaAPI(l.credito) : null,
        debito: l.debito ? formatarValorParaAPI(l.debito) : null
      };
    });
    
    // Preparar dados completos para envio - sem o campo descrição
    const dadosCompletos = {
      id: isEditMode && contaSelecionada ? contaSelecionada.id : undefined,
      userId: formData.userId,
      empresaId: formData.empresaId ? parseInt(formData.empresaId) : null,
      colaboradorId: formData.colaboradorId ? parseInt(formData.colaboradorId) : null,
      data: formData.data,
      tipo: formData.tipo,
      fornecedorCliente: formData.fornecedorCliente || '',
      observacao: formData.observacao || '',
      setor: formData.setor || '',
      oculto: formData.oculto || false,
      lancamentos: lancamentosFormatados
    };
    
    // Log para depuração
    console.log("Enviando dados para salvar:", dadosCompletos);
    
    // Chamar função de salvamento
    onSave(dadosCompletos);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 overflow-auto py-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 my-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Cabeçalho do modal com cores claras */}
          <div className="bg-gradient-to-r from-gray-100 to-blue-50 p-6 rounded-t-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditMode ? 'Editar Conta Corrente' : 'Nova Conta Corrente'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Campo de seleção de usuário - exclusivo para este modal admin */}
            <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-xs text-gray-700 mb-2 font-medium">SELECIONE O USUÁRIO</label>
              <select 
                value={formData.userId} 
                onChange={(e) => handleFormChange('userId', e.target.value)}
                className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                required
                disabled={isEditMode} // Desabilitar edição do usuário se estiver editando
              >
                <option value="">-- Selecione um usuário --</option>
                {Array.isArray(usuarios) && usuarios.map(usuario => (
                  usuario && (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome} {usuario.sobrenome || ''} - {usuario.email}
                    </option>
                  )
                ))}
              </select>
              {isEditMode && (
                <p className="text-xs text-blue-600 mt-1">
                  O usuário não pode ser alterado durante a edição.
                </p>
              )}
            </div>
            
            {/* Primeira linha de campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">EMPRESA</label>
                <select 
                  value={formData.empresaId} 
                  onChange={(e) => handleFormChange('empresaId', e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Selecione...</option>
                  {Array.isArray(empresas) && empresas.map(empresa => (
                    empresa && (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nomeEmpresa || empresa.nome || `Empresa ${empresa.id}`}
                      </option>
                    )
                  ))}
                </select>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">COLABORADOR</label>
                <select 
                  value={formData.colaboradorId}
                  onChange={(e) => handleFormChange('colaboradorId', e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Selecione...</option>
                  {Array.isArray(colaboradores) && colaboradores.map(col => (
                    col && (
                      <option key={col.id} value={col.id}>
                        {col.nome} {col.sobrenome || ''}
                      </option>
                    )
                  ))}
                </select>
              </div>
            </div>
            
            {/* Segunda linha - Tipo, Setor e Data - reorganizados em 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">TIPO</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleFormChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="EXTRA_CAIXA">Extra Caixa</option>
                  <option value="PERMUTA">Permuta</option>
                  <option value="DEVOLUCAO">Devolução</option>
                </select>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">SETOR</label>
                <select 
                  value={formData.setor || ''}
                  onChange={(e) => handleFormChange('setor', e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Selecione um setor...</option>
                  {Array.isArray(setores) && setores.length > 0 ? (
                    setores.map((setor, index) => (
                      <option key={`setor-${index}`} value={setor}>
                        {setor}
                      </option>
                    ))
                  ) : (
                    <option disabled>Nenhum setor disponível</option>
                  )}
                </select>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">DATA</label>
                <input 
                  type="date" 
                  value={formData.data}
                  onChange={(e) => handleFormChange('data', e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Fornecedor/Cliente */}
            <div className="mt-5">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs text-gray-700 mb-2 font-medium">FORNECEDOR/CLIENTE</label>
                <input 
                  type="text" 
                  value={formData.fornecedorCliente || ''}
                  onChange={(e) => handleFormChange('fornecedorCliente', e.target.value)}
                  placeholder="Nome do fornecedor ou cliente"
                  className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Observações */}
            <div className="mt-5 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-xs text-gray-700 mb-2 font-medium">OBSERVAÇÕES</label>
              <textarea 
                value={formData.observacao || ''}
                onChange={(e) => handleFormChange('observacao', e.target.value)}
                placeholder="Observações adicionais"
                className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-md h-20 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Informações de Saldo */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <span className="block text-sm font-medium text-blue-500">TOTAL ENTRADAS</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(calcularTotalCreditos())}
                </span>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <span className="block text-sm font-medium text-blue-500">TOTAL SAÍDAS</span>
                <span className="text-xl font-bold text-red-600">
                  {formatCurrency(calcularTotalDebitos())}
                </span>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <span className="block text-sm font-medium text-blue-500">SALDO FINAL</span>
                <span className={`text-xl font-bold ${calcularSaldo() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calcularSaldo())}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Lançamentos</h3>
              <button
                type="button"
                onClick={adicionarLinha}
                className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                <PlusCircle size={16} className="mr-2" /> Adicionar lançamento
              </button>
            </div>
            
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Débito</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lancamentos.map((lancamento, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={lancamento.data || getLocalISODate()}
                        onChange={(e) => atualizarLinha(index, 'data', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={lancamento.numeroDocumento}
                        onChange={(e) => atualizarLinha(index, 'numeroDocumento', e.target.value)}
                        className="block w-full px-3 py-1.5 text-base text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nº Doc"
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={lancamento.observacao}
                        onChange={(e) => atualizarLinha(index, 'observacao', e.target.value)}
                        className="block w-full px-3 py-1.5 text-base text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descrição do lançamento"
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={lancamento.credito}
                          onChange={(e) => atualizarLinha(index, 'credito', e.target.value)}
                          className={`block w-full pl-10 pr-3 py-1.5 text-base border rounded-md focus:ring-2 focus:outline-none
                            ${!lancamento.credito && !lancamento.debito 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                          placeholder="0,00"
                          disabled={isLoading}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={lancamento.debito}
                          onChange={(e) => atualizarLinha(index, 'debito', e.target.value)}
                          className={`block w-full pl-10 pr-3 py-1.5 text-base border rounded-md focus:ring-2 focus:outline-none
                            ${!lancamento.credito && !lancamento.debito 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                          placeholder="0,00"
                          disabled={isLoading}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <button 
                        onClick={(e) => removerLancamento(index, e)}
                        type="button"
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                        title="Remover lançamento"
                        disabled={isLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right font-medium">Totais:</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(calcularTotalCreditos())}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(calcularTotalDebitos())}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Botões de ação */}
          <div className="border-t border-gray-200 p-6 flex justify-end bg-gray-50 rounded-b-xl">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Clock className="animate-spin mr-2" size={18} />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Check className="mr-2" size={18} />
                    <span>Salvar</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ContaCorrenteModalAdmin;