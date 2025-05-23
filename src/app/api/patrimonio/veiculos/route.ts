import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Remover o import problemático e usar jwt diretamente
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

export async function GET(req: NextRequest) {
  try {
    // Obter o token do cabeçalho Authorization
    const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
    
    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }
    
    // Verificar o token
    try {
      jwt.verify(token, SECRET_KEY);
    } catch (error) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    // Buscar todos os patrimônios que são veículos
    // Corrigindo a consulta para usar startsWith ou equals ao invés de contains com mode
    const veiculos = await prisma.patrimonio.findMany({
      where: {
        tipo: {
          equals: "VEICULO", // Usando equals em vez de contains com mode
        },
        oculto: false
      },
      select: {
        id: true,
        nome: true,
        modelo: true,
        placa: true
      },
      orderBy: {
        modelo: 'asc'
      }
    });

    // Formatar resposta incluindo o nome
    const veiculosFormatados = veiculos.map(v => ({
      id: v.id,
      nome: v.nome,
      modelo: v.modelo || v.nome,
      placa: v.placa || ''
    }));

    return NextResponse.json(veiculosFormatados);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar veículos' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}