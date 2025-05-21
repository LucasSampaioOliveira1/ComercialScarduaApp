import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para autenticar token JWT
function authenticateToken(req: NextRequest) {
  const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
  if (!token) throw new Error("Token não fornecido.");
  return jwt.verify(token, SECRET_KEY) as { id: string, role?: string };
}

// POST - Alternar visibilidade (ocultar/mostrar)
export async function POST(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";
    
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
    
    // Verificar permissão para alterar visibilidade da caixa
    if (!isAdmin && caixa.userId !== userId) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "caixaviagem",
          canEdit: true
        }
      });
      
      if (!permission) {
        return NextResponse.json(
          { error: "Sem permissão para alterar visibilidade desta caixa de viagem" }, 
          { status: 403 }
        );
      }
    }
    
    // Alternar visibilidade da caixa
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