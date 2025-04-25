import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: "O nome de usuário é obrigatório" }, { status: 400 });
    }

    // Verificar se o usuário existe
    // Assumindo que o nome de usuário pode estar armazenado no campo 'email' ou em um campo 'username'
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: username }, // Se o email é usado como nome de usuário
          // Se você tiver um campo específico username, descomente a linha abaixo:
          // { username: username }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ 
        exists: false,
        message: "Usuário não encontrado."
      }, { status: 200 });
    }

    return NextResponse.json({
      exists: true,
      userId: user.id, // Enviando o ID do usuário de forma segura para uso na atualização da senha
      message: "Usuário verificado com sucesso."
    }, { status: 200 });
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    return NextResponse.json({
      error: "Ocorreu um erro ao processar sua solicitação."
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}