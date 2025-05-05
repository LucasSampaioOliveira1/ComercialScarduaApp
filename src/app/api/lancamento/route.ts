import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função aprimorada para obter o ID do usuário a partir do token
const getUserIdFromToken = (req: NextRequest) => {
  try {
    // Obter o cabeçalho de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;
    
    // Extrair o token (suporta formatos "Bearer xxx" e apenas "xxx")
    let token = authHeader;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    
    if (!token || token.trim() === '') return null;
    
    // Verificar o token com tratamento de erros melhorado
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
};

// POST - Criar lançamentos para uma conta corrente
export async function POST(req: NextRequest) {
  try {
    // Extrair o userId do token com a nova função
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
    
    if (!body.contaCorrenteId) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido" },
        { status: 400 }
      );
    }
    
    const contaCorrenteId = Number(body.contaCorrenteId);
    
    // Verificar se a conta existe
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: contaCorrenteId },
      include: { user: { select: { id: true, role: true } } }
    });
    
    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada" },
        { status: 404 }
      );
    }
    
    // Verificar permissão
    const isOwner = contaCorrente.userId === userId;
    const isAdmin = contaCorrente.user?.role === "ADMIN" || false;
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Sem permissão para esta operação" },
        { status: 403 }
      );
    }
    
    // Limpar lançamentos existentes SOMENTE se clearExisting for explicitamente true
    if (body.clearExisting === true) {
      console.log("Limpando lançamentos existentes para conta:", contaCorrenteId);
      await prisma.lancamento.deleteMany({
        where: { contaCorrenteId }
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
        // Garantir formato correto para os valores
        const data = lancamento.data ? new Date(lancamento.data) : new Date();
        const numeroDocumento = lancamento.numeroDocumento || "";
        const observacao = lancamento.observacao || "";
        
        // Processar valores
        const credito = lancamento.credito ? String(lancamento.credito).replace(/[^\d.,]/g, '').replace(',', '.') : null;
        const debito = lancamento.debito ? String(lancamento.debito).replace(/[^\d.,]/g, '').replace(',', '.') : null;
        
        // Validar que os valores são números
        if ((credito && isNaN(Number(credito))) || (debito && isNaN(Number(debito)))) {
          console.warn("Valor inválido encontrado, pulando:", { credito, debito });
          continue; // Pular lançamento inválido
        }
        
        // Criar lançamento
        const novoLancamento = await prisma.lancamento.create({
          data: {
            contaCorrenteId,
            data,
            numeroDocumento,
            observacao,
            credito,
            debito
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

// Implementação do DELETE para permitir limpar lançamentos
export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    // Obter ID da conta da URL
    const { searchParams } = new URL(req.url);
    const contaCorrenteId = searchParams.get('contaCorrenteId');
    
    if (!contaCorrenteId) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido" },
        { status: 400 }
      );
    }
    
    // Verificar se a conta existe e se o usuário tem acesso
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: Number(contaCorrenteId) },
      include: { user: { select: { id: true, role: true } } }
    });
    
    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada" },
        { status: 404 }
      );
    }
    
    // Verificar permissão
    const isOwner = contaCorrente.userId === userId;
    const isAdmin = contaCorrente.user?.role === "ADMIN" || false;
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Sem permissão para esta operação" },
        { status: 403 }
      );
    }
    
    // Excluir todos os lançamentos
    const result = await prisma.lancamento.deleteMany({
      where: { contaCorrenteId: Number(contaCorrenteId) }
    });
    
    return NextResponse.json({
      success: true,
      message: `${result.count} lançamentos excluídos com sucesso`
    });
  } catch (error) {
    console.error("Erro ao excluir lançamentos:", error);
    return NextResponse.json(
      { error: "Erro ao excluir lançamentos" },
      { status: 500 }
    );
  }
}