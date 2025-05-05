import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
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
    
    // Buscar todas as contas correntes do usuário que não estão ocultas
    const contas = await prisma.contaCorrente.findMany({
      where: {
        userId,
        oculto: false
      },
      include: {
        lancamentos: true
      }
    });
    
    // Calcular totais
    let totalEntradas = 0;
    let totalSaidas = 0;
    
    // Agrupar informações por tipo
    const porTipo: Record<string, { count: number, creditos: number, debitos: number }> = {};
    const porSaldo: Record<string, number> = { positivo: 0, negativo: 0, total: contas.length };
    const topFornecedores: Record<string, { valor: number, count: number }> = {};
    
    // Processar cada conta
    for (const conta of contas) {
      let creditosConta = 0;
      let debitosConta = 0;
      
      // Processar lançamentos da conta
      for (const lancamento of conta.lancamentos) {
        if (lancamento.credito) {
          const valorCredito = parseFloat(lancamento.credito);
          if (!isNaN(valorCredito)) {
            creditosConta += valorCredito;
            totalEntradas += valorCredito;
          }
        }
        
        if (lancamento.debito) {
          const valorDebito = parseFloat(lancamento.debito);
          if (!isNaN(valorDebito)) {
            debitosConta += valorDebito;
            totalSaidas += valorDebito;
          }
        }
      }
      
      // Calcular saldo da conta
      const saldoConta = creditosConta - debitosConta;
      
      // Atualizar contagem por tipo
      const tipo = conta.tipo || 'OUTROS';
      if (!porTipo[tipo]) {
        porTipo[tipo] = { count: 0, creditos: 0, debitos: 0 };
      }
      porTipo[tipo].count += 1;
      porTipo[tipo].creditos += creditosConta;
      porTipo[tipo].debitos += debitosConta;
      
      // Atualizar contagem por saldo
      if (saldoConta > 0) {
        porSaldo.positivo += 1;
      } else if (saldoConta < 0) {
        porSaldo.negativo += 1;
      }
      
      // Registrar fornecedor/cliente
      if (conta.fornecedorCliente) {
        if (!topFornecedores[conta.fornecedorCliente]) {
          topFornecedores[conta.fornecedorCliente] = { valor: 0, count: 0 };
        }
        topFornecedores[conta.fornecedorCliente].valor += Math.abs(saldoConta);
        topFornecedores[conta.fornecedorCliente].count += 1;
      }
    }
    
    // Transformar top fornecedores em array e ordenar
    const topFornecedoresArray = Object.entries(topFornecedores)
      .map(([nome, dados]) => ({
        nome,
        valor: dados.valor,
        count: dados.count
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5); // Pegar os 5 principais
    
    // Calcular balanço geral
    const balanco = totalEntradas - totalSaidas;
    
    // Estruturar resposta
    const resumo = {
      totalEntradas,
      totalSaidas,
      balanco,
      totalContas: contas.length,
      porTipo: Object.entries(porTipo).map(([tipo, dados]) => ({
        tipo,
        count: dados.count,
        creditos: dados.creditos,
        debitos: dados.debitos,
        saldo: dados.creditos - dados.debitos
      })),
      porSaldo,
      topFornecedores: topFornecedoresArray
    };
    
    return NextResponse.json(resumo);
  } catch (error) {
    console.error('Erro ao gerar resumo financeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar resumo financeiro' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}