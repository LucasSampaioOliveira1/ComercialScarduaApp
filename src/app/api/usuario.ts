import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Certifique-se de que esse caminho está correto
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c"; // Use variáveis de ambiente para segurança
const uploadDir = path.join(process.cwd(), "public", "uploads"); // Diretório onde as fotos serão armazenadas

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", ""); // Pega o token do header

    if (!token) {
      return NextResponse.json({ message: "Token não fornecido" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY) as { id: string }; // Decodifica o token
    } catch (error) {
      console.error("Erro ao verificar o token:", error); // Log para facilitar o debug
      return NextResponse.json({ message: "Token inválido ou expirado" }, { status: 401 });
    }

    // Busca o usuário no banco de dados usando o ID do token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }

    // Retorna os dados do usuário logado, incluindo a foto
    return NextResponse.json({
      id: user.id,
      nome: user.nome,
      sobrenome: user.sobrenome,
      foto: user.foto, // Retorna o caminho da foto
      role: user.role,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return NextResponse.json({ message: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", ""); // Pega o token do header

    if (!token) {
      return NextResponse.json({ message: "Token não fornecido" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY) as { id: string }; // Decodifica o token
    } catch (error) {
      console.error("Erro ao verificar o token:", error); // Log para facilitar o debug
      return NextResponse.json({ message: "Token inválido ou expirado" }, { status: 401 });
    }

    // Busca o usuário no banco de dados usando o ID do token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }

    // Lida com o upload de foto
    const formData = await req.formData();
    const fotoFile = formData.get("foto") as File;

    if (!fotoFile) {
      return NextResponse.json({ message: "Nenhuma foto enviada." }, { status: 400 });
    }

    // Valida se o arquivo é uma imagem (JPEG, PNG, GIF)
    const mimeType = fotoFile.type;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json({ message: "Formato de imagem inválido. Envie uma imagem JPG, PNG ou GIF." }, { status: 400 });
    }

    const bytes = await fotoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${fotoFile.name}`;
    const filePath = path.join(uploadDir, fileName);

    // Salva o arquivo de imagem no diretório
    fs.writeFileSync(filePath, buffer);
    const newPhotoPath = `/uploads/${fileName}`;

    // Atualiza a foto do usuário no banco de dados
    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: {
        foto: newPhotoPath, // Atualiza o caminho da foto no banco de dados
      },
    });

    // Retorna o usuário atualizado com a nova foto
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar foto do usuário:", error);
    return NextResponse.json({ message: "Erro ao atualizar foto." }, { status: 500 });
  }
}
