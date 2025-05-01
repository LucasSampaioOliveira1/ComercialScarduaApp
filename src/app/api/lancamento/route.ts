import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// 🔐 Função aprimorada para autenticar token JWT e verificar se é admin
const authenticateToken = async (req: NextRequest, requireAdmin = false) => {
  try {
    const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
    if (!token) throw new Error("Token não fornecido.");
    
    const decoded = jwt.verify(token, SECRET_KEY) as { id: string, email?: string, role?: string };
    
    // Se o token não tiver role ou user ID, busca no banco
    if (requireAdmin || !decoded.role) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: decoded.id },
            { email: decoded.email }
          ]
        },
        select: { id: true, role: true }
      });
      
      if (!user) throw new Error("Usuário não encontrado.");
      if (requireAdmin && user.role !== 'ADMIN') throw new Error("Acesso restrito a administradores.");
      
      return { id: user.id, role: user.role };
    }
    
    return { id: decoded.id, role: decoded.role };
  } catch (error) {
    throw error;
  }
};

// Função para criar/atualizar lançamentos em massa
export async function POST(req: NextRequest) {
  try {
    // Obter dados do usuário do token
    const userData = await authenticateToken(req);
    const body = await req.json();
    
    // Validar dados recebidos
    if (!body.contaCorrenteId || !body.lancamentos || !Array.isArray(body.lancamentos)) {
      return NextResponse.json({ error: "Dados de lançamentos inválidos" }, { status: 400 });
    }
    
    // Converter ID para número se for string
    const contaCorrenteId = typeof body.contaCorrenteId === 'string'
      ? parseInt(body.contaCorrenteId)
      : body.contaCorrenteId;
    
    // Verificar se a conta corrente existe
    const contaCorrente = await prisma.contaCorrente.findUnique({
      where: { id: contaCorrenteId }
    });
    
    if (!contaCorrente) {
      return NextResponse.json({ error: "Conta corrente não encontrada" }, { status: 404 });
    }
    
    // Verificar permissão para editar
    if (contaCorrente.userId !== userData.id) {
      const usuario = await prisma.user.findUnique({
        where: { id: userData.id },
        select: { role: true }
      });
      
      if (usuario?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Sem permissão para editar lançamentos desta conta" }, 
          { status: 403 }
        );
      }
    }
    
    // Remover lançamentos existentes se solicitado
    if (body.replace === true) {
      await prisma.lancamento.deleteMany({
        where: { contaCorrenteId: contaCorrenteId }
      });
    }
    
    // Validar e filtrar lançamentos
    const lancamentosValidos = body.lancamentos.filter((lancamento: any) => {
      // Verificar se tem pelo menos crédito ou débito
      return (
        (lancamento.credito && lancamento.credito.toString().trim() !== '') || 
        (lancamento.debito && lancamento.debito.toString().trim() !== '')
      );
    });
    
    if (lancamentosValidos.length === 0) {
      return NextResponse.json({ 
        error: "É necessário fornecer pelo menos um lançamento com valor" 
      }, { status: 400 });
    }
    
    // Processar lançamentos
    const resultados = [];
    
    for (const lancamento of lancamentosValidos) {
      // Garantir que os valores são sempre strings ou null
      const credito = lancamento.credito ? lancamento.credito.toString() : null;
      const debito = lancamento.debito ? lancamento.debito.toString() : null;
      
      if (lancamento.id) {
        // Atualizar lançamento existente
        const lancamentoAtualizado = await prisma.lancamento.update({
          where: { 
            id: typeof lancamento.id === 'string' ? parseInt(lancamento.id) : lancamento.id
          },
          data: {
            data: new Date(lancamento.data),
            numeroDocumento: lancamento.numeroDocumento || "",
            observacao: lancamento.observacao || "",
            credito,
            debito
          }
        });
        resultados.push(lancamentoAtualizado);
      } else {
        // Criar novo lançamento
        const novoLancamento = await prisma.lancamento.create({
          data: {
            contaCorrenteId: contaCorrenteId,
            data: new Date(lancamento.data),
            numeroDocumento: lancamento.numeroDocumento || "",
            observacao: lancamento.observacao || "",
            credito,
            debito
          }
        });
        resultados.push(novoLancamento);
      }
    }
    
    return NextResponse.json({
      success: true,
      lancamentos: resultados
    });
    
  } catch (error: any) {
    console.error("Erro ao processar lançamentos:", error);
    
    // Tratar erros de autenticação separadamente
    if (error.message === "Token não fornecido." || 
        error.message === "Usuário não encontrado." ||
        error.message === "jwt expired" ||
        error.message === "jwt malformed") {
      return NextResponse.json({ error: "Erro de autenticação" }, { status: 401 });
    }
    
    if (error.message === "Acesso restrito a administradores.") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }
    
    return NextResponse.json(
      { 
        error: "Erro ao processar lançamentos", 
        details: error.message || String(error) 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}