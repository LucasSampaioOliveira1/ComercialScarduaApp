import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import cloudinary from "@/app/utils/cloudinary";
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    // Decodificar token manualmente
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário não encontrado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("foto") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Nenhuma foto enviada" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload para Cloudinary
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "user-photos",
            public_id: `user-${userId}-${Date.now()}`
          },
          (error, result) => {
            if (error) {
              console.error("Erro Cloudinary:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(buffer);
      });

      // Atualizar usuário
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          foto: (result as any).secure_url
        }
      });

      return NextResponse.json({
        foto: updatedUser.foto,
        message: "Foto atualizada com sucesso"
      });

    } catch (uploadError) {
      console.error("Erro no upload:", uploadError);
      return NextResponse.json({ error: "Erro no upload da imagem" }, { status: 500 });
    }

  } catch (error) {
    console.error("Erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
