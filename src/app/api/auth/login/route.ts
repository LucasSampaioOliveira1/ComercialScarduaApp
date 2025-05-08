// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Verificar se o usuário existe no banco de dados
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Verificar se a senha é válida
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Se o usuário estiver oculto, impedir o login (se aplicável)
    if (user.oculto) {
      return NextResponse.json({ error: "Conta desativada ou oculta" }, { status: 403 });
    }

    // Gerar o token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c",
      { expiresIn: "1d" }
    );

    // Criar a sessão no banco de dados
    const session = await prisma.session.create({
      data: {
        sessionId: token,
        userId: user.id,
      },
    });

    // Criar a resposta e configurar o cookie
    const response = NextResponse.json({ 
      token: token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        // Adicione outras propriedades necessárias
      }
    });

    // Configurar o cookie do token
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 dia
      path: '/'
    });

    return response;

  } catch (error) {
    console.error("Erro ao realizar login:", error);
    return NextResponse.json(
      { error: "Erro interno ao realizar login. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
