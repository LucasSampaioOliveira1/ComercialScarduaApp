import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  Loader2,
  Link,
  Search,
  Calendar,
  DollarSign
} from "lucide-react";

interface Adiantamento {
  id: number;
  data: string;
  nome: string;
  observacao: string | null;
  saida: string;
  userId: string;
  caixaViagemId: number | null;
}

interface CaixaViagem {
  id: number;
  destino: string;
  numeroCaixa?: number;
  funcionario?: {
    nome: string;
    sobrenome?: string;
  };
}

interface AplicarAdiantamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  caixaViagem: CaixaViagem;
  onAdiantamentoAplicado: () => void;
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

export default function AplicarAdiantamentoModal({
  isOpen,
  onClose,
  caixaViagem,
  onAdiantamentoAplicado
}: AplicarAdiantamentoModalProps) {
  const [adiantamentosDisponiveis, setAdiantamentosDisponiveis] = useState<Adiantamento[]>([]);
  const [filteredAdiantamentos, setFilteredAdiantamentos] = useState<Adiantamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [aplicandoId, setAplicandoId] = useState<number | null>(null);

  // Buscar adiantamentos disponíveis
  useEffect(() => {
    if (isOpen) {
      fetchAdiantamentosDisponiveis();
    }
  }, [isOpen]);

  // Filtrar adiantamentos quando houver busca
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredAdiantamentos(adiantamentosDisponiveis);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = adiantamentosDisponiveis.filter(
      a => 
        a.nome.toLowerCase().includes(searchTermLower) ||
        (a.observacao?.toLowerCase() || "").includes(searchTermLower) ||
        formatarData(a.data).includes(searchTermLower) ||
        a.saida.includes(searchTermLower)
    );
    
    setFilteredAdiantamentos(filtered);
  }, [searchTerm, adiantamentosDisponiveis]);

  const fetchAdiantamentosDisponiveis = async () => {
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
      
      // Filtrar apenas adiantamentos não vinculados a nenhuma caixa
      const disponiveis = data.filter((a: Adiantamento) => a.caixaViagemId === null);
      
      setAdiantamentosDisponiveis(disponiveis);
      setFilteredAdiantamentos(disponiveis);
    } catch (error) {
      console.error("Erro ao buscar adiantamentos disponíveis:", error);
      toast.error("Não foi possível carregar os adiantamentos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAplicar = async (adiantamentoId: number) => {
    try {
      setAplicandoId(adiantamentoId);
      
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
          adiantamentoId: adiantamentoId,
          caixaViagemId: caixaViagem.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao aplicar adiantamento");
      }
      
      toast.success("Adiantamento aplicado com sucesso!");
      
      // Atualizar lista de adiantamentos disponíveis
      fetchAdiantamentosDisponiveis();
      
      // Notificar a página principal para atualizar
      onAdiantamentoAplicado();
    } catch (error) {
      console.error("Erro ao aplicar adiantamento:", error);
      toast.error(`Erro: ${error instanceof Error ? error.message : "Ocorreu um erro ao processar sua solicitação"}`);
    } finally {
      setAplicandoId(null);
    }
  };
  
  const formatarData = (data: string) => {
    try {
      // Usar a abordagem direta para evitar problemas de fuso horário
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Link className="mr-2 text-[#344893]" size={24} />
            Aplicar Adiantamento à Caixa
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* Informações da caixa */}
        <div className="bg-blue-50 p-4 border-b border-blue-100">
          <div className="flex flex-col sm:flex-row justify-between">
            <div>
              <span className="text-sm text-gray-500">Caixa:</span>
              <h3 className="font-semibold text-lg text-gray-800">
                {caixaViagem.numeroCaixa ? `#${caixaViagem.numeroCaixa} - ` : ''}{caixaViagem.destino}
              </h3>
            </div>
            {caixaViagem.funcionario && (
              <div>
                <span className="text-sm text-gray-500">Funcionário:</span>
                <p className="font-medium text-gray-800">
                  {caixaViagem.funcionario.nome} {caixaViagem.funcionario.sobrenome || ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Barra de pesquisa */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar adiantamentos disponíveis..."
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

          {/* Tabela de adiantamentos disponíveis */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 size={40} className="mx-auto animate-spin text-[#344893]" />
                <p className="mt-4 text-gray-600">Carregando adiantamentos disponíveis...</p>
              </div>
            ) : filteredAdiantamentos.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">
                  {searchTerm ? 
                    "Nenhum adiantamento corresponde à sua pesquisa." : 
                    "Não há adiantamentos disponíveis para aplicar. Crie novos adiantamentos na tela principal."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdiantamentos.map((adiantamento) => (
                      <tr key={adiantamento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar size={16} className="text-gray-400 mr-2" />
                            {formatarData(adiantamento.data)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{adiantamento.nome}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={adiantamento.observacao || ""}>
                          {adiantamento.observacao || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                          <div className="flex items-center justify-end">
                            <DollarSign size={16} className="text-gray-400 mr-1" />
                            {formatarValor(adiantamento.saida)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleAplicar(adiantamento.id)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium 
                            ${aplicandoId === adiantamento.id
                              ? "bg-gray-300 text-gray-600 cursor-wait" 
                              : "bg-green-600 text-white hover:bg-green-700"}`}
                            disabled={aplicandoId !== null}
                          >
                            {aplicandoId === adiantamento.id ? (
                              <>
                                <Loader2 size={14} className="mr-1 animate-spin" />
                                Aplicando...
                              </>
                            ) : (
                              <>
                                <Link size={14} className="mr-1" />
                                Aplicar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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