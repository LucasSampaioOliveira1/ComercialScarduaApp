import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "seu-segredo-jwt-padrão";

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
    
    // Buscar adiantamentos
    const adiantamentos = await prisma.adiantamento.findMany({
      where: {
        userId: userId as string,
        oculto: false
      },
      include: {
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
    if (!body.data || !body.nome || body.saida === undefined) {
      return NextResponse.json({ error: "Data, nome e valor de saída são obrigatórios" }, { status: 400 });
    }
    
    // Criar o adiantamento - sempre sem vínculo com caixaViagem inicialmente
    const novoAdiantamento = await prisma.adiantamento.create({
      data: {
        data: new Date(body.data),
        nome: body.nome,
        observacao: body.observacao || null,
        saida: String(body.saida), // Converte para string para ficar consistente com outros modelos financeiros
        userId: decodedToken.id,
        caixaViagemId: null // Inicialmente não vinculado a nenhum caixa
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
    
    // Validar ID do adiantamento
    if (!body.adiantamentoId) {
      return NextResponse.json({ error: "ID do adiantamento é obrigatório" }, { status: 400 });
    }
    
    // Verificar se o adiantamento existe
    const adiantamento = await prisma.adiantamento.findUnique({
      where: { id: Number(body.adiantamentoId) }
    });
    
    if (!adiantamento) {
      return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });
    }
    
    // Verificar permissão - apenas o proprietário ou admin pode atualizar
    if (adiantamento.userId !== decodedToken.id && decodedToken.role !== 'ADMIN') {
      return NextResponse.json({ error: "Sem permissão para editar este adiantamento" }, { status: 403 });
    }
    
    // Atualizar o adiantamento
    // Se caixaViagemId estiver definido, vincular ao caixa, se null, desvincular
    const dadosAtualizados: any = {};
    
    // Atualização de campos, se fornecidos
    if (body.data) dadosAtualizados.data = new Date(body.data);
    if (body.nome !== undefined) dadosAtualizados.nome = body.nome;
    if (body.observacao !== undefined) dadosAtualizados.observacao = body.observacao;
    if (body.saida !== undefined) dadosAtualizados.saida = String(body.saida);
    if (body.caixaViagemId !== undefined) dadosAtualizados.caixaViagemId = body.caixaViagemId;
    
    // Se caixaViagemId foi fornecido e não é null, verificar se o caixa existe
    if (body.caixaViagemId) {
      const caixaViagem = await prisma.caixaViagem.findUnique({
        where: { id: Number(body.caixaViagemId) }
      });
      
      if (!caixaViagem) {
        return NextResponse.json({ error: "Caixa de viagem não encontrada" }, { status: 404 });
      }
    }
    
    const adiantamentoAtualizado = await prisma.adiantamento.update({
      where: { id: Number(body.adiantamentoId) },
      data: dadosAtualizados,
      include: {
        caixaViagem: {
          select: {
            id: true,
            destino: true,
            numeroCaixa: true
          }
        }
      }
    });

    // Após aplicar o adiantamento a uma caixa, recalcular o saldo da caixa
    if (body.caixaViagemId) {
      // Chamar a API de recálculo de saldos (pode implementar aqui ou chamar outra função)
      // Este é apenas um exemplo - você pode adaptar de acordo com sua lógica existente
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/caixaviagem/recalcularSaldos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caixaViagemId: body.caixaViagemId })
        });
      } catch (recalcError) {
        console.error("Erro ao recalcular saldo:", recalcError);
        // Não interromper o fluxo por causa do erro de recálculo
      }
    }

    return NextResponse.json(adiantamentoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar adiantamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar adiantamento" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE - Excluir adiantamento
 * Só é possível excluir adiantamentos que não estejam vinculados a um caixa
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
    
    // Verificar se o adiantamento existe
    const adiantamento = await prisma.adiantamento.findUnique({
      where: { id: Number(id) }
    });
    
    if (!adiantamento) {
      return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });
    }
    
    // Verificar permissão - apenas o proprietário ou admin pode excluir
    if (adiantamento.userId !== decodedToken.id && decodedToken.role !== 'ADMIN') {
      return NextResponse.json({ error: "Sem permissão para excluir este adiantamento" }, { status: 403 });
    }
    
    // Não permitir exclusão se estiver vinculado a um caixa
    if (adiantamento.caixaViagemId) {
      return NextResponse.json(
        { error: "Este adiantamento está vinculado a um caixa. Desvinculá-lo primeiro." }, 
        { status: 400 }
      );
    }

    // Excluir o adiantamento
    await prisma.adiantamento.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: "Adiantamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir adiantamento:", error);
    return NextResponse.json({ error: "Erro ao excluir adiantamento" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}