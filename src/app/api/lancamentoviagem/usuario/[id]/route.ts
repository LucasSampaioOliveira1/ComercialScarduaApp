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

// Função auxiliar para criar lançamento
async function criarLancamento(lancamento: any, caixaViagemId: number) {
  // Garantir formato correto para as datas
  let dataLancamento;
  
  if (lancamento.data) {
    // Verificar o formato da data recebida
    if (typeof lancamento.data === 'string') {
      // Se receber no formato ISO como string (YYYY-MM-DD)
      dataLancamento = new Date(lancamento.data);
    } else if (lancamento.data instanceof Date) {
      // Se já for um objeto Date
      dataLancamento = lancamento.data;
    } else {
      // Se for outro formato não reconhecido
      console.warn("Data inválida, usando data atual:", lancamento.data);
      dataLancamento = new Date();
    }
  } else {
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
    return null; // Pular lançamento inválido
  }
  
  // Criar lançamento
  return await prisma.viagemLancamento.create({
    data: {
      caixaViagemId,
      data: dataLancamento,
      custo,
      clienteFornecedor,
      numeroDocumento,
      historicoDoc,
      entrada,
      saida
    }
  });
}

// POST - Processar lançamentos de um usuário específico
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "ID do usuário não fornecido" },
        { status: 400 }
      );
    }
    
    console.log("Processando requisição de lançamentos para usuário:", userId);
    
    const body = await request.json();
    
    if (!body.caixaViagemId) {
      return NextResponse.json(
        { error: "ID da caixa de viagem não fornecido" },
        { status: 400 }
      );
    }
    
    const caixaViagemId = Number(body.caixaViagemId);
    
    // Verificar se a caixa existe
    const caixaViagem = await prisma.caixaViagem.findUnique({
      where: { id: caixaViagemId }
    });
    
    if (!caixaViagem) {
      return NextResponse.json(
        { error: "Caixa de viagem não encontrada" },
        { status: 404 }
      );
    }
    
    // Verificar permissão (usuário precisa ser dono da caixa)
    const isOwner = caixaViagem.userId === userId;
    
    // Verificar se é admin
    const tokenUserId = getUserIdFromToken(request);
    const userInfo = await prisma.user.findUnique({
      where: { id: tokenUserId || '' },
      select: { role: true }
    });
    
    const isAdmin = userInfo?.role === "ADMIN";
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Sem permissão para esta operação" },
        { status: 403 }
      );
    }
    
    const resultados = [];
    
    if (body.clearExisting === true) {
      // Limpando lançamentos existentes
      console.log("Limpando lançamentos existentes para caixa:", caixaViagemId);
      await prisma.viagemLancamento.deleteMany({
        where: { caixaViagemId }
      });
      
      for (const lancamento of body.lancamentos) {
        try {
          const novoLancamento = await criarLancamento(lancamento, caixaViagemId);
          if (novoLancamento) resultados.push(novoLancamento);
        } catch (error) {
          console.error("Erro ao criar lançamento:", error);
        }
      }
    } else {
      // Processamento de lançamentos mantidos ou novos
      const lancamentosExistentes = await prisma.viagemLancamento.findMany({
        where: { caixaViagemId }
      });
      
      console.log(`Caixa tem ${lancamentosExistentes.length} lançamentos existentes`);
      
      // Identificar quais IDs foram mantidos
      const idsManutencao = body.lancamentos
        .filter((l: any) => l.id && typeof l.id === 'number')
        .map((l: any) => l.id);
      
      console.log(`IDs mantidos no formulário: ${idsManutencao.length}`);
      
      // Identificar IDs a remover
      const idsParaRemover = lancamentosExistentes
        .filter(l => !idsManutencao.includes(l.id))
        .map(l => l.id);
      
      console.log(`Removendo ${idsParaRemover.length} lançamentos`);
      
      if (idsParaRemover.length > 0) {
        await prisma.viagemLancamento.deleteMany({
          where: {
            id: { in: idsParaRemover }
          }
        });
      }
      
      // Processar lançamentos novos
      const lancamentosNovos = body.lancamentos.filter((l: any) => !l.id);
      
      console.log(`Adicionando ${lancamentosNovos.length} novos lançamentos`);
      
      for (const lancamento of lancamentosNovos) {
        try {
          const novoLancamento = await criarLancamento(lancamento, caixaViagemId);
          if (novoLancamento) resultados.push(novoLancamento);
        } catch (error) {
          console.error("Erro ao criar lançamento:", error);
        }
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
      { error: "Erro ao processar lançamentos", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}