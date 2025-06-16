import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Define the Lancamento interface
interface Lancamento {
  entrada?: number | string | null;
  saida?: number | string | null;
}

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para obter o ID do usuário do token
function getUserIdFromToken(req: NextRequest): string | null {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;
    
    let token = authHeader;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    
    if (!token || token.trim() === '') return null;
    
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as any;
      return decoded?.id || null;
    } catch (tokenError) {
      console.error("Erro ao verificar token:", tokenError);
      return null;
    }
  } catch (error) {
    console.error("Erro ao processar cabeçalho de autorização:", error);
    return null;
  }
}

// Simplificando para usar apenas userId do corpo da requisição
export async function POST(req: NextRequest) {
  try {
    // Ler corpo da requisição
    const body = await req.json();
    const { funcionarioId, userId } = body;
    
    // Verificar se userId está presente
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }
    
    // Buscar caixas para recalcular incluindo adiantamentos
    let caixas;
    
    if (funcionarioId) {
      // Se funcionarioId for fornecido, buscar caixas específicas deste funcionário
      caixas = await prisma.caixaViagem.findMany({
        where: {
          funcionarioId: Number(funcionarioId),
          oculto: false
        },
        orderBy: { numeroCaixa: 'asc' },
        include: { 
          lancamentos: true,
          adiantamentos: true // Incluir adiantamentos 
        }
      });
    } else {
      // Se não for fornecido funcionarioId, buscar todas as caixas
      caixas = await prisma.caixaViagem.findMany({
        where: {
          oculto: false
        },
        orderBy: [
          { funcionarioId: 'asc' },
          { numeroCaixa: 'asc' }
        ],
        include: { 
          lancamentos: true,
          adiantamentos: true // Incluir adiantamentos 
        }
      });
    }

    if (caixas.length === 0) {
      return NextResponse.json({ message: 'Nenhuma caixa encontrada para recálculo' });
    }

    // Agrupar caixas por funcionário para processar cada conjunto separadamente
    const caixasPorFuncionario: Record<number, any[]> = {};
    
    // Garantir que todas as caixas com funcionarioId válido sejam agrupadas
    for (const caixa of caixas) {
      if (!caixa.funcionarioId) continue;
      
      const funcionarioId = caixa.funcionarioId;
      
      if (!caixasPorFuncionario[funcionarioId]) {
        caixasPorFuncionario[funcionarioId] = [];
      }
      
      caixasPorFuncionario[funcionarioId].push(caixa);
    }

    // Processar cada funcionário separadamente
    const caixasAtualizadas = [];

    // Iterar sobre cada grupo de funcionário
    for (const funcionarioId in caixasPorFuncionario) {
      const caixasFuncionario = caixasPorFuncionario[funcionarioId].sort(
        (a, b) => (a.numeroCaixa || 0) - (b.numeroCaixa || 0)
      );
      
      // Se não há caixas para este funcionário, continuar para o próximo
      if (caixasFuncionario.length === 0) continue;
      
      let saldoAnterior = 0;
      
      // Processar cada caixa em ordem de número
      for (let i = 0; i < caixasFuncionario.length; i++) {
        const caixa = caixasFuncionario[i];
        
        if (i === 0) {
          // A primeira caixa mantém seu saldo anterior original
          saldoAnterior = Number(caixa.saldoAnterior || 0);
        } else {
          // As caixas subsequentes recebem o saldo final da caixa anterior
          await prisma.caixaViagem.update({
            where: { id: caixa.id },
            data: { saldoAnterior: saldoAnterior }
          });
        }
        
        // Calcular totais para esta caixa
        let totalEntradas = 0;
        let totalSaidas = 0;
        let totalAdiantamentos = 0;
        
        // Somar lançamentos
        if (caixa.lancamentos) {
            caixa.lancamentos.forEach((lanc: Lancamento) => {
            if (lanc.entrada) {
              const valor: number = parseFloat(String(lanc.entrada));
              if (!isNaN(valor)) totalEntradas += valor;
            }
            if (lanc.saida) {
              const valor: number = parseFloat(String(lanc.saida));
              if (!isNaN(valor)) totalSaidas += valor;
            }
            });
        }
        
        // Somar adiantamentos
        if (caixa.adiantamentos) {
            caixa.adiantamentos.forEach((adiantamento: { saida?: number | string | null }) => {
            if (adiantamento.saida) {
              const valor = parseFloat(String(adiantamento.saida));
              if (!isNaN(valor)) totalAdiantamentos += valor;
            }
            });
        }
        
        // CORREÇÃO: Calcular saldo considerando adiantamentos como ENTRADAS (valor positivo)
        // Antes: const saldoFinal = saldoAnterior + totalEntradas - totalSaidas - totalAdiantamentos;
        const saldoFinal = saldoAnterior + totalEntradas + totalAdiantamentos - totalSaidas;
        
        // Armazenar o saldo para a próxima caixa
        saldoAnterior = saldoFinal;
        
        caixasAtualizadas.push({
          id: caixa.id,
          numeroCaixa: caixa.numeroCaixa,
          funcionarioId: caixa.funcionarioId,
          saldoAnterior: caixa.saldoAnterior,
          totalEntradas,
          totalSaidas,
          totalAdiantamentos, // Incluir no retorno para debug
          saldoFinal
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${caixasAtualizadas.length} caixas recalculadas com sucesso`,
      caixas: caixasAtualizadas
    });
  } catch (error) {
    console.error('Erro ao recalcular saldos:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}