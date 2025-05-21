import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para autenticar token JWT
function authenticateToken(req: NextRequest) {
  const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
  if (!token) throw new Error("Token não fornecido.");
  return jwt.verify(token, SECRET_KEY) as { id: string, role?: string };
}

// 🚀 **[GET] - Listar todas caixas de viagem**
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
    
    // Se não é admin, verificar permissão para visualizar todas as caixas
    if (!isAdmin) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "caixaviagem",
          canAccess: true  // Alterado de 'access' para 'canAccess' para seguir o padrão
        }
      });
      
      // Se não tem permissão específica, mostrar apenas suas próprias caixas
      if (!permission) {
        whereClause.userId = userId;
      }
    }
    
    // Aplicar filtro de ocultos, se necessário
    if (!showHidden) {
      whereClause.oculto = false;
    }
    
    // Buscar caixas de viagem
    const caixas = await prisma.caixaViagem.findMany({
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
        funcionario: true,
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

    // Calcular saldo para cada caixa
    const caixasComSaldo = caixas.map(caixa => {
      let saldo = 0;
      caixa.lancamentos.forEach(lancamento => {
        if (lancamento.entrada) {
          saldo += parseFloat(lancamento.entrada);
        }
        if (lancamento.saida) {
          saldo -= parseFloat(lancamento.saida);
        }
      });
      
      return {
        ...caixa,
        saldo
      };
    });
    
    return NextResponse.json(caixasComSaldo);
  } catch (error) {
    console.error("Erro ao listar caixas de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao listar caixas de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[POST] - Criar nova caixa de viagem**
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
    
    // Verificar permissão para criar caixa para outro usuário
    if (body.userId !== userId && !isAdmin) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "caixaviagem",
          canEdit: true  // Usando canEdit em vez de canCreate, seguindo o schema
        }
      });
      
      if (!permission) {
        return NextResponse.json(
          { error: "Sem permissão para criar caixa para outro usuário." }, 
          { status: 403 }
        );
      }
    }
    
    // Criar a caixa de viagem
    const novaCaixa = await prisma.caixaViagem.create({
      data: {
        userId: body.userId,
        data: new Date(body.data),
        destino: body.destino || "",
        empresaId: body.empresaId ? parseInt(body.empresaId) : null,
        funcionarioId: body.funcionarioId ? parseInt(body.funcionarioId) : null,
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
        funcionario: true
      }
    });
    
    return NextResponse.json({
      ...novaCaixa,
      lancamentos: [], // Caixa nova não tem lançamentos
      saldo: 0, // Saldo inicial zero
      message: "Caixa de viagem criada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao criar caixa de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao criar caixa de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[PUT] - Alternar visibilidade da caixa de viagem** (adicionando como na API contacorrente)
export async function PUT(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID da caixa de viagem não fornecido." }, 
        { status: 400 }
      );
    }
    
    // Buscar a caixa de viagem
    const caixa = await prisma.caixaViagem.findUnique({
      where: { id: parseInt(body.id) }
    });
    
    if (!caixa) {
      return NextResponse.json(
        { error: "Caixa de viagem não encontrada." }, 
        { status: 404 }
      );
    }
    
    // Verificar permissão para alterar
    let hasPermission = isAdmin || caixa.userId === userId;
    
    if (!hasPermission) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "caixaviagem",
          canEdit: true  // Alterado de 'edit' para 'canEdit' para seguir o padrão
        }
      });
      
      hasPermission = !!permission;
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Sem permissão para alterar esta caixa de viagem." }, 
        { status: 403 }
      );
    }
    
    // Alternar status oculto
    const caixaAtualizada = await prisma.caixaViagem.update({
      where: { id: parseInt(body.id) },
      data: {
        oculto: !caixa.oculto
      }
    });
    
    return NextResponse.json({
      ...caixaAtualizada,
      message: `Caixa de viagem ${caixaAtualizada.oculto ? 'ocultada' : 'exibida'} com sucesso.`
    });
  } catch (error) {
    console.error("Erro ao alternar visibilidade:", error);
    return NextResponse.json(
      { error: "Erro ao alternar visibilidade da caixa de viagem." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}