import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para obter o ID do usuário do token
function getUserIdFromToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

// 🚀 **[GET] - Obter estatísticas de caixas de viagem**
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    // Verificar se é admin
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    const isAdmin = userInfo?.role === "ADMIN";
    
    // Preparar condições de busca
    let whereClause: any = {};
    
    if (!isAdmin) {
      // Se não for admin, mostrar apenas suas próprias caixas
      whereClause.userId = userId;
    }
    
    // Buscar caixas de viagem
    const caixas = await prisma.caixaViagem.findMany({
      where: whereClause,
      include: {
        lancamentos: true
      }
    });
    
    // Calcular estatísticas
    let totalEntradas = 0;
    let totalSaidas = 0;
    let entradasMes = 0;
    let saidasMes = 0;
    
    // Definir datas do mês atual
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    // Processar lançamentos
    caixas.forEach(caixa => {
      caixa.lancamentos.forEach(lancamento => {
        const entrada = lancamento.entrada ? parseFloat(lancamento.entrada) : 0;
        const saida = lancamento.saida ? parseFloat(lancamento.saida) : 0;
        
        // Acumular totais gerais
        totalEntradas += entrada;
        totalSaidas += saida;
        
        // Verificar se é do mês atual
        const dataLancamento = new Date(lancamento.data);
        if (dataLancamento >= inicioMes && dataLancamento <= fimMes) {
          entradasMes += entrada;
          saidasMes += saida;
        }
      });
    });
    
    // Calcular saldo geral
    const saldoGeral = totalEntradas - totalSaidas;
    const saldoMes = entradasMes - saidasMes;
    
    // Obter distribuição por destino
    const destinosMap = new Map<string, { count: number, entradas: number, saidas: number }>();
    
    caixas.forEach(caixa => {
      const destino = caixa.destino || "Sem destino";
      const stats = destinosMap.get(destino) || { count: 0, entradas: 0, saidas: 0 };
      
      stats.count += 1;
      
      caixa.lancamentos.forEach(lanc => {
        stats.entradas += lanc.entrada ? parseFloat(lanc.entrada) : 0;
        stats.saidas += lanc.saida ? parseFloat(lanc.saida) : 0;
      });
      
      destinosMap.set(destino, stats);
    });
    
    // Converter para array e ordenar por valor
    const porDestino = [...destinosMap.entries()]
      .map(([destino, stats]) => ({
        destino,
        count: stats.count,
        entradas: stats.entradas,
        saidas: stats.saidas,
        saldo: stats.entradas - stats.saidas
      }))
      .sort((a, b) => b.count - a.count);
    
    // Retornar estatísticas
    return NextResponse.json({
      totalCaixas: caixas.length,
      totalEntradas,
      totalSaidas,
      saldoGeral,
      entradasMes,
      saidasMes,
      saldoMes,
      porDestino: porDestino.slice(0, 10) // Top 10 destinos
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