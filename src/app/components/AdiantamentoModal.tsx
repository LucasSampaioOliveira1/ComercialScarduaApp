import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  DollarSign,
  Coins,
  Link,
  Link2Off,
  Check,
  FileText,
  Search,
  User
} from "lucide-react";

interface Adiantamento {
  id: number;
  data: string;
  nome: string;
  observacao: string | null;
  saida: string;
  userId: string;
  caixaViagemId: number | null;
  colaboradorId?: number | null; // Adicionar colaboradorId
  colaborador?: {
    id: number;
    nome: string;
    sobrenome?: string;
  } | null;
  caixaViagem?: {
    id: number;
    destino: string;
    numeroCaixa?: number;
  } | null;
}

interface Colaborador {
  id: number;
  nome: string;
  sobrenome?: string;
  setor?: string;
  cargo?: string;
}

interface AdiantamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdiantamentosUpdated: () => void;
  userPermissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canCreate: boolean;
  };
}

// Função para preservar a data local corretamente
const preserveLocalDate = (dateString?: string): string => {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  // Se já estiver no formato YYYY-MM-DD, retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  try {
    // Se for um ISO string com timestamp (formato que vem do banco)
    if (dateString.includes('T')) {
      const [datePart] = dateString.split('T');
      return datePart;
    }
    
    // Para outros formatos, converter usando uma data local
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

export default function AdiantamentoModal({
  isOpen,
  onClose,
  onAdiantamentosUpdated,
  userPermissions = { canEdit: true, canDelete: true, canCreate: true }
}: AdiantamentoModalProps) {
  const [adiantamentos, setAdiantamentos] = useState<Adiantamento[]>([]);
  const [filteredAdiantamentos, setFilteredAdiantamentos] = useState<Adiantamento[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    id: 0,
    data: new Date().toISOString().split("T")[0],
    colaboradorId: "", // Mudança: usar colaboradorId ao invés de nome
    observacao: "",
    saida: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar adiantamentos
  useEffect(() => {
    if (isOpen) {
      fetchAdiantamentos();
      fetchColaboradores();
    }
  }, [isOpen]);

  // Filtrar adiantamentos quando houver busca
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredAdiantamentos(adiantamentos);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = adiantamentos.filter(
      a => 
        a.nome.toLowerCase().includes(searchTermLower) ||
        (a.colaborador?.nome?.toLowerCase() || "").includes(searchTermLower) ||
        (a.colaborador?.sobrenome?.toLowerCase() || "").includes(searchTermLower) ||
        (a.observacao?.toLowerCase() || "").includes(searchTermLower) ||
        formatarData(a.data).includes(searchTermLower) ||
        a.saida.includes(searchTermLower) ||
        (a.caixaViagem?.destino.toLowerCase() || "").includes(searchTermLower)
    );
    
    setFilteredAdiantamentos(filtered);
  }, [searchTerm, adiantamentos]);

  // Buscar colaboradores
  const fetchColaboradores = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      
      const response = await fetch('/api/colaboradores', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar colaboradores: ${response.statusText}`);
      }
      
      const data = await response.json();
      setColaboradores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      toast.error("Não foi possível carregar os colaboradores");
    }
  };

  const fetchAdiantamentos = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      
      const response = await fetch(`/api/caixaviagem/adiantamento`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar adiantamentos: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAdiantamentos(data);
      setFilteredAdiantamentos(data);
    } catch (error) {
      console.error("Erro ao buscar adiantamentos:", error);
      toast.error("Não foi possível carregar os adiantamentos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    
    if (value) {
      const numericValue = parseFloat(value) / 100;
      const formattedValue = numericValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setFormData({ ...formData, saida: formattedValue });
    } else {
      setFormData({ ...formData, saida: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar permissão para criar/editar
    if (isEditing && !userPermissions.canEdit) {
      toast.error("Você não tem permissão para editar adiantamentos.");
      return;
    }
    
    if (!isEditing && !userPermissions.canCreate) {
      toast.error("Você não tem permissão para criar adiantamentos.");
      return;
    }
    
    if (!formData.data || !formData.colaboradorId || formData.saida === undefined) {
      toast.error("Data, colaborador e valor do adiantamento são campos obrigatórios.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      
      // Buscar o nome do colaborador selecionado
      const colaboradorSelecionado = colaboradores.find(c => c.id === parseInt(formData.colaboradorId));
      const nomeColaborador = colaboradorSelecionado 
        ? `${colaboradorSelecionado.nome} ${colaboradorSelecionado.sobrenome || ''}`.trim()
        : '';
      
      // Formatar o valor corretamente para a API
      let valorFormatado = formData.saida;
      
      // Remover formatação R$ e pontos de milhar, substituir vírgula por ponto
      valorFormatado = valorFormatado
        .replace(/R\$\s*/g, '')      // Remove o símbolo R$ e espaços após ele
        .replace(/\./g, '')          // Remove pontos de separação de milhar
        .replace(',', '.')           // Substitui a vírgula decimal por ponto
        .trim();
      
      // Formatar data como ISO String completo para o Prisma
      let dataFormatada;
      try {
        // Converter YYYY-MM-DD para objeto Date e depois para ISO String
        const [year, month, day] = formData.data.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        dataFormatada = dateObj.toISOString();
      } catch (dateError) {
        // Fallback: adicionar hora ao final da data
        dataFormatada = `${formData.data}T00:00:00.000Z`;
      }
      
      console.log("Data formatada para API:", dataFormatada);
      console.log("Valor formatado para API:", valorFormatado);
      console.log("Colaborador selecionado:", colaboradorSelecionado);
      
      // Criar payload com base no modo (edição ou criação)
      const payload = isEditing
        ? {
            adiantamentoId: formData.id,
            data: dataFormatada,
            nome: nomeColaborador, // Manter o nome para compatibilidade
            colaboradorId: parseInt(formData.colaboradorId), // Adicionar colaboradorId
            observacao: formData.observacao || null,
            saida: valorFormatado
          }
        : {
            data: dataFormatada,
            nome: nomeColaborador, // Manter o nome para compatibilidade
            colaboradorId: parseInt(formData.colaboradorId), // Adicionar colaboradorId
            observacao: formData.observacao || null,
            saida: valorFormatado
          };
    
      console.log("Payload enviado para API:", payload);
      
      // Usar a mesma rota, apenas alterar o método
      const response = await fetch(`/api/caixaviagem/adiantamento`, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        // Converter a resposta para ver detalhes do erro
        const errorResponse = await response.text();
        console.error("Erro na resposta da API:", errorResponse);
        
        try {
          const errorData = JSON.parse(errorResponse);
          throw new Error(errorData.error || errorData.message || "Erro desconhecido na API");
        } catch (parseError) {
          throw new Error(`Erro na API: ${response.status} - ${errorResponse}`);
        }
      }
      
      toast.success(`Adiantamento ${isEditing ? "atualizado" : "criado"} com sucesso!`);
      resetForm();
      fetchAdiantamentos();
      onAdiantamentosUpdated();
    } catch (error) {
      console.error("Erro ao salvar adiantamento:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : "Ocorreu um erro ao processar sua solicitação"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (adiantamento: Adiantamento) => {
    // Verificar permissão para editar
    if (!userPermissions.canEdit) {
      toast.error("Você não tem permissão para editar adiantamentos.");
      return;
    }

    if (adiantamento.caixaViagemId) {
      toast.info("Não é possível editar um adiantamento já aplicado a uma caixa. Remova o vínculo primeiro.");
      return;
    }
    
    try {
      // Formatar o valor para exibição no input
      let valor = parseFloat(String(adiantamento.saida).replace(/[^\d.,]/g, '').replace(',', '.'));
    
      if (isNaN(valor)) {
        valor = 0;
      }
    
      // Formatar o valor para exibição no formulário
      const valorFormatado = valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    
      console.log("Valor original:", adiantamento.saida);
      console.log("Valor formatado para edição:", valorFormatado);
    
      // Formatar a data corretamente para o formato YYYY-MM-DD
      let dataFormatada = adiantamento.data;
    
      if (dataFormatada.includes('T')) {
        dataFormatada = dataFormatada.split('T')[0]; // Se for ISO String, pegar só a parte da data
      } else {
        // Se for outro formato, converter para YYYY-MM-DD
        const partes = dataFormatada.split('/');
        if (partes.length === 3) {
          const [dia, mes, ano] = partes;
          dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
      }
    
      console.log("Data original:", adiantamento.data);
      console.log("Data formatada para formulário:", dataFormatada);
      console.log("Colaborador do adiantamento:", adiantamento.colaborador);
    
      // Configurar o formulário para edição
      setFormData({
        id: adiantamento.id,
        data: dataFormatada,
        colaboradorId: adiantamento.colaboradorId ? String(adiantamento.colaboradorId) : "",
        observacao: adiantamento.observacao || "",
        saida: valorFormatado
      });
    
      setIsEditing(true);
    
      // Dar foco ao primeiro campo do formulário
      setTimeout(() => {
        const firstSelect = document.querySelector('select[name="colaboradorId"]') as HTMLSelectElement;
        if (firstSelect) firstSelect.focus();
      }, 100);
    } catch (error) {
      console.error("Erro ao preparar formulário para edição:", error);
      toast.error("Não foi possível editar este adiantamento. Tente novamente.");
    }
  };

  const handleDelete = async (id: number) => {
    // Verificar permissão para excluir
    if (!userPermissions.canDelete) {
      toast.error("Você não tem permissão para excluir adiantamentos.");
      return;
    }

    // Verificar se o adiantamento está aplicado
    const adiantamento = adiantamentos.find(a => a.id === id);
    if (adiantamento?.caixaViagemId) {
      toast.info("Não é possível excluir um adiantamento aplicado a uma caixa. Remova o vínculo primeiro.");
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este adiantamento?")) return; // Mantém a mensagem de "excluir" para o usuário
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      
      // Usar o método PUT para ocultar o adiantamento
      const response = await fetch(`/api/caixaviagem/adiantamento`, {
        method: "PUT", // Mudando de DELETE para PUT
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adiantamentoId: id, 
          oculto: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir adiantamento");
      }
      
      toast.success("Adiantamento excluído com sucesso!"); // Mantém a mensagem de "excluído" para o usuário
      fetchAdiantamentos();
      onAdiantamentosUpdated();
    } catch (error) {
      console.error("Erro ao excluir adiantamento:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : "Ocorreu um erro ao processar sua solicitação"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesvincular = async (id: number) => {
    if (!confirm("Deseja realmente desvincular este adiantamento da caixa?")) return;
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      
      const response = await fetch(`/api/caixaviagem/adiantamento`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adiantamentoId: id,
          caixaViagemId: null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao desvincular adiantamento");
      }
      
      toast.success("Adiantamento desvinculado com sucesso!");
      fetchAdiantamentos();
      onAdiantamentosUpdated();
    } catch (error) {
      console.error("Erro ao desvincular adiantamento:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : "Ocorreu um erro ao processar sua solicitação"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatarData = (data: string) => {
    try {
      // Usar a função format diretamente com a data correta
      if (data.includes('T')) {
        const [dataPart] = data.split('T');
        const [ano, mes, dia] = dataPart.split('-');
        return `${dia}/${mes}/${ano}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
      }
      
      // Último recurso
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return data;
    }
  };
  
  const formatarValor = (valor: string) => {
    const numero = parseFloat(valor);
    if (isNaN(numero)) return "R$ 0,00";
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  const resetForm = () => {
    setFormData({
      id: 0,
      data: new Date().toISOString().split("T")[0],
      colaboradorId: "",
      observacao: "",
      saida: ""
    });
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#344893] to-[#4A5BC4] text-white p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Coins size={24} className="mr-3" />
            <h2 className="text-xl font-semibold">Gerenciar Adiantamentos</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Formulário de criação/edição - só aparece se tiver permissão */}
          {userPermissions.canCreate && (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-5 border border-gray-200 mb-6">
              <h3 className="text-lg font-medium mb-4 text-gray-800">{isEditing ? "Editar Adiantamento" : "Novo Adiantamento"}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      name="data"
                      value={formData.data}
                      onChange={handleInputChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      name="colaboradorId"
                      value={formData.colaboradorId}
                      onChange={handleInputChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione um colaborador</option>
                      {colaboradores.map((colaborador) => (
                        <option key={colaborador.id} value={colaborador.id}>
                          {colaborador.nome} {colaborador.sobrenome || ''} 
                          {colaborador.setor && ` - ${colaborador.setor}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Adiantamento</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="saida"
                      value={formData.saida}
                      onChange={handleSaidaChange}
                      placeholder="0,00"
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                  <textarea
                    name="observacao"
                    value={formData.observacao}
                    onChange={handleInputChange}
                    placeholder="Observações adicionais (opcional)"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                    rows={1}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                )}
                
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-[#344893] rounded-md hover:bg-[#263672] flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : isEditing ? (
                    <>
                      <Check size={18} className="mr-2" />
                      Atualizar
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} className="mr-2" />
                      Criar Adiantamento
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Barra de busca */}
          <div className="mb-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, data, valor ou observação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
              />
            </div>
          </div>

          {/* Lista de adiantamentos */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 size={32} className="animate-spin text-[#344893]" />
                <span className="ml-2 text-gray-600">Carregando adiantamentos...</span>
              </div>
            ) : filteredAdiantamentos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Coins size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhum adiantamento encontrado</p>
              </div>
            ) : (
              filteredAdiantamentos.map((adiantamento) => (
                <div
                  key={adiantamento.id}
                  className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    adiantamento.caixaViagemId ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <User size={16} className="text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {adiantamento.colaborador 
                            ? `${adiantamento.colaborador.nome} ${adiantamento.colaborador.sobrenome || ''}`.trim()
                            : adiantamento.nome}
                        </span>
                        {adiantamento.caixaViagemId && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                            <Link size={12} className="mr-1" />
                            Aplicado
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div>
                          <Calendar size={14} className="inline mr-1" />
                          {formatarData(adiantamento.data)}
                        </div>
                        <div>
                          <DollarSign size={14} className="inline mr-1" />
                          {formatarValor(adiantamento.saida)}
                        </div>
                        {adiantamento.caixaViagem && (
                          <div className="md:col-span-2">
                            <FileText size={14} className="inline mr-1" />
                            Caixa {adiantamento.caixaViagem.numeroCaixa} - {adiantamento.caixaViagem.destino}
                          </div>
                        )}
                      </div>
                      
                      {adiantamento.observacao && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Obs:</span> {adiantamento.observacao}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      {adiantamento.caixaViagemId ? (
                        <button
                          onClick={() => handleDesvincular(adiantamento.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                          title="Desvincular da caixa"
                        >
                          <Link2Off size={16} />
                        </button>
                      ) : (
                        <>
                          {userPermissions.canEdit && (
                            <button
                              onClick={() => handleEdit(adiantamento)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar adiantamento"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {userPermissions.canDelete && (
                            <button
                              onClick={() => handleDelete(adiantamento.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Excluir adiantamento"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}