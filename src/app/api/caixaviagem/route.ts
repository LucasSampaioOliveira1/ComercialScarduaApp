import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

function getUserIdFromToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

// GET - Listar caixas de viagem do usuário logado
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 }
      );
    }

    // Na página caixaviagem, mostrar apenas as caixas do usuário logado
    const caixas = await prisma.caixaViagem.findMany({
      where: { userId, oculto: false },
      include: {
        empresa: true,
        funcionario: true,
        lancamentos: true,
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        }
      },
      orderBy: { data: 'desc' }
    });
    
    return NextResponse.json(caixas);
  } catch (error) {
    console.error("Erro ao buscar caixas de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao buscar caixas de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Criar ou atualizar caixa de viagem
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    const body = await req.json();
    
    if (body.id) {
      // Verificar se a caixa de viagem existe
      const caixaViagem = await prisma.caixaViagem.findUnique({
        where: { id: Number(body.id) }
      });
      
      if (!caixaViagem) {
        return NextResponse.json(
          { error: "Caixa de viagem não encontrada" },
          { status: 404 }
        );
      }
      
      // Verificar se o usuário é o dono da caixa
      if (caixaViagem.userId !== userId) {
        return NextResponse.json(
          { error: "Sem permissão para editar esta caixa de viagem" },
          { status: 403 }
        );
      }
      
      // Atualizar caixa de viagem
      const updatedCaixa = await prisma.caixaViagem.update({
        where: { id: Number(body.id) },
        data: {
          destino: body.destino,
          data: new Date(body.data),
          empresaId: body.empresaId ? Number(body.empresaId) : null,
          funcionarioId: body.funcionarioId ? Number(body.funcionarioId) : null,
          oculto: body.oculto !== undefined ? Boolean(body.oculto) : false
        }
      });
      
      return NextResponse.json(updatedCaixa);
    } else {
      // Criar nova caixa de viagem
      const novaCaixa = await prisma.caixaViagem.create({
        data: {
          userId,
          destino: body.destino || "",
          data: new Date(body.data),
          empresaId: body.empresaId ? Number(body.empresaId) : null,
          funcionarioId: body.funcionarioId ? Number(body.funcionarioId) : null,
          oculto: body.oculto !== undefined ? Boolean(body.oculto) : false
        }
      });
      
      return NextResponse.json(novaCaixa);
    }
  } catch (error) {
    console.error("Erro ao salvar caixa de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao salvar caixa de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Excluir caixa de viagem
export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "ID da caixa de viagem não fornecido" },
        { status: 400 }
      );
    }
    
    // Verificar se a caixa existe e pertence ao usuário
    const caixa = await prisma.caixaViagem.findUnique({
      where: { id: Number(id) }
    });
    
    if (!caixa) {
      return NextResponse.json(
        { error: "Caixa de viagem não encontrada" },
        { status: 404 }
      );
    }
    
    if (caixa.userId !== userId) {
      return NextResponse.json(
        { error: "Sem permissão para excluir esta caixa de viagem" },
        { status: 403 }
      );
    }
    
    // Excluir lançamentos relacionados
    await prisma.viagemLancamento.deleteMany({
      where: { caixaViagemId: Number(id) }
    });
    
    // Excluir a caixa
    await prisma.caixaViagem.delete({
      where: { id: Number(id) }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Caixa de viagem excluída com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao excluir caixa de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao excluir caixa de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}