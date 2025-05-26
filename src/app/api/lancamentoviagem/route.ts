import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para obter o ID de usuário a partir do token
const getUserIdFromToken = (req: NextRequest): string | null => {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Token não fornecido ou formato incorreto");
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log("Token vazio após split");
      return null;
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY) as any;
      // Verificar qual campo contém o ID (pode ser 'id' ou 'userId')
      return decoded?.id || decoded?.userId || null;
    } catch (tokenError) {
      console.error("Erro ao verificar token:", tokenError);
      return null;
    }
  } catch (error) {
    console.error("Erro ao processar cabeçalho de autorização:", error);
    return null;
  }
};

// POST - Criar lançamentos para uma caixa de viagem
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Verificar dados necessários
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
    
    // Processar os lançamentos
    const resultados = [];
    
    // Se clearExisting é verdadeiro, limpar lançamentos anteriores
    if (body.clearExisting === true) {
      console.log("Limpando lançamentos existentes para caixa:", caixaViagemId);
      await prisma.viagemLancamento.deleteMany({
        where: { caixaViagemId }
      });
      
      // Criar novos lançamentos
      if (body.lancamentos && Array.isArray(body.lancamentos)) {
        for (const lancamento of body.lancamentos) {
          try {
            // Valores podem vir como string, converter para número e depois para string
            const entrada = lancamento.entrada ? 
              String(parseFloat(String(lancamento.entrada).replace(',', '.'))) : null;
            const saida = lancamento.saida ? 
              String(parseFloat(String(lancamento.saida).replace(',', '.'))) : null;
            
            // Criar o lançamento
            const novoLancamento = await prisma.viagemLancamento.create({
              data: {
                caixaViagemId,
                data: new Date(lancamento.data),
                numeroDocumento: lancamento.numeroDocumento || "",
                historicoDoc: lancamento.historicoDoc || "",
                custo: lancamento.custo || "",
                clienteFornecedor: lancamento.clienteFornecedor || "",
                entrada,
                saida
              }
            });
            
            resultados.push(novoLancamento);
          } catch (error) {
            console.error("Erro ao criar lançamento:", error);
          }
        }
      }
    } else {
      // Atualizar lançamentos existentes e criar novos
      if (body.lancamentos && Array.isArray(body.lancamentos)) {
        // Obter lançamentos existentes
        const lancamentosExistentes = await prisma.viagemLancamento.findMany({
          where: { caixaViagemId }
        });
        
        // IDs de lançamentos a manter (existentes que foram enviados)
        interface Lancamento {
          id?: number;
          data: string | Date;
          numeroDocumento?: string;
          historicoDoc?: string;
          custo?: string;
          clienteFornecedor?: string;
          entrada?: string | number | null;
          saida?: string | number | null;
        }

        const idsManutencao: number[] = body.lancamentos
          .filter((l: Lancamento) => l.id && typeof l.id === 'number')
          .map((l: Lancamento) => l.id as number);
        
        // Remover lançamentos que não foram enviados
        const idsParaRemover = lancamentosExistentes
          .filter(l => !idsManutencao.includes(l.id))
          .map(l => l.id);
        
        if (idsParaRemover.length > 0) {
          await prisma.viagemLancamento.deleteMany({
            where: { id: { in: idsParaRemover } }
          });
        }
        
        // Processar cada lançamento
        for (const lancamento of body.lancamentos) {
          try {
            const entrada = lancamento.entrada ? 
              String(parseFloat(String(lancamento.entrada).replace(',', '.'))) : null;
            const saida = lancamento.saida ? 
              String(parseFloat(String(lancamento.saida).replace(',', '.'))) : null;
            
            if (lancamento.id) {
              // Atualizar existente
              const lancamentoAtualizado = await prisma.viagemLancamento.update({
                where: { id: Number(lancamento.id) },
                data: {
                  data: new Date(lancamento.data),
                  numeroDocumento: lancamento.numeroDocumento || "",
                  historicoDoc: lancamento.historicoDoc || "",
                  custo: lancamento.custo || "",
                  clienteFornecedor: lancamento.clienteFornecedor || "",
                  entrada,
                  saida
                }
              });
              resultados.push(lancamentoAtualizado);
            } else {
              // Criar novo
              const novoLancamento = await prisma.viagemLancamento.create({
                data: {
                  caixaViagemId,
                  data: new Date(lancamento.data),
                  numeroDocumento: lancamento.numeroDocumento || "",
                  historicoDoc: lancamento.historicoDoc || "",
                  custo: lancamento.custo || "",
                  clienteFornecedor: lancamento.clienteFornecedor || "",
                  entrada,
                  saida
                }
              });
              resultados.push(novoLancamento);
            }
          } catch (error) {
            console.error("Erro ao processar lançamento:", error);
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Lançamentos salvos com sucesso",
      lancamentos: resultados
    });
  } catch (error) {
    console.error("Erro ao salvar lançamentos:", error);
    return NextResponse.json(
      { error: "Erro ao salvar lançamentos" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET - Buscar lançamentos de uma caixa de viagem
export async function GET(req: NextRequest) {
  try {
    // Remover verificação de token
    // const userId = getUserIdFromToken(req);
    // if (!userId) {
    //   return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    // }
    
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
    
    // Remover verificação de permissão baseada em token
    // Confiar no ID da caixa fornecido na URL
    
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