import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ 
        verified: false,
        error: "Nome de usuário e senha são obrigatórios" 
      }, { status: 400 });
    }

    // Encontrar o usuário pelo nome ou email
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { nome: username },
          { email: username }
        ]
      },
    });

    if (!user) {
      return NextResponse.json({ 
        verified: false,
        error: "Usuário não encontrado" 
      }, { status: 404 });
    }

    // Verificar a senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ 
        verified: false,
        error: "Senha incorreta" 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      verified: true,
      message: "Senha verificada com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    return NextResponse.json({ 
      verified: false,
      error: "Ocorreu um erro ao verificar sua senha" 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}