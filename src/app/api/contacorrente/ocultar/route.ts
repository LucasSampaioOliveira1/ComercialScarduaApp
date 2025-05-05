import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Extrair dados do corpo da requisição
    const dados = await req.json();
    
    if (!dados.id || !dados.userId) {
      return NextResponse.json(
        { error: "ID da conta ou ID do usuário não fornecido" }, 
        { status: 400 }
      );
    }

    const contaId = parseInt(dados.id.toString());
    const userId = dados.userId;
    
    if (isNaN(contaId)) {
      return NextResponse.json(
        { error: "ID de conta corrente inválido" }, 
        { status: 400 }
      );
    }

    // Verificar se a conta existe
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: contaId },
      select: { id: true, userId: true }
    });
    
    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada" }, 
        { status: 404 }
      );
    }

    // Verificar permissões - usuário proprietário ou admin pode ocultar
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isAdmin = userInfo?.role === "ADMIN";
    const isOwner = contaCorrente.userId === userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Você não tem permissão para ocultar esta conta" },
        { status: 403 }
      );
    }

    // Ocultar a conta corrente
    const updatedConta = await prisma.contaCorrente.update({
      where: { id: contaId },
      data: { oculto: true }
    });

    return NextResponse.json({
      success: true,
      message: "Conta corrente ocultada com sucesso",
      id: updatedConta.id
    });
  } catch (error) {
    console.error("Erro ao ocultar conta corrente:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}