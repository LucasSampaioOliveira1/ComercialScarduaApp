import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { username, currentPassword, newPassword } = await request.json();

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json({ 
        success: false,
        error: "Nome de usuário, senha atual e nova senha são obrigatórios" 
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
        success: false,
        error: "Usuário não encontrado" 
      }, { status: 404 });
    }

    // Verificar a senha atual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ 
        success: false,
        error: "Senha atual incorreta" 
      }, { status: 401 });
    }

    // Hash da nova senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar a senha do usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "Senha redefinida com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json({ 
      success: false,
      error: "Ocorreu um erro ao redefinir sua senha" 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Rota para verificar se o usuário existe
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return NextResponse.json({ 
        success: false,
        error: "Nome de usuário é obrigatório" 
      }, { status: 400 });
    }

    // Verificar se o usuário existe pelo nome ou email
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { nome: username },       // Busca pelo nome
          { email: username }       // Também tenta pelo email
        ]
      },
    });

    if (!user) {
      return NextResponse.json({ 
        exists: false,
        message: "Usuário não encontrado"
      }, { status: 200 });
    }

    return NextResponse.json({ 
      exists: true,
      userId: user.id,
      message: "Usuário encontrado"
    }, { status: 200 });
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    return NextResponse.json({ 
      success: false,
      error: "Ocorreu um erro ao processar sua solicitação" 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}