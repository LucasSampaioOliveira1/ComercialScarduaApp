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
  Search
} from "lucide-react";

interface Adiantamento {
  id: number;
  data: string;
  nome: string;
  observacao: string | null;
  saida: string;
  userId: string;
  caixaViagemId: number | null;
  caixaViagem?: {
    id: number;
    destino: string;
    numeroCaixa?: number;
  } | null;
}

interface AdiantamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdiantamentosUpdated: () => void;
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
  onAdiantamentosUpdated
}: AdiantamentoModalProps) {
  const [adiantamentos, setAdiantamentos] = useState<Adiantamento[]>([]);
  const [filteredAdiantamentos, setFilteredAdiantamentos] = useState<Adiantamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    id: 0,
    data: new Date().toISOString().split("T")[0],
    nome: "",
    observacao: "",
    saida: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar adiantamentos
  useEffect(() => {
    if (isOpen) {
      fetchAdiantamentos();
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
        (a.observacao?.toLowerCase() || "").includes(searchTermLower) ||
        formatarData(a.data).includes(searchTermLower) ||
        a.saida.includes(searchTermLower) ||
        (a.caixaViagem?.destino.toLowerCase() || "").includes(searchTermLower)
    );
    
    setFilteredAdiantamentos(filtered);
  }, [searchTerm, adiantamentos]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    
    if (!formData.data || !formData.nome || !formData.saida) {
      toast.error("Data, nome e valor são campos obrigatórios.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      
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
      
      // Criar payload com base no modo (edição ou criação)
      const payload = isEditing
        ? {
            adiantamentoId: formData.id,
            data: dataFormatada, // Usar data formatada como ISO
            nome: formData.nome,
            observacao: formData.observacao || null,
            saida: valorFormatado
          }
        : {
            data: dataFormatada, // Usar data formatada como ISO
            nome: formData.nome,
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
          throw new Error(errorData.error || "Erro ao salvar adiantamento");
        } catch (parseError) {
          throw new Error(`Erro ao salvar adiantamento: ${errorResponse}`);
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
          dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
      }
    
      console.log("Data original:", adiantamento.data);
      console.log("Data formatada para formulário:", dataFormatada);
    
      // Configurar o formulário para edição
      setFormData({
        id: adiantamento.id,
        data: dataFormatada,
        nome: adiantamento.nome,
        observacao: adiantamento.observacao || "",
        saida: valorFormatado
      });
    
      setIsEditing(true);
    
      // Dar foco ao primeiro campo do formulário
      setTimeout(() => {
        const firstInput = document.querySelector('input[name="nome"]') as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }, 100);
    } catch (error) {
      console.error("Erro ao preparar formulário para edição:", error);
      toast.error("Não foi possível editar este adiantamento. Tente novamente.");
    }
  };

  const handleDelete = async (id: number) => {
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
      nome: "",
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
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Coins className="mr-2 text-[#344893]" size={24} />
            Gerenciar Adiantamentos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Formulário de criação/edição */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome/Referência</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Ex: Adiantamento João Silva"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Saída (R$)</label>
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
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Barra de pesquisa */}
          <div className="mb-4 flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar adiantamentos..."
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-[#344893] focus:border-[#344893]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tabela de adiantamentos - removida a coluna de Status */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saída</th>
                    {/* Coluna de Status removida */}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && !filteredAdiantamentos.length ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <Loader2 size={30} className="mx-auto animate-spin text-[#344893]" />
                        <p className="mt-2 text-gray-500">Carregando adiantamentos...</p>
                      </td>
                    </tr>
                  ) : filteredAdiantamentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm ? "Nenhum adiantamento corresponde à sua pesquisa." : "Nenhum adiantamento registrado."}
                      </td>
                    </tr>
                  ) : (
                    filteredAdiantamentos.map((adiantamento) => (
                      <tr key={adiantamento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatarData(adiantamento.data)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{adiantamento.nome}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={adiantamento.observacao || ""}>
                          {adiantamento.observacao || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                          {formatarValor(adiantamento.saida)}
                        </td>
                        {/* Coluna Status removida */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {adiantamento.caixaViagemId ? (
                              // Botão para desvincular
                              <button
                                onClick={() => handleDesvincular(adiantamento.id)}
                                className="p-1.5 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200"
                                title="Desvincular da caixa"
                                disabled={isLoading}
                              >
                                <Link2Off size={16} />
                              </button>
                            ) : (
                              // Botões para editar e excluir
                              <>
                                <button
                                  onClick={() => handleEdit(adiantamento)}
                                  className="p-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                                  title="Editar adiantamento"
                                  disabled={isLoading}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(adiantamento.id)}
                                  className="p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                                  title="Excluir adiantamento" 
                                  disabled={isLoading}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}