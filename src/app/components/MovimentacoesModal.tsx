interface Colaborador {
  id: number;
  nome: string;
  sobrenome: string;
}

interface MovimentacaoHistorico {
  id: number;
  createdAt: string; // Alterado de 'data' para 'createdAt'
  tipo: string;
  localizacaoAnterior?: string;
  localizacaoNova?: string;
  responsavelAnterior?: Colaborador | null;
  responsavelNovo?: Colaborador | null;
}

interface MovimentacoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimentacoes: MovimentacaoHistorico[];
  patrimonioNome: string;
  localizacaoAtual: string;
  responsavelAtual: Colaborador | null;
}

export default function MovimentacoesModal({
  isOpen,
  onClose,
  movimentacoes,
  patrimonioNome,
  localizacaoAtual,
  responsavelAtual
}: MovimentacoesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Histórico de Movimentações</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-2">{patrimonioNome}</h3>
            <p className="text-gray-600">
              <span className="font-medium">Localização Atual:</span> {localizacaoAtual}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Responsável Atual:</span>{' '}
              {responsavelAtual ? 
                `${responsavelAtual.nome} ${responsavelAtual.sobrenome}` : 
                'Não definido'}
            </p>
          </div>

          <div className="space-y-4">
            {movimentacoes.length === 0 ? (
              <p className="text-gray-500 text-center">Nenhuma movimentação registrada</p>
            ) : (
              movimentacoes.map((mov) => (
                <div key={mov.id} className="border-l-4 border-[#344893] pl-4 py-2">
                  <p className="font-semibold">
                    {mov.tipo === 'ALTERACAO_RESPONSAVEL' 
                      ? 'Alteração de Responsável' 
                      : 'Alteração de Localização'}
                  </p>
                  <p className="text-sm text-gray-600">{new Date(mov.createdAt).toLocaleString('pt-BR')}</p>

                  {mov.localizacaoAnterior && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">De:</span> {mov.localizacaoAnterior}
                      </p>
                      {mov.localizacaoNova && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Para:</span> {mov.localizacaoNova}
                        </p>
                      )}
                    </div>
                  )}

                  {mov.responsavelAnterior && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">De:</span>{' '}
                        {`${mov.responsavelAnterior.nome} ${mov.responsavelAnterior.sobrenome}`}
                      </p>
                      {mov.responsavelNovo && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Para:</span>{' '}
                          {`${mov.responsavelNovo.nome} ${mov.responsavelNovo.sobrenome}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}