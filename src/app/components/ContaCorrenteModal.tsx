import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, PlusCircle, Calendar, DollarSign, Clock, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Adicione esta interface no início do arquivo:
interface ContaCorrenteSaveData {
  contaCorrente: any;
  lancamentos: any[];
  preserveExistingEntries?: boolean;
  modificacoesContaCorrente?: boolean;
}

// Definição das interfaces
interface Lancamento {
  id?: number;
  contaCorrenteId?: number;
  data: string;
  numeroDocumento?: string;
  observacao?: string;
  credito?: string;
  debito?: string;
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
  data?: string;
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

// Então atualize a interface do modal:
interface ContaCorrenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dados: ContaCorrenteSaveData) => void;
  isEditMode: boolean;
  conta: ContaCorrente | null;
  empresas: Empresa[];
  colaboradores: Colaborador[];
  usuarios: User[];
  setores?: string[];
  isLoading?: boolean;
  isAdminMode?: boolean;
  currentUserId?: string;
}

const ContaCorrenteModal: React.FC<ContaCorrenteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isEditMode,
  conta = null,
  empresas = [],
  colaboradores = [],
  usuarios = [],
  setores: setoresProp = [], // Renomeie para setoresProp para evitar conflito
  isLoading = false,
  isAdminMode = false,
  currentUserId = ''
}) => {
  // Estado para o formulário principal
  const [formData, setFormData] = useState({
    id: 0,
    userId: isAdminMode ? '' : currentUserId,
    empresaId: '',
    colaboradorId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'EXTRA_CAIXA',
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
      data: new Date().toISOString().split('T')[0],
      numeroDocumento: '',
      observacao: '',
      credito: '',
      debito: '',
    }
  ]);

  // No ContaCorrenteModal, adicione um estado para controlar se devemos preservar lançamentos existentes
  const [preserveExistingEntries, setPreserveExistingEntries] = useState(true);

  // Novo estado para rastrear se o usuário modificou os dados da conta
  const [contaModificada, setContaModificada] = useState(false);

  // Dados originais para comparação
  const [dadosOriginais, setDadosOriginais] = useState<any>(null);

  // Estado para os setores - usar setoresProp como valor inicial
  const [setores, setSetores] = useState<string[]>(setoresProp);

  // Substituir a função preserveLocalDate atual por esta:
  const preserveLocalDate = (dateString?: string): string => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    
    // Se já estiver no formato YYYY-MM-DD, retornar como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      // Importante: Não usar o construtor de Date diretamente para evitar problemas de timezone
      // Em vez disso, extrair os componentes da data e construir manualmente
      
      // Se for um ISO string com timestamp (formato que vem do banco)
      if (dateString.includes('T')) {
        const [datePart] = dateString.split('T');
        return datePart;
      }
      
      // Para outros formatos, vamos tentar converter usando uma data local
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Erro ao preservar data local:", e);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Carregar dados iniciais se for edição ou limpar dados se não for
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
        
        // Outras requisições para carregar dados (empresas, etc.)...
        
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      }
    };

    carregarDadosIniciais();

    // Se não estiver em modo de edição OU se o modal foi fechado, limpar os dados
    if (!isEditMode || !isOpen) {
      const dadosIniciais = {
        id: 0,
        userId: isAdminMode ? '' : currentUserId,
        empresaId: '',
        colaboradorId: '',
        data: new Date().toISOString().split('T')[0],
        tipo: 'EXTRA_CAIXA',
        fornecedorCliente: '',
        observacao: '',
        setor: '',
        oculto: false
      };

      setFormData(dadosIniciais);
      setDadosOriginais(JSON.stringify(dadosIniciais));
      setContaModificada(false);

      setLancamentos([{
        data: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        observacao: '',
        credito: '',
        debito: '',
      }]);
      
      return; // Sair do useEffect se não estiver em modo de edição
    }
    
    // Substitua a função de manipulação de data no useEffect que carrega os dados 
    if (conta) {
      const dadosCarregados = {
        id: conta.id || 0,
        userId: conta.userId || (isAdminMode ? '' : currentUserId),
        empresaId: conta.empresaId?.toString() || '',
        colaboradorId: conta.colaboradorId?.toString() || '',
        // CORREÇÃO: Usar método para preservar a data exata sem ajustes de timezone
        data: preserveLocalDate(conta.data),
        tipo: conta.tipo || 'EXTRA_CAIXA',
        fornecedorCliente: conta.fornecedorCliente || '',
        observacao: conta.observacao || '',
        setor: conta.setor || '',
        oculto: conta.oculto || false
      };

      setFormData(dadosCarregados);

      // Formatar os lançamentos de maneira semelhante
      if (conta.lancamentos && conta.lancamentos.length > 0) {
        const lancamentosCarregados = conta.lancamentos.map(l => ({
          id: l.id,
          // CORREÇÃO: Preservar data sem ajuste de timezone
          data: preserveLocalDate(l.data),
          numeroDocumento: l.numeroDocumento || '',
          observacao: l.observacao || '',
          credito: l.credito || '',
          debito: l.debito || '',
        }));
        
        setLancamentos(lancamentosCarregados);
      }
    }
  }, [conta, isEditMode, isAdminMode, currentUserId, isOpen, setoresProp]);

  // Atualizar a função que modifica o formulário para verificar alterações
  const handleFormChange = (field: string, value: any) => {
    const novoFormData = { ...formData, [field]: value };
    setFormData(novoFormData);
    
    // Verificar se a conta foi modificada comparando com os dados originais
    if (dadosOriginais) {
      const dadosOriginaisObj = JSON.parse(dadosOriginais);
      const foiModificada = Object.entries(novoFormData).some(([key, val]) => {
        return val !== dadosOriginaisObj[key] && key !== 'lancamentos';
      });
      setContaModificada(foiModificada);
    }
  };

  // Adicionar nova linha à tabela
  const adicionarLinha = () => {
    setLancamentos([...lancamentos, {
      data: new Date().toISOString().split('T')[0],
      numeroDocumento: '',
      observacao: '',
      credito: '',
      debito: '',
    }]);
  };

  // Na função que adiciona um novo lançamento à tabela:
  const adicionarLancamento = () => {
    // Criar novo lançamento sem ID (para ser identificado como novo)
    const novoLancamento = {
      // Explicitamente SEM ID
      data: new Date().toISOString().split('T')[0],
      numeroDocumento: '',
      observacao: '',
      credito: '',
      debito: ''
    };
    
    setLancamentos([...lancamentos, novoLancamento]);
  };

  // Remover linha da tabela
  const removerLinha = (index: number) => {
    if (lancamentos.length <= 1) return; // Mantém pelo menos uma linha
    
    const novasLinhas = [...lancamentos];
    novasLinhas.splice(index, 1);
    setLancamentos(novasLinhas);
  };

  // Substitua a função removerLancamento atual por esta versão corrigida:
  const removerLancamento = (index: number, e: React.MouseEvent) => {
    // IMPORTANTE: Impedir a propagação do evento
    e.preventDefault();
    e.stopPropagation();
    
    // Criar uma cópia do array de lançamentos
    const novosLancamentos = [...lancamentos];
    
    // Log para verificar se estamos removendo um lançamento com ID (existente) ou sem ID (novo)
    console.log("Removendo lançamento:", lancamentos[index]);
    
    // Remover o lançamento
    novosLancamentos.splice(index, 1);
    setLancamentos(novosLancamentos);
    
    // Se não houver lançamentos após a remoção, adicione um em branco
    if (novosLancamentos.length === 0) {
      setLancamentos([{
        data: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        observacao: '',
        credito: '',
        debito: '',
      }]);
    }
    
    // Importante: não fazer nada mais aqui que possa afetar o fechamento do modal
  };

  // Corrija a função de formatação de valores para a API
  const formatarValorParaAPI = (valor: string | null | undefined): number | null => {
    if (!valor || valor.trim() === '') return null;
    
    // Primeiro, remover símbolos de moeda e espaços extras
    let valorLimpo = valor.replace(/[R$\s]/g, '');
    
    // Log para diagnóstico
    console.log("Valor original:", valor, "Valor limpo inicial:", valorLimpo);
    
    // Detectar o formato do valor
    const temPonto = valorLimpo.includes('.');
    const temVirgula = valorLimpo.includes(',');
    
    if (temPonto && temVirgula) {
      // Formato brasileiro completo: 1.234,56
      // Remover pontos e substituir vírgula por ponto
      valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
    } else if (temVirgula && !temPonto) {
      // Formato brasileiro simples: 1234,56
      // Substituir vírgula por ponto
      valorLimpo = valorLimpo.replace(',', '.');
    }
    // Se tiver apenas ponto (1234.56), já está no formato correto para o JS
    
    // Log para diagnóstico
    console.log("Valor limpo final:", valorLimpo);
    
    // Converte para número ou retorna null se não for possível
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? null : numero;
  };

  // Substitua a função formatarValorMonetario pelo código abaixo:
  const formatarValorMonetario = (valor: string): string => {
    if (!valor || valor.trim() === '') return '';
    
    try {
      // Primeiro remove qualquer formatação existente (R$, pontos, espaços)
      let valorLimpo = valor
        .replace(/[R$\s]/g, '')  // Remove R$, espaços
        .replace(/\./g, '')      // Remove pontos de milhar
        .replace(',', '.');      // Substitui vírgula decimal por ponto
      
      // Verifica se é um número válido
      const numero = parseFloat(valorLimpo);
      
      if (isNaN(numero)) return valor; // Se não for número válido, retorna o valor original
      
      // Formata para o padrão brasileiro com vírgula decimal e pontos nos milhares
      return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (e) {
      console.error("Erro ao formatar valor:", e);
      return valor; // Em caso de erro, retorna o valor original
    }
  };

  // Substitua a função atualizarLinha pelo código abaixo:
  const atualizarLinha = (index: number, campo: string, valor: string) => {
    console.log(`Atualizando campo ${campo} do lançamento ${index} para: ${valor}`);
    
    const novasLinhas = [...lancamentos];
    novasLinhas[index] = { ...novasLinhas[index], [campo]: valor };
    setLancamentos(novasLinhas);
  };

  // Adicione esta nova função para formatar após perder o foco
  const formatarAoPerderFoco = (index: number, campo: string) => {
    if (campo !== 'credito' && campo !== 'debito') return;
    
    const novasLinhas = [...lancamentos];
    const valorAtual = novasLinhas[index][campo as keyof typeof novasLinhas[typeof index]];
    
    if (typeof valorAtual === 'string' && valorAtual.trim() !== '') {
      // Aplicar formatação apenas quando o campo perder o foco
      const valorFormatado = formatarValorMonetario(valorAtual);
      novasLinhas[index] = { ...novasLinhas[index], [campo]: valorFormatado };
      setLancamentos(novasLinhas);
    }
  };

  // Atualize a função de cálculo do total de créditos
  const calcularTotalCreditos = () => {
    return lancamentos.reduce((total, linha) => {
      if (!linha.credito || linha.credito.trim() === '') return total;
      
      const valorNumerico = formatarValorParaAPI(linha.credito);
      
      // Log para diagnóstico
      console.log("Calculando crédito:", linha.credito, "=>", valorNumerico);
      
      return total + (valorNumerico || 0);
    }, 0);
  };

  // Atualize a função de cálculo do total de débitos
  const calcularTotalDebitos = () => {
    return lancamentos.reduce((total, linha) => {
      if (!linha.debito || linha.debito.trim() === '') return total;
      
      const valorNumerico = formatarValorParaAPI(linha.debito);
      
      // Log para diagnóstico
      console.log("Calculando débito:", linha.debito, "=>", valorNumerico);
      
      return total + (valorNumerico || 0);
    }, 0);
  };

  // Substitua a função calcularSaldo por esta versão corrigida:
  const calcularSaldo = () => {
    return lancamentos.reduce((total, linha) => {
      // Usar a função formatarValorParaAPI para processar os valores corretamente
      const credito = linha.credito ? formatarValorParaAPI(linha.credito) || 0 : 0;
      const debito = linha.debito ? formatarValorParaAPI(linha.debito) || 0 : 0;
      
      // Log para diagnóstico
      console.log(`Lançamento: ${linha.observacao} - Crédito: ${credito}, Débito: ${debito}`);
      
      return total + credito - debito;
    }, 0);
  };

  // Modifique a função handleSubmit para não exigir um ID válido ao criar nova conta
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se há pelo menos um lançamento válido
    const lancamentosValidos = lancamentos.filter(l => {
      const temCredito = l.credito && l.credito.toString().trim() !== '';
      const temDebito = l.debito && l.debito.toString().trim() !== '';
      return temCredito || temDebito;
    });
    
    if (lancamentosValidos.length === 0) {
      alert("É necessário adicionar pelo menos um lançamento com valor de crédito ou débito.");
      return;
    }
    
    // Processar lançamentos
    const lancamentosFormatados = lancamentosValidos.map(l => {
      return {
        id: l.id,
        data: l.data,
        numeroDocumento: l.numeroDocumento || '',
        observacao: l.observacao || '',
        credito: l.credito ? formatarValorParaAPI(l.credito) : null,
        debito: l.debito ? formatarValorParaAPI(l.debito) : null
      };
    });
    
    // Dados da conta corrente
    const dadosContaCorrente = {
      id: formData.id || undefined,
      userId: formData.userId || currentUserId,
      empresaId: formData.empresaId ? parseInt(formData.empresaId) : null,
      colaboradorId: formData.colaboradorId ? parseInt(formData.colaboradorId) : null,
      data: formData.data,
      tipo: formData.tipo,
      fornecedorCliente: formData.fornecedorCliente || '',
      observacao: formData.observacao || '',
      setor: formData.setor || '',
      oculto: formData.oculto || false
    };
    
    // MODIFICAÇÃO AQUI: Verificar se é uma edição ou uma nova conta
    if (isEditMode) {
      // Garantir que o contaCorrenteId é um número e é válido apenas em modo de edição
      const contaCorrenteId = Number(dadosContaCorrente.id);
      
      if (isNaN(contaCorrenteId)) {
        console.error("ID de conta corrente inválido:", dadosContaCorrente.id);
        alert("Erro: ID de conta corrente inválido");
        return;
      }
    }
    
    // Log para depuração
    console.log("Enviando dados para salvar:", {
      contaCorrente: dadosContaCorrente,
      lancamentos: lancamentosFormatados,
      clearExisting: !preserveExistingEntries
    });
    
    // Chamar função de salvamento com informação sobre modificações
    onSave({
      contaCorrente: dadosContaCorrente,
      lancamentos: lancamentosFormatados,
      preserveExistingEntries: isEditMode && preserveExistingEntries,
      modificacoesContaCorrente: contaModificada
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
            
            {/* Primeira linha de campos - Removido campo responsável, renomeado Funcionário para Colaborador */}
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
              
              {/* Data movida para esta linha */}
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

            {/* Terceira linha - Agora com Fornecedor/Cliente ocupando toda a largura para dar destaque */}
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

            {/* Observações - permanece full width como estava */}
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

            {/* Informações de Saldo - com cores mais suaves */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <span className="block text-sm font-medium text-blue-500">TOTAL ENTRADAS</span>
                <span className="text-xl font-bold text-green-600">
                  R$ {calcularTotalCreditos().toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true
                  })}
                </span>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <span className="block text-sm font-medium text-blue-500">TOTAL SAÍDAS</span>
                <span className="text-xl font-bold text-red-600">
                  R$ {calcularTotalDebitos().toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true
                  })}
                </span>
              </div>
              {/* No bloco de exibição do saldo final */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <span className="block text-sm font-medium text-blue-500">SALDO FINAL</span>
                <span className={`text-xl font-bold ${calcularSaldo() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calcularSaldo())}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Lançamentos - redesenhada com visual mais clean */}
          <div className="p-6 overflow-x-auto">
            {isEditMode && (
              <div className="flex items-center mb-4 p-2 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="preserveExisting"
                  checked={preserveExistingEntries}
                  onChange={(e) => setPreserveExistingEntries(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="preserveExisting" className="text-sm text-gray-700">
                  Preservar lançamentos existentes (adicionar apenas novos lançamentos)
                </label>
              </div>
            )}
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
                  // Adicione feedback visual para campos de valor vazios
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={lancamento.data}
                        onChange={(e) => atualizarLinha(index, 'data', e.target.value)}
                        className="block w-full px-3 py-1.5 text-base text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                          value={lancamento.credito || ''} // Garantir que nunca é null ou undefined
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
                          value={lancamento.debito || ''} // Garantir que nunca é null ou undefined
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
                        type="button" // Importante adicionar type="button"
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                        title="Remover lançamento"
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

          {/* Botões de ação - redesenhados */}
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

export default ContaCorrenteModal;