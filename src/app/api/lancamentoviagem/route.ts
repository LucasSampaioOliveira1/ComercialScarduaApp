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

// POST - Criar lançamentos para uma caixa de viagem
export async function POST(req: NextRequest) {
  try {
    // Extrair o userId do token
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      console.error("Token inválido ou não fornecido");
      return NextResponse.json(
        { error: "Não autorizado" }, 
        { status: 401 }
      );
    }
    
    console.log("Processando requisição de lançamentos para usuário:", userId);
    
    const body = await req.json();
    
    if (!body.caixaViagemId) {
      return NextResponse.json(
        { error: "ID da caixa de viagem não fornecido" },
        { status: 400 }
      );
    }
    
    const caixaViagemId = Number(body.caixaViagemId);
    
    // Verificar se a caixa existe
    const caixaViagem = await prisma.caixaViagem.findUnique({
      where: { id: caixaViagemId },
      include: { user: { select: { id: true, role: true } } }
    });
    
    if (!caixaViagem) {
      return NextResponse.json(
        { error: "Caixa de viagem não encontrada" },
        { status: 404 }
      );
    }
    
    // Verificar permissão
    const isOwner = caixaViagem.userId === userId;
    const isAdmin = caixaViagem.user?.role === "ADMIN" || false;
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Sem permissão para esta operação" },
        { status: 403 }
      );
    }
    
    // Limpar lançamentos existentes SOMENTE se clearExisting for explicitamente true
    if (body.clearExisting === true) {
      console.log("Limpando lançamentos existentes para caixa:", caixaViagemId);
      await prisma.viagemLancamento.deleteMany({
        where: { caixaViagemId }
      });
    }
    
    // Processar lançamentos
    const resultados = [];
    
    if (!Array.isArray(body.lancamentos) || body.lancamentos.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum lançamento para processar",
        lancamentos: []
      });
    }
    
    for (const lancamento of body.lancamentos) {
      try {
        // Garantir formato correto para as datas
        let dataLancamento;
        
        if (lancamento.data) {
          // Verificar o formato da data recebida
          if (typeof lancamento.data === 'string') {
            // Se receber no formato ISO como string (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(lancamento.data)) {
              const [year, month, day] = lancamento.data.split('-').map(Number);
              dataLancamento = new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar problemas de timezone
            } else {
              // Outras strings de data
              dataLancamento = new Date(lancamento.data);
            }
          } else {
            // Se não for string, tentar converter
            dataLancamento = new Date(lancamento.data);
          }
        } else {
          // Se não tiver data, usar data atual
          dataLancamento = new Date();
        }
        
        // Garantir que temos uma data válida
        if (isNaN(dataLancamento.getTime())) {
          console.warn("Data inválida, usando data atual:", lancamento.data);
          dataLancamento = new Date();
        }
        
        const custo = lancamento.custo || "";
        const clienteFornecedor = lancamento.clienteFornecedor || "";
        const numeroDocumento = lancamento.numeroDocumento || null;
        const historicoDoc = lancamento.historicoDoc || null;
        
        // Processar valores
        const entrada = lancamento.entrada !== null && lancamento.entrada !== undefined ? 
          String(lancamento.entrada).replace(/[^\d.,]/g, '').replace(',', '.') : 
          null;
        const saida = lancamento.saida !== null && lancamento.saida !== undefined ? 
          String(lancamento.saida).replace(/[^\d.,]/g, '').replace(',', '.') : 
          null;
        
        // Validar que pelo menos um valor é válido
        if (!custo || (!entrada && !saida)) {
          console.warn("Valores inválidos encontrados, pulando:", { custo, entrada, saida });
          continue; // Pular lançamento inválido
        }
        
        // Criar lançamento
        const novoLancamento = await prisma.viagemLancamento.create({
          data: {
            caixaViagemId,
            data: dataLancamento,
            custo,
            clienteFornecedor,
            entrada,
            saida,
            numeroDocumento,
            historicoDoc
          }
        });
        
        resultados.push(novoLancamento);
      } catch (error) {
        console.error("Erro ao criar lançamento:", error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${resultados.length} lançamentos adicionados com sucesso`,
      lancamentos: resultados
    });
  } catch (error) {
    console.error("Erro ao processar lançamentos:", error);
    return NextResponse.json(
      { error: "Erro ao processar lançamentos" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET - Buscar lançamentos de uma caixa de viagem
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    // Obter ID da URL
    const url = new URL(req.url);
    const caixaViagemId = url.searchParams.get('caixaViagemId');
    
    if (!caixaViagemId) {
      return NextResponse.json(
        { error: "ID da caixa de viagem não fornecido" },
        { status: 400 }
      );
    }
    
    // Verificar se a caixa existe
    const caixaViagem = await prisma.caixaViagem.findUnique({
      where: { id: Number(caixaViagemId) }
    });
    
    if (!caixaViagem) {
      return NextResponse.json(
        { error: "Caixa de viagem não encontrada" },
        { status: 404 }
      );
    }
    
    // Verificar se o usuário tem permissão
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    const isAdmin = userInfo?.role === "ADMIN";
    
    if (!isAdmin && caixaViagem.userId !== userId) {
      return NextResponse.json(
        { error: "Sem permissão para acessar esta caixa de viagem" },
        { status: 403 }
      );
    }
    
    // Buscar lançamentos
    const lancamentos = await prisma.viagemLancamento.findMany({
      where: { caixaViagemId: Number(caixaViagemId) },
      orderBy: { data: 'asc' }
    });
    
    return NextResponse.json(lancamentos);
  } catch (error) {
    console.error("Erro ao buscar lançamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar lançamentos" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}