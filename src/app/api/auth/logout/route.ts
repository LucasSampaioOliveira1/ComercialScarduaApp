// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  // Exclui o cookie de sessão
  const cookie = serialize("sessionId", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: -1, // Exclui o cookie
    path: "/",
  });

  const response = NextResponse.json({ message: "Logout bem-sucedido" });
  response.headers.set("Set-Cookie", cookie); // Remove o cookie

  return response;
}
