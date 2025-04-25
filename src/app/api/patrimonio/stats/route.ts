import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Verificar token
    const token = req.headers.get("authorization")?.split(" ")[1];
    
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Buscar estatísticas
    const [patrimonios, movimentacoes] = await Promise.all([
      prisma.patrimonio.findMany({
        where: { oculto: false },
        include: {
          responsavel: true,
        },
      }),
      prisma.movimentacao.findMany({
        where: {
          createdAt: { // Alterado de data para createdAt
            gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        },
      })
    ]);

    // Processar dados para os gráficos
    const porTipo = patrimonios.reduce((acc, curr) => {
      acc[curr.tipo] = (acc[curr.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const porSetor = patrimonios.reduce((acc, curr) => {
      const setor = curr.responsavel?.setor || 'Sem Setor';
      acc[setor] = (acc[setor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const movimentacoesPorMes = movimentacoes.reduce((acc, curr) => {
      const mes = curr.createdAt.toLocaleString('pt-BR', { month: 'long' }); // Alterado de data para createdAt
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      porTipo,
      porSetor,
      movimentacoesPorMes
    });

  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}