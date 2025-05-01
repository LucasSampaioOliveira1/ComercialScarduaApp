import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// 🔐 Função para autenticar token JWT
const authenticateToken = (req: NextRequest) => {
  const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
  if (!token) throw new Error("Token não fornecido");
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { id: string, email?: string, role?: string };
    return { 
      id: decoded.id, 
      email: decoded.email,
      role: decoded.role || 'USER' // Garantir que role sempre tenha um valor
    };
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    throw new Error("Token inválido ou expirado");
  }
};

// GET - Listar contas correntes
export async function GET(req: NextRequest) {
  console.log("API contacorrente: Requisição recebida");
  
  try {
    // Extrair token do cabeçalho para diagnóstico
    const authHeader = req.headers.get("Authorization");
    console.log("Authorization header presente:", authHeader ? "Sim" : "Não");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Token não fornecido ou em formato incorreto");
      return NextResponse.json(
        { error: "Token não fornecido" },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1]?.trim();
    console.log("Token extraído do cabeçalho");
    
    try {
      // Verificar token
      const user = authenticateToken(req);
      console.log("Token verificado com sucesso:", user.id);

      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId') || user.id;
      
      // Usar uma condição mais segura
      if (!userId && !user.id) {
        console.log("Nenhum ID de usuário disponível (nem do token, nem do parâmetro)");
        return NextResponse.json(
          { error: "ID do usuário não fornecido" },
          { status: 400 }
        );
      }

      // Usar userId ou id do token, com fallback para uma string vazia (que não encontrará nada)
      const userIdFinal = userId || user.id || "";
      
      // Verificar permissões
      const includeAll = searchParams.get('all') === 'true' && user.role === 'ADMIN';
      const where = includeAll ? {} : { userId: userIdFinal };

      try {
        // Buscar contas correntes
        const contasCorrentes = await prisma.contaCorrente.findMany({
          where,
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
            lancamentos: true
          },
          orderBy: { createdAt: 'desc' }
        });
        
        // Processar cada conta para cálculo de saldo
        const contasComSaldo = contasCorrentes.map(conta => {
          const lancamentos = Array.isArray(conta.lancamentos) ? conta.lancamentos : [];
          
          // Calcular total de créditos
          const creditos = lancamentos
            .filter(l => l.credito && !isNaN(parseFloat(l.credito)))
            .reduce((sum, item) => sum + parseFloat(item.credito || "0"), 0);
            
          // Calcular total de débitos
          const debitos = lancamentos
            .filter(l => l.debito && !isNaN(parseFloat(l.debito)))
            .reduce((sum, item) => sum + parseFloat(item.debito || "0"), 0);
            
          return {
            ...conta,
            saldo: creditos - debitos
          };
        });
        
        return NextResponse.json(contasComSaldo);
      } catch (dbError) {
        console.error("Erro ao consultar banco de dados:", dbError);
        return NextResponse.json(
          { error: "Erro ao consultar banco de dados" },
          { status: 500 }
        );
      }
    } catch (authError) {
      console.error("Erro na autenticação do token:", authError);
      return NextResponse.json(
        { error: "Erro de autenticação", details: authError instanceof Error ? authError.message : "Erro desconhecido" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Erro geral na API:", error);
    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Criar nova conta corrente
export async function POST(req: NextRequest) {
  try {
    const user = authenticateToken(req);
    const body = await req.json();
    
    // Validar apenas campos obrigatórios da conta
    if (!body.data) {
      return NextResponse.json(
        { error: "Data é obrigatória." }, 
        { status: 400 }
      );
    }
    
    // Criar a conta corrente
    const contaCorrente = await prisma.contaCorrente.create({
      data: {
        userId: body.userId || user.id,
        data: new Date(body.data),
        tipo: body.tipo || "EXTRA_CAIXA",
        fornecedorCliente: body.fornecedorCliente || "",
        observacao: body.observacao || "",
        setor: body.setor || "",
        empresaId: body.empresaId ? parseInt(body.empresaId) : null,
        colaboradorId: body.colaboradorId ? parseInt(body.colaboradorId) : null,
        oculto: body.oculto || false
      }
    });
    
    return NextResponse.json(contaCorrente, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conta corrente:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta corrente." }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Atualizar conta corrente existente
export async function PATCH(req: NextRequest) {
  try {
    const user = authenticateToken(req);
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID da conta corrente não fornecido." }, 
        { status: 400 }
      );
    }
    
    // Verificar se a conta existe e pertence ao usuário
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: parseInt(body.id) }
    });
    
    if (!contaCorrente) {
      return NextResponse.json(
        { error: "Conta corrente não encontrada." }, 
        { status: 404 }
      );
    }
    
    // Verificar permissões
    if (contaCorrente.userId !== user.id) {
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
    
    // Atualizar a conta corrente com os campos do schema
    const contaAtualizada = await prisma.contaCorrente.update({
      where: { id: parseInt(body.id) },
      data: {
        tipo: body.tipo,
        fornecedorCliente: body.fornecedorCliente,
        observacao: body.observacao,
        setor: body.setor,
        empresaId: body.empresaId ? parseInt(body.empresaId) : null,
        colaboradorId: body.colaboradorId ? parseInt(body.colaboradorId) : null,
        oculto: body.oculto
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