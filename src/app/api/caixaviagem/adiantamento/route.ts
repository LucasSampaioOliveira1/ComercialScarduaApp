import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função de autenticação semelhante às outras APIs
const authenticateToken = (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return null;
    
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return null;
  }
};


/**
 * GET - Listar todos os adiantamentos
 * Lista todos os adiantamentos para o usuário autenticado
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const decodedToken = authenticateToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || decodedToken.id;
    
    // Buscar adiantamentos incluindo informações do colaborador
    const adiantamentos = await prisma.adiantamento.findMany({
      where: {
        userId: userId as string,
        oculto: false // Não mostrar adiantamentos ocultos
      },
      include: {
        colaborador: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            setor: true,
            cargo: true
          }
        },
        caixaViagem: {
          select: {
            id: true,
            destino: true,
            numeroCaixa: true,
          }
        }
      },
      orderBy: { data: 'desc' }
    });

    return NextResponse.json(adiantamentos);
  } catch (error) {
    console.error("Erro ao buscar adiantamentos:", error);
    return NextResponse.json({ error: "Erro ao buscar adiantamentos" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST - Criar novo adiantamento
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const decodedToken = authenticateToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const body = await req.json();
    
    // Validar campos obrigatórios
    if (!body.data || !body.colaboradorId || body.saida === undefined) {
      return NextResponse.json({ error: "Data, colaborador e valor de saída são obrigatórios" }, { status: 400 });
    }
    
    // Verificar se o colaborador existe
    const colaborador = await prisma.colaborador.findUnique({
      where: { id: Number(body.colaboradorId) },
      select: { id: true, nome: true, sobrenome: true }
    });
    
    if (!colaborador) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }
    
    // Usar o nome do colaborador se não foi fornecido um nome específico
    const nomeAdiantamento = body.nome || `${colaborador.nome} ${colaborador.sobrenome || ''}`.trim();
    
    // Criar o adiantamento - sempre sem vínculo com caixaViagem inicialmente
    const novoAdiantamento = await prisma.adiantamento.create({
      data: {
        data: new Date(body.data),
        nome: nomeAdiantamento,
        observacao: body.observacao || null,
        saida: String(body.saida), // Converte para string para ficar consistente com outros modelos financeiros
        userId: decodedToken.id,
        colaboradorId: Number(body.colaboradorId), // Adicionar relacionamento com colaborador
        caixaViagemId: null // Inicialmente não vinculado a nenhum caixa
      },
      include: {
        colaborador: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            setor: true,
            cargo: true
          }
        }
      }
    });

    return NextResponse.json(novoAdiantamento, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar adiantamento:", error);
    return NextResponse.json({ error: "Erro ao criar adiantamento" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT - Atualizar adiantamento ou aplicar a um caixaViagem
 */
export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticação
    const decodedToken = authenticateToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }
    
    const body = await req.json();
    
    // Validar parâmetros necessários
    if (!body.adiantamentoId) {
      return NextResponse.json({ error: "ID do adiantamento é obrigatório" }, { status: 400 });
    }

    // Buscar adiantamento para verificar se existe e incluir colaborador
    const adiantamento = await prisma.adiantamento.findUnique({
      where: { id: Number(body.adiantamentoId) },
      include: {
        colaborador: {
          select: {
            id: true,
            nome: true,
            sobrenome: true
          }
        }
      }
    });
    
    if (!adiantamento) {
      return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });
    }

    // NOVA VALIDAÇÃO: Se está tentando vincular a uma caixa de viagem, 
    // verificar se o colaborador do adiantamento é o mesmo da caixa
    if (body.caixaViagemId !== undefined && body.caixaViagemId !== null) {
      const caixaViagem = await prisma.caixaViagem.findUnique({
        where: { id: Number(body.caixaViagemId) },
        select: {
          id: true,
          funcionarioId: true,
          destino: true,
          funcionario: {
            select: {
              id: true,
              nome: true,
              sobrenome: true
            }
          }
        }
      });
      
      if (!caixaViagem) {
        return NextResponse.json({ error: "Caixa de viagem não encontrada" }, { status: 404 });
      }
      
      // Verificar se o colaborador do adiantamento é o mesmo da caixa de viagem
      if (adiantamento.colaboradorId !== caixaViagem.funcionarioId) {
        const nomeColaboradorAdiantamento = adiantamento.colaborador ? 
          `${adiantamento.colaborador.nome} ${adiantamento.colaborador.sobrenome || ''}`.trim() : 
          'Indefinido';
        
        const nomeColaboradorCaixa = caixaViagem.funcionario ? 
          `${caixaViagem.funcionario.nome} ${caixaViagem.funcionario.sobrenome || ''}`.trim() : 
          'Indefinido';
          
        return NextResponse.json({ 
          error: `Não é possível aplicar este adiantamento. O adiantamento pertence a ${nomeColaboradorAdiantamento}, mas a caixa de viagem pertence a ${nomeColaboradorCaixa}. Adiantamentos só podem ser aplicados em caixas do mesmo colaborador.` 
        }, { status: 400 });
      }
    }

    // Preparar dados para atualização
    const updateData: any = {};
    
    // Campos que podem ser atualizados
    if (body.data !== undefined) updateData.data = new Date(body.data);
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.observacao !== undefined) updateData.observacao = body.observacao;
    if (body.saida !== undefined) updateData.saida = body.saida;
    if (body.oculto !== undefined) updateData.oculto = body.oculto;
    if (body.colaboradorId !== undefined) {
      // Verificar se o colaborador existe antes de atualizar
      if (body.colaboradorId !== null) {
        const colaborador = await prisma.colaborador.findUnique({
          where: { id: Number(body.colaboradorId) },
          select: { id: true, nome: true, sobrenome: true }
        });
        
        if (!colaborador) {
          return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
        }
        
        updateData.colaboradorId = Number(body.colaboradorId);
        // Atualizar o nome automaticamente quando mudar o colaborador
        updateData.nome = body.nome || `${colaborador.nome} ${colaborador.sobrenome || ''}`.trim();
      } else {
        updateData.colaboradorId = null;
      }
    }
    if (body.caixaViagemId !== undefined) {
      updateData.caixaViagemId = body.caixaViagemId === null ? null : Number(body.caixaViagemId);
    }

    // Verificar se há campos para atualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar fornecido" }, { status: 400 });
    }
    
    // Console log para debug
    console.log("Atualizando adiantamento", body.adiantamentoId, "com dados:", updateData);
    
    try {
      // Atualizar adiantamento
      const adiantamentoAtualizado = await prisma.adiantamento.update({
        where: { id: Number(body.adiantamentoId) },
        data: updateData,
        include: {
          colaborador: {
            select: {
              id: true,
              nome: true,
              sobrenome: true,
              setor: true,
              cargo: true
            }
          },
          caixaViagem: {
            select: {
              id: true,
              destino: true,
              numeroCaixa: true
            }
          }
        }
      });
      
      // IMPORTANTE: Retornar o resultado
      return NextResponse.json(adiantamentoAtualizado);
      
    } catch (updateError) {
      console.error("Erro específico na operação de update:", updateError);
      return NextResponse.json({ 
        error: "Erro ao atualizar adiantamento", 
        details: updateError instanceof Error ? updateError.message : "Erro desconhecido" 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Erro ao atualizar adiantamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar adiantamento" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE - "Excluir" adiantamento (na verdade, ocultar)
 * Só é possível ocultar adiantamentos que não estejam vinculados a uma caixa
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verificar autenticação
    const decodedToken = authenticateToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "ID do adiantamento é obrigatório" }, { status: 400 });
    }
    
    // Buscar adiantamento para verificar se existe
    const adiantamento = await prisma.adiantamento.findUnique({
      where: { id: Number(id) }
    });
    
    if (!adiantamento) {
      return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });
    }
    
    // Verificar se o adiantamento está aplicado a uma caixa
    if (adiantamento.caixaViagemId) {
      return NextResponse.json({ 
        error: "Não é possível excluir um adiantamento aplicado a uma caixa. Remova o vínculo primeiro." 
      }, { status: 400 });
    }
    
    // Remover a verificação de permissão - permitir que qualquer usuário oculte adiantamentos
    
    // Em vez de excluir, apenas marcar como oculto
    const adiantamentoOcultado = await prisma.adiantamento.update({
      where: { id: Number(id) },
      data: { oculto: true }
    });
    
    return NextResponse.json(adiantamentoOcultado);
  } catch (error) {
    console.error("Erro ao excluir adiantamento:", error);
    return NextResponse.json({ error: "Erro ao excluir adiantamento" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}