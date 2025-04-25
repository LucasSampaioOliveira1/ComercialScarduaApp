import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const empresas = await prisma.empresa.findMany({
      where: {
        oculto: false,
      },
      select: {
        id: true,
        nomeEmpresa: true,
        numero: true,
        cidade: true,
      },
      orderBy: {
        nomeEmpresa: 'asc'
      }
    });

    return NextResponse.json(empresas);
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empresas" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}