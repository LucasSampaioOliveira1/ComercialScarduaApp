import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Alternar visibilidade (ocultar/mostrar) - IGUAL AO CONTACORRENTE
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID da caixa de viagem não fornecido" }, 
        { status: 400 }
      );
    }
    
    // Verificar se a caixa existe
    const caixa = await prisma.caixaViagem.findUnique({
      where: { id: parseInt(body.id.toString()) }
    });
    
    if (!caixa) {
      return NextResponse.json(
        { error: "Caixa de viagem não encontrada" }, 
        { status: 404 }
      );
    }
    
    // Alternar visibilidade da caixa - IGUAL AO CONTACORRENTE
    const updated = await prisma.caixaViagem.update({
      where: { id: parseInt(body.id.toString()) },
      data: { oculto: !caixa.oculto }
    });
    
    return NextResponse.json({
      success: true,
      message: updated.oculto 
        ? "Caixa de viagem ocultada com sucesso" 
        : "Caixa de viagem tornada visível com sucesso",
      caixaViagem: updated
    });
  } catch (error) {
    console.error("Erro ao alterar visibilidade da caixa de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao alterar visibilidade da caixa de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}