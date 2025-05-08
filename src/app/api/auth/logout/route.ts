// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  // Lista de todos os cookies possíveis relacionados à autenticação
  const cookiesToClear = ['sessionId', 'token', 'refreshToken', 'auth'];
  
  // Criar um array de cookies para remover
  const clearedCookies = cookiesToClear.map(name => 
    serialize(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: -1, // Exclui o cookie
      path: "/",
      sameSite: "strict"
    })
  );
  
  const response = NextResponse.json({ 
    success: true,
    message: "Logout bem-sucedido" 
  });
  
  // Adicionar todos os headers de cookies para remover
  clearedCookies.forEach(cookie => {
    response.headers.append("Set-Cookie", cookie);
  });
  
  return response;
}
