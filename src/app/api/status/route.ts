import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error("bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c");
}

interface JwtPayload {
  userId: string; // Padronizando para userId
  [key: string]: any;
}

export async function GET(req: NextRequest) {
  try {
    // Verificação do token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          message: "Token não fornecido ou formato inválido." 
        }, 
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Decodificação do token
    let decoded: JwtPayload;
    try {
      if (!SECRET_KEY) {
        throw new Error("Secret key is not defined.");
      }
      decoded = jwt.verify(token, SECRET_KEY) as unknown as JwtPayload;
      
      // Verifica se o userId existe no token
      if (!decoded.userId) {
        return NextResponse.json(
          { 
            success: false,
            message: "Token inválido: userId não encontrado." 
          }, 
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          message: "Token inválido ou expirado." 
        }, 
        { status: 401 }
      );
    }

    // Busca do usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }, // Usando userId do token
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        role: true,
        oculto: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          message: "Usuário não encontrado." 
        }, 
        { status: 404 }
      );
    }

    // Retorna informações do usuário
    return NextResponse.json({
      success: true,
      isAdmin: user.role === "ADMIN",
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        role: user.role,
        oculto: user.oculto,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error("Erro ao verificar status:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Erro interno no servidor.",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }, 
      { status: 500 }
    );
  }
}