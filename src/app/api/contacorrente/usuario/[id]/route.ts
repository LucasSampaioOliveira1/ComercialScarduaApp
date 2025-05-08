import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// Versão corrigida para o Next.js 15.3.1
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuário não fornecido" },
        { status: 400 }
      );
    }
    
    // Buscar contas do usuário específico sem verificação de token
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
    console.error("Erro ao buscar contas do usuário:", error);
    return NextResponse.json(
      { error: "Erro ao buscar contas do usuário" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Versão corrigida para o Next.js 15.3.1
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuário não fornecido" },
        { status: 400 }
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
    
    const body = await request.json();
    
    // Resto do código permanece igual...
    if (body.id) {
      // Atualizar conta existente
      const contaCorrente = await prisma.contaCorrente.findUnique({
        where: { id: Number(body.id) }
      });
      
      if (!contaCorrente) {
        return NextResponse.json(
          { error: "Conta corrente não encontrada" },
          { status: 404 }
        );
      }
      
      const isAdmin = user.role === "ADMIN";
      const isOwner = contaCorrente.userId === userId;
      
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: "Sem permissão para editar esta conta corrente" },
          { status: 403 }
        );
      }
      
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
          userId,
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