import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuário não fornecido' },
        { status: 400 }
      );
    }
    
    // Buscar todas as caixas de viagem do usuário que não estão ocultas
    const caixas = await prisma.caixaViagem.findMany({
      where: {
        userId,
        oculto: false
      },
      include: {
        lancamentos: true,
        adiantamentos: true
      }
    });
    
    // Calcular totais
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalAdiantamentos = 0;
    
    // Agrupar informações por destino
    const porDestino: Record<string, { count: number, entradas: number, saidas: number }> = {};
    const porEmpresa: Record<string, { count: number, entradas: number, saidas: number }> = {};
    const principaisDestinos: Record<string, number> = {};
    
    // Processar cada caixa
    for (const caixa of caixas) {
      let entradasCaixa = 0;
      let saidasCaixa = 0;
      
      // Processar lançamentos da caixa
      for (const lancamento of caixa.lancamentos) {
        if (lancamento.entrada) {
          const valorEntrada = parseFloat(lancamento.entrada);
          if (!isNaN(valorEntrada)) {
            entradasCaixa += valorEntrada;
            totalEntradas += valorEntrada;
          }
        }
        
        if (lancamento.saida) {
          const valorSaida = parseFloat(lancamento.saida);
          if (!isNaN(valorSaida)) {
            saidasCaixa += valorSaida;
            totalSaidas += valorSaida;
          }
        }
      }
      
      // Calcular adiantamentos
      if (Array.isArray(caixa.adiantamentos)) {
        caixa.adiantamentos.forEach(a => {
          if (a.saida) totalAdiantamentos += parseFloat(String(a.saida));
        });
      }
      
      // Atualizar contagem por destino
      const destino = caixa.destino || 'OUTROS';
      if (!porDestino[destino]) {
        porDestino[destino] = { count: 0, entradas: 0, saidas: 0 };
      }
      porDestino[destino].count += 1;
      porDestino[destino].entradas += entradasCaixa;
      porDestino[destino].saidas += saidasCaixa;
      
      // Registrar destino para ranking
      principaisDestinos[destino] = (principaisDestinos[destino] || 0) + 1;
      
      // Se tiver empresa, registrar também
      if (caixa.empresaId) {
        // Buscar nome da empresa 
        const empresa = await prisma.empresa.findUnique({
          where: { id: caixa.empresaId }
        });
        
        const nomeEmpresa = empresa?.nomeEmpresa || `Empresa ${caixa.empresaId}`;
        
        if (!porEmpresa[nomeEmpresa]) {
          porEmpresa[nomeEmpresa] = { count: 0, entradas: 0, saidas: 0 };
        }
        porEmpresa[nomeEmpresa].count += 1;
        porEmpresa[nomeEmpresa].entradas += entradasCaixa;
        porEmpresa[nomeEmpresa].saidas += saidasCaixa;
      }
    }
    
    // Transformar em array e ordenar
    const topDestinos = Object.entries(principaisDestinos)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Pegar os 5 principais
    
    // Calcular saldo geral
    const saldo = totalEntradas - totalSaidas - totalAdiantamentos;
    
    // Estruturar resposta
    const resumo = {
      totalEntradas,
      totalSaidas,
      totalAdiantamentos, // Incluir explicitamente no retorno
      saldoGeral: saldo,
      totalCaixas: caixas.length,
      porDestino: Object.entries(porDestino).map(([destino, dados]) => ({
        destino,
        count: dados.count,
        entradas: dados.entradas,
        saidas: dados.saidas,
        saldo: dados.entradas - dados.saidas
      })),
      porEmpresa: Object.entries(porEmpresa).map(([empresa, dados]) => ({
        empresa,
        count: dados.count,
        entradas: dados.entradas,
        saidas: dados.saidas,
        saldo: dados.entradas - dados.saidas
      })),
      topDestinos
    };
    
    return NextResponse.json(resumo);
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    return NextResponse.json(
      { error: "Erro ao gerar resumo" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}