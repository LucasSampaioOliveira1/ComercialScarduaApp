import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";  // Para verificar o token JWT

// Usar uma instância única do Prisma Client (em produção)
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("sessionId")?.value; // Buscando o sessionId do cookie
  const token = req.headers.get("Authorization")?.replace("Bearer ", ""); // Buscando o token JWT no cabeçalho

  if (!sessionId && !token) {
    return NextResponse.json({ error: "Usuário não autenticado!" }, { status: 401 });
  }

  try {
    let user;

    // Verificando a sessão com sessionId (caso esteja utilizando cookies)
    if (sessionId) {
      const session = await prisma.session.findUnique({
        where: { sessionId },
        include: { user: true },
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Sessão inválida!" }, { status: 401 });
      }

      user = session.user;
    }

    // Se não houver sessionId, verifica o token JWT
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c");

        // Busca o usuário associado ao token JWT
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user) {
          return NextResponse.json({ error: "Usuário não encontrado!" }, { status: 401 });
        }
      } catch (err) {
        return NextResponse.json({ error: "Token inválido ou expirado!" }, { status: 401 });
      }
    }

    return NextResponse.json({
      message: "Acesso permitido.",
      user: user ? { id: user.id, email: user.email } : null,
    });
  } catch (error) {
    console.error("Erro ao verificar a sessão:", error);
    return NextResponse.json({ error: "Erro interno no servidor!" }, { status: 500 });
  }
}
