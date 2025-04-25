// src/middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c"; // Defina a chave secreta no .env

export async function middleware(req: NextRequest) {
  const sessionId = req.cookies.get("sessionId")?.value;
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!sessionId && !token) {
    return handleUnauthorized(req);
  }

  // Tenta validar pelo sessionId primeiro
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { user: true },
    });

    if (session && session.user) {
      return NextResponse.next();
    }
  }

  // Tenta validar pelo token JWT
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error("Erro ao validar token JWT:", error);
    }
  }

  return handleUnauthorized(req);
}

// Retorna erro 401 para APIs e redireciona para login para páginas
function handleUnauthorized(req: NextRequest) {
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
  return isApiRoute
    ? NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/home", "/controledepatrimonio", "/controleusuarios", "/api/usuario/foto"],
};
