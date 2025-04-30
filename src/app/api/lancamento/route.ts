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

// 🚀 **[POST] - Criar um novo lançamento em conta corrente**
export async function POST(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";
    const body = await req.json();
    
    // Validar informações básicas
    if (!body.contaCorrenteId) {
      return NextResponse.json(
        { error: "ID da conta corrente é obrigatório." }, 
        { status: 400 }
      );
    }
    
    if (!body.data) {
      return NextResponse.json(
        { error: "Data do lançamento é obrigatória." }, 
        { status: 400 }
      );
    }
    
    if (!body.credito && !body.debito) {
      return NextResponse.json(
        { error: "É necessário informar um valor de crédito ou débito." }, 
        { status: 400 }
      );
    }
    
    // Buscar a conta corrente
    const conta = await prisma.contaCorrente.findUnique({
      where: { id: parseInt(body.contaCorrenteId.toString()) }
    });
    
    if (!conta) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada." }, 
        { status: 404 }
      );
    }
    
    // Verificar permissões - Como nas outras APIs
    let hasPermission = isAdmin; // Admin sempre tem permissão

    if (!isAdmin) {
      // Se é proprietário da conta, tem permissão
      if (conta.userId === userId) {
        hasPermission = true;
      } else {
        // Se não é proprietário, verificar permissão específica
        const permission = await prisma.permission.findFirst({
          where: {
            userId: userId,
            page: "contacorrente",
            canCreate: true
          }
        });
        
        hasPermission = !!permission;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Sem permissão para adicionar lançamentos nesta conta." }, 
        { status: 403 }
      );
    }
    
    // Criar o lançamento
    const novoLancamento = await prisma.lancamento.create({
      data: {
        contaCorrenteId: parseInt(body.contaCorrenteId.toString()),
        data: new Date(body.data),
        numeroDocumento: body.numeroDocumento || null,
        observacao: body.observacao || null,
        credito: body.credito ? body.credito.toString() : null,
        debito: body.debito ? body.debito.toString() : null
      }
    });
    
    // Buscar a conta atualizada com todos os lançamentos
    const contaAtualizada = await prisma.contaCorrente.findUnique({
      where: { id: parseInt(body.contaCorrenteId.toString()) },
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
      }
    });
    
    // Calcular saldo
    let saldo = 0;
    contaAtualizada?.lancamentos.forEach(lancamento => {
      if (lancamento.credito) {
        saldo += parseFloat(lancamento.credito);
      }
      if (lancamento.debito) {
        saldo -= parseFloat(lancamento.debito);
      }
    });
    
    return NextResponse.json({
      ...contaAtualizada,
      saldo,
      message: "Lançamento criado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao criar lançamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar lançamento." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}