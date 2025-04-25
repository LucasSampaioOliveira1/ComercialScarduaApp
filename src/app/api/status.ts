import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🚀 Requisição recebida para verificar status do usuário.");

  // Verifica se o método da requisição é GET, caso contrário, retorna 405
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    // Verifica se o token foi fornecido
    if (!token) {
      console.warn("⚠️ Token não fornecido.");
      return res.status(401).json({ message: "Token não fornecido" });
    }

    let decoded;
    // Tenta decodificar o token
    try {
      decoded = jwt.verify(token, SECRET_KEY) as { id: string };
      console.log("🔑 Token decodificado:", decoded);
    } catch (error) {
      console.error("⛔ Token inválido ou expirado:", error);
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    // Busca o usuário no banco de dados com base no id extraído do token
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    // Se o usuário não for encontrado
    if (!user) {
      console.warn("⚠️ Usuário não encontrado no banco.");
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Loga as informações do usuário encontrado
    console.log("✅ Usuário encontrado:", { id: user.id, role: user.role });

    // Verifica se o usuário tem a role de ADMIN
    const isAdmin = user.role === "ADMIN";
    return res.status(200).json({ isAdmin });
    
  } catch (error) {
    // Caso ocorra um erro inesperado
    console.error("🔥 Erro interno no servidor:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
}