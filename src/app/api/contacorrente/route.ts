import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// 🔐 Função para autenticar token JWT e retornar dados do usuário
const authenticateToken = (req: NextRequest) => {
  const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
  if (!token) throw new Error("Token não fornecido.");
  return jwt.verify(token, SECRET_KEY) as { id: string };
};

// 🚀 **[GET] - Buscar conta corrente do usuário logado**
export async function GET(req: NextRequest) {
  try {
    const user = authenticateToken(req); // Autentica usuário
    
    // Buscar conta corrente do usuário com lançamentos
    const contaCorrente = await prisma.contaCorrente.findFirst({
      where: { 
        userId: user.id
      },
      include: {
        empresa: true,
        colaborador: true,
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        },
        lancamentos: {
          orderBy: { data: "desc" }
        }
      }
    });

    // Se não tiver conta corrente, retorna objeto vazio com userId
    if (!contaCorrente) {
      return NextResponse.json({
        userId: user.id,
        lancamentos: [],
        saldo: 0
      });
    }

    // Calcular saldo (não armazenado no banco)
    const creditos = contaCorrente.lancamentos
      .filter(l => l.credito)
      .reduce((sum, item) => sum + parseFloat(item.credito || "0"), 0);
      
    const debitos = contaCorrente.lancamentos
      .filter(l => l.debito)
      .reduce((sum, item) => sum + parseFloat(item.debito || "0"), 0);
      
    const saldo = creditos - debitos;

    return NextResponse.json({
      ...contaCorrente,
      saldo
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Erro ao buscar conta corrente:", errorMessage);
    return NextResponse.json(
      { error: "Erro ao buscar conta corrente.", details: errorMessage }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[POST] - Criar novo lançamento**
export async function POST(req: NextRequest) {
  try {
    const user = authenticateToken(req); // Autentica usuário
    const body = await req.json();
    
    // Validações básicas
    if (!body.data) {
      return NextResponse.json(
        { error: "Data é obrigatória." }, 
        { status: 400 }
      );
    }
    
    if ((!body.credito && !body.debito) || (body.credito && body.debito)) {
      return NextResponse.json(
        { error: "Informe apenas crédito ou débito, não ambos." }, 
        { status: 400 }
      );
    }
    
    // Verificar se o usuário já possui uma conta corrente
    let contaCorrente = await prisma.contaCorrente.findFirst({
      where: { userId: user.id }
    });
    
    // Se não tiver, cria uma nova conta corrente
    if (!contaCorrente) {
      contaCorrente = await prisma.contaCorrente.create({
        data: {
          userId: user.id,
          data: new Date(), // Data de abertura da conta
          tipo: body.tipo || "PESSOAL",
          fornecedorCliente: body.fornecedorCliente || "",
          observacao: body.observacao || "",
          setor: body.setor || "",
          empresaId: body.empresaId ? parseInt(body.empresaId) : null,
          colaboradorId: body.colaboradorId ? parseInt(body.colaboradorId) : null
        }
      });
    }
    
    // Criar o lançamento
    const novoLancamento = await prisma.lancamento.create({
      data: {
        contaCorrenteId: contaCorrente.id,
        data: new Date(body.data),
        numeroDocumento: body.numeroDocumento || null,
        observacao: body.observacao || "",
        credito: body.credito || null,
        debito: body.debito || null
      }
    });
    
    // Buscar conta corrente atualizada com lançamentos
    const contaAtualizada = await prisma.contaCorrente.findUnique({
      where: { id: contaCorrente.id },
      include: {
        empresa: true,
        colaborador: true,
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        },
        lancamentos: {
          orderBy: { data: "desc" }
        }
      }
    });
    
    // Calcular saldo (não armazenado no banco)
    const creditos = contaAtualizada?.lancamentos
      .filter(l => l.credito)
      .reduce((sum, item) => sum + parseFloat(item.credito || "0"), 0) || 0;
      
    const debitos = contaAtualizada?.lancamentos
      .filter(l => l.debito)
      .reduce((sum, item) => sum + parseFloat(item.debito || "0"), 0) || 0;
      
    const saldo = creditos - debitos;

    return NextResponse.json({
      ...contaAtualizada,
      saldo
    }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar lançamento:", error);
    return NextResponse.json(
      { 
        error: "Erro ao criar lançamento.", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[PATCH] - Atualizar conta corrente**
export async function PATCH(req: NextRequest) {
  try {
    const user = authenticateToken(req); // Autentica usuário
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido." }, 
        { status: 400 }
      );
    }
    
    // Verificar se a conta pertence ao usuário
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: parseInt(body.id) }
    });
    
    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada." }, 
        { status: 404 }
      );
    }
    
    if (contaCorrente.userId !== user.id) {
      // Verificar se o usuário é admin
      const usuario = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      });
      
      if (usuario?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Sem permissão para editar esta conta corrente." }, 
          { status: 403 }
        );
      }
    }
    
    // Atualizar a conta corrente
    const contaAtualizada = await prisma.contaCorrente.update({
      where: { id: parseInt(body.id) },
      data: {
        tipo: body.tipo,
        fornecedorCliente: body.fornecedorCliente,
        observacao: body.observacao,
        setor: body.setor,
        empresaId: body.empresaId ? parseInt(body.empresaId) : null,
        colaboradorId: body.colaboradorId ? parseInt(body.colaboradorId) : null
      },
      include: {
        empresa: true,
        colaborador: true,
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        },
        lancamentos: {
          orderBy: { data: "desc" }
        }
      }
    });
    
    // Calcular saldo (não armazenado no banco)
    const creditos = contaAtualizada.lancamentos
      .filter(l => l.credito)
      .reduce((sum, item) => sum + parseFloat(item.credito || "0"), 0);
      
    const debitos = contaAtualizada.lancamentos
      .filter(l => l.debito)
      .reduce((sum, item) => sum + parseFloat(item.debito || "0"), 0);
      
    const saldo = creditos - debitos;

    return NextResponse.json({
      ...contaAtualizada,
      saldo
    });
  } catch (error) {
    console.error("Erro ao atualizar conta corrente:", error);
    return NextResponse.json(
      { 
        error: "Erro ao atualizar conta corrente.", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}