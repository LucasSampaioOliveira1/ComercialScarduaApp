// Em /api/patrimonio/check-serial/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros da URL
    const url = new URL(request.url);
    const serial = url.searchParams.get("serial");
    const skipId = url.searchParams.get("skipId");
    
    if (!serial || serial.trim() === "") {
      return NextResponse.json({ exists: false });
    }
    
    // Construir a consulta - usando contains em vez de equals com mode insensitive
    const query: any = {
      numeroSerie: {
        equals: serial,
        // Removemos o mode: 'insensitive' que estava causando o erro
      },
      oculto: false
    };
    
    // Se tiver skipId, não considerar o próprio patrimônio
    if (skipId && !isNaN(parseInt(skipId))) {
      query.id = {
        not: parseInt(skipId)
      };
    }
    
    // Verificar se existe outro patrimônio com o mesmo número
    const existingPatrimonio = await prisma.patrimonio.findFirst({
      where: query,
      select: { 
        id: true, 
        nome: true,
        tipo: true
      }
    });
    
    // Retornar resultado
    return NextResponse.json({
      exists: !!existingPatrimonio,
      patrimonio: existingPatrimonio || null
    });
    
  } catch (error: any) {
    console.error("Erro ao verificar número de série:", error);
    return NextResponse.json({ 
      error: "Erro ao verificar número de série", 
      message: error.message 
    }, { status: 500 });
  }
}