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

// 🚀 **[GET] - Obter estatísticas de contas corrente**
export async function GET(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = authenticateToken(req);
    const userId = user.id;
    const isAdmin = user.role === "ADMIN";

    // Determinar permissões
    let whereClause: any = {};
    
    // Se não é admin, verificar se tem permissão para ver todas as contas
    if (!isAdmin) {
      const permission = await prisma.permission.findFirst({
        where: {
          userId: userId,
          page: "contacorrente",
          canAccess: true
        }
      });
      
      // Se não tem permissão, mostrar apenas as próprias contas
      if (!permission) {
        whereClause.userId = userId;
      }
    }
    
    // Buscar contas
    const contas = await prisma.contaCorrente.findMany({
      where: whereClause,
      include: {
        lancamentos: true
      }
    });
    
    // Calcular estatísticas
    let totalCreditos = 0;
    let totalDebitos = 0;
    let creditosMes = 0;
    let debitosMes = 0;
    
    // Definir datas do mês atual
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    // Processar lançamentos
    contas.forEach(conta => {
      conta.lancamentos.forEach(lancamento => {
        const credito = lancamento.credito ? parseFloat(lancamento.credito) : 0;
        const debito = lancamento.debito ? parseFloat(lancamento.debito) : 0;
        
        // Acumular totais gerais
        totalCreditos += credito;
        totalDebitos += debito;
        
        // Verificar se é do mês atual
        const dataLancamento = new Date(lancamento.data);
        if (dataLancamento >= inicioMes && dataLancamento <= fimMes) {
          creditosMes += credito;
          debitosMes += debito;
        }
      });
    });
    
    // Calcular saldo geral
    const saldoGeral = totalCreditos - totalDebitos;
    const saldoMes = creditosMes - debitosMes;
    
    return NextResponse.json({
      totalContas: contas.length,
      totalCreditos,
      totalDebitos,
      creditosMes,
      debitosMes,
      saldoGeral,
      saldoMes
    });
    
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}