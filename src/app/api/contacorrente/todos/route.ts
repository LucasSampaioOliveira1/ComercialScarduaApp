import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// 🔐 Função para autenticar token JWT
const authenticateToken = (req: NextRequest) => {
  const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
  if (!token) throw new Error("Token não fornecido.");
  return jwt.verify(token, SECRET_KEY) as { id: string, role?: string };
};

// 🚀 **[GET] - Listar todas contas correntes**
export async function GET(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";

    // Obter parâmetros da consulta
    const url = new URL(req.url);
    const showHidden = url.searchParams.get("showHidden") === "true";
    
    // Preparar condições da consulta
    let whereClause: any = {};
    
    // Se não é admin, verificar permissão para visualizar todas as contas
    if (!isAdmin) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "contacorrente",
          canAccess: true
        }
      });
      
      // Se não tem permissão específica, mostrar apenas suas próprias contas
      if (!permission) {
        whereClause.userId = userId;
      }
    }
    
    // Aplicar filtro de ocultos, se necessário
    if (!showHidden) {
      whereClause.oculto = false;
    }
    
    // Buscar contas corrente
    const contas = await prisma.contaCorrente.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        },
        empresa: true,
        colaborador: true,
        lancamentos: {
          orderBy: {
            data: 'desc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Calcular saldo para cada conta
    const contasComSaldo = contas.map(conta => {
      let saldo = 0;
      
      conta.lancamentos.forEach(lancamento => {
        if (lancamento.credito) {
          saldo += parseFloat(lancamento.credito);
        }
        if (lancamento.debito) {
          saldo -= parseFloat(lancamento.debito);
        }
      });
      
      return {
        ...conta,
        saldo
      };
    });
    
    return NextResponse.json(contasComSaldo);
  } catch (error) {
    console.error("Erro ao listar contas correntes:", error);
    return NextResponse.json(
      { error: "Erro ao listar contas correntes" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[POST] - Criar nova conta corrente**
export async function POST(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";
    const body = await req.json();
    
    // Validar campos obrigatórios
    if (!body.userId) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório." }, 
        { status: 400 }
      );
    }
    
    // Verificar permissão para criar conta para outro usuário
    if (body.userId !== userId && !isAdmin) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "contacorrente",
          canCreate: true
        }
      });
      
      if (!permission) {
        return NextResponse.json(
          { error: "Sem permissão para criar conta para outro usuário." }, 
          { status: 403 }
        );
      }
    }
    
    // Criar a conta corrente
    const novaConta = await prisma.contaCorrente.create({
      data: {
        userId: body.userId,
        data: new Date(), // Data obrigatória no schema
        descricao: body.descricao || "",
        tipo: body.tipo || "PESSOAL",
        fornecedorCliente: body.fornecedorCliente || "",
        observacao: body.observacao || "",
        setor: body.setor || "",
        empresaId: body.empresaId ? parseInt(body.empresaId) : null,
        colaboradorId: body.colaboradorId ? parseInt(body.colaboradorId) : null,
        oculto: body.oculto || false
      },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true
          }
        },
        empresa: true,
        colaborador: true
      }
    });
    
    return NextResponse.json({
      ...novaConta,
      lancamentos: [], // Conta nova não tem lançamentos
      saldo: 0, // Saldo inicial zero
      message: "Conta corrente criada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao criar conta corrente:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta corrente" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[PUT] - Alternar visibilidade da conta corrente**
export async function PUT(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido." }, 
        { status: 400 }
      );
    }
    
    // Buscar a conta corrente
    const conta = await prisma.contaCorrente.findUnique({
      where: { id: parseInt(body.id) }
    });
    
    if (!conta) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada." }, 
        { status: 404 }
      );
    }
    
    // Verificar permissão para alterar
    let hasPermission = isAdmin || conta.userId === userId;
    
    if (!hasPermission) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "contacorrente",
          canEdit: true
        }
      });
      
      hasPermission = !!permission;
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Sem permissão para alterar esta conta corrente." }, 
        { status: 403 }
      );
    }
    
    // Alternar status oculto
    const contaAtualizada = await prisma.contaCorrente.update({
      where: { id: parseInt(body.id) },
      data: {
        oculto: !conta.oculto
      }
    });
    
    return NextResponse.json({
      ...contaAtualizada,
      message: `Conta corrente ${contaAtualizada.oculto ? 'ocultada' : 'exibida'} com sucesso.`
    });
  } catch (error) {
    console.error("Erro ao alternar visibilidade:", error);
    return NextResponse.json(
      { error: "Erro ao alternar visibilidade da conta corrente." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}