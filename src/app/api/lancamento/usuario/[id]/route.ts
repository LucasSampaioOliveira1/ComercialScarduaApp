import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
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
      where: { id: contaCorrenteId }
    });
    
    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada" },
        { status: 404 }
      );
    }
    
    // Verificar permissão (usuário precisa ser dono da conta)
    const isOwner = contaCorrente.userId === userId;
    
    // Verificar se é admin
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
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
      // Limpar todos os lançamentos existentes
      console.log("Limpando lançamentos existentes para conta:", contaCorrenteId);
      await prisma.lancamento.deleteMany({
        where: { contaCorrenteId }
      });
      
      // Processar todos como novos
      for (const lancamento of body.lancamentos) {
        try {
          const novoLancamento = await criarLancamento(lancamento, contaCorrenteId);
          if (novoLancamento) resultados.push(novoLancamento);
        } catch (error) {
          console.error("Erro ao criar lançamento:", error);
        }
      }
    } else {
      // AQUI É A PRINCIPAL MUDANÇA: Precisamos identificar lançamentos mantidos e removidos

      // 1. Obter todos os lançamentos existentes dessa conta
      const lancamentosExistentes = await prisma.lancamento.findMany({
        where: { contaCorrenteId }
      });
      
      console.log(`Conta tem ${lancamentosExistentes.length} lançamentos existentes`);
      
      // 2. Identificar quais IDs foram mantidos no formulário
      const idsManutencao = body.lancamentos
        .filter((l: any) => l.id && typeof l.id === 'number')
        .map((l: any) => l.id);
      
      console.log(`IDs mantidos no formulário: ${idsManutencao.length}`);
      
      // 3. Identificar IDs que precisam ser excluídos (existiam mas não foram mantidos)
      const idsParaRemover = lancamentosExistentes
        .filter(l => !idsManutencao.includes(l.id))
        .map(l => l.id);
      
      console.log(`Removendo ${idsParaRemover.length} lançamentos`);
      
      // 4. Remover lançamentos que não foram mantidos
      if (idsParaRemover.length > 0) {
        await prisma.lancamento.deleteMany({
          where: {
            id: { in: idsParaRemover }
          }
        });
      }
      
      // 5. Processar apenas lançamentos novos (sem ID)
      const lancamentosNovos = body.lancamentos.filter((l: any) => !l.id);
      
      console.log(`Adicionando ${lancamentosNovos.length} novos lançamentos`);
      
      for (const lancamento of lancamentosNovos) {
        try {
          const novoLancamento = await criarLancamento(lancamento, contaCorrenteId);
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

// Função auxiliar para criar um lançamento
async function criarLancamento(lancamento: any, contaCorrenteId: number) {
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
    return null;
  }
  
  // Criar lançamento
  return await prisma.lancamento.create({
    data: {
      contaCorrenteId,
      data,
      numeroDocumento,
      observacao,
      credito,
      debito
    }
  });
}