import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função melhorada para obter o ID do usuário do token
const getUserIdFromToken = (req: NextRequest) => {
  try {
    // Obter o cabeçalho de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;
    
    // Extrair o token (suporta formatos "Bearer xxx" e apenas "xxx")
    let token = authHeader;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    
    if (!token || token.trim() === '') return null;
    
    // Verificar o token com tratamento de erros melhorado
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as any;
      return decoded?.id || null;
    } catch (tokenError) {
      console.error("Erro ao verificar token:", tokenError);
      return null;
    }
  } catch (error) {
    console.error("Erro ao processar cabeçalho de autorização:", error);
    return null;
  }
};

// GET - Listar contas corrente do usuário logado
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

    // Na página contacorrente, mostrar apenas as contas do usuário logado
    const contas = await prisma.contaCorrente.findMany({
      where: { userId },
      include: {
        empresa: true,
        colaborador: true,
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        },
        lancamentos: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(contas);

  } catch (error) {
    console.error("Erro ao buscar contas correntes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar contas correntes" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Implementação simplificada do POST - para criar ou atualizar
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    console.log("Processando requisição POST para contacorrente. UserID:", userId);

    const body = await req.json();

    // LÓGICA SIMPLIFICADA: Se tem ID, atualiza; se não tem, cria
    if (body.id) {
      // Atualizar conta existente

      // Verificar se a conta existe e pertence ao usuário
      const contaCorrente = await prisma.contaCorrente.findUnique({
        where: { id: Number(body.id) }
      });

      if (!contaCorrente) {
        return NextResponse.json(
          { error: "Conta corrente não encontrada" },
          { status: 404 }
        );
      }

      // Verificar permissões (proprietário ou admin)
      const userInfo = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      const isAdmin = userInfo?.role === "ADMIN";
      const isOwner = contaCorrente.userId === userId;

      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: "Sem permissão para editar esta conta corrente" },
          { status: 403 }
        );
      }

      // Atualizar a conta
      const updatedConta = await prisma.contaCorrente.update({
        where: { id: Number(body.id) },
        data: {
          data: body.data ? new Date(body.data) : undefined,
          tipo: body.tipo,
          fornecedorCliente: body.fornecedorCliente,
          observacao: body.observacao,
          setor: body.setor,
          empresaId: body.empresaId !== undefined ?
            (body.empresaId === null ? null : Number(body.empresaId)) : undefined,
          colaboradorId: body.colaboradorId !== undefined ?
            (body.colaboradorId === null ? null : Number(body.colaboradorId)) : undefined,
          oculto: body.oculto !== undefined ? Boolean(body.oculto) : undefined
        }
      });

      return NextResponse.json(updatedConta);
    } else {
      // Criar nova conta
      const contaCorrente = await prisma.contaCorrente.create({
        data: {
          userId: body.userId || userId,
          data: new Date(body.data),
          tipo: body.tipo || "EXTRA_CAIXA",
          fornecedorCliente: body.fornecedorCliente || "",
          observacao: body.observacao || "",
          setor: body.setor || "",
          empresaId: body.empresaId ? parseInt(body.empresaId) : null,
          colaboradorId: body.colaboradorId ? parseInt(body.colaboradorId) : null,
          oculto: body.oculto || false
        }
      });

      return NextResponse.json(contaCorrente);
    }
  } catch (error) {
    console.error("Erro ao salvar conta corrente:", error);
    return NextResponse.json(
      { error: "Erro ao salvar conta corrente" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Excluir uma conta corrente
export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);

    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Obter ID da conta da URL
    const { searchParams } = new URL(req.url);
    const contaId = searchParams.get('id');

    if (!contaId) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido" },
        { status: 400 }
      );
    }

    // Verificar se a conta existe e pertence ao usuário
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: Number(contaId) }
    });

    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada" },
        { status: 404 }
      );
    }

    // Verificar permissões (proprietário ou admin)
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isAdmin = userInfo?.role === "ADMIN";
    const isOwner = contaCorrente.userId === userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Sem permissão para excluir esta conta corrente" },
        { status: 403 }
      );
    }

    // Primeiro, excluir lançamentos relacionados
    await prisma.lancamento.deleteMany({
      where: { contaCorrenteId: Number(contaId) }
    });

    // Em seguida, excluir a conta
    await prisma.contaCorrente.delete({
      where: { id: Number(contaId) }
    });

    return NextResponse.json({
      success: true,
      message: "Conta corrente excluída com sucesso"
    });
  } catch (error) {
    console.error("Erro ao excluir conta corrente:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta corrente" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Para alternar visibilidade (mantendo para compatibilidade)
export async function PUT(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);

    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido" },
        { status: 400 }
      );
    }

    const contaId = parseInt(body.id);

    // Verificar se a conta existe
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: contaId },
    });

    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada" },
        { status: 404 }
      );
    }

    // Verificar permissões
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isAdmin = userInfo?.role === "ADMIN";
    const isOwner = contaCorrente.userId === userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Sem permissão para editar esta conta corrente" },
        { status: 403 }
      );
    }

    // Alternar visibilidade
    const updatedConta = await prisma.contaCorrente.update({
      where: { id: contaId },
      data: { oculto: !contaCorrente.oculto }
    });

    return NextResponse.json({
      success: true,
      message: `Conta ${updatedConta.oculto ? 'ocultada' : 'restaurada'} com sucesso`
    });
  } catch (error) {
    console.error("Erro ao alternar visibilidade da conta corrente:", error);
    return NextResponse.json(
      { error: "Erro ao processar ação" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}