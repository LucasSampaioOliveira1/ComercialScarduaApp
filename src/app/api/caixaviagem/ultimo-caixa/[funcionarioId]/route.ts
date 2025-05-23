import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para verificar token JWT e extrair userId
function verifyJwtAndGetUserId(token: string): string | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { funcionarioId: string } }
) {
  try {
    // Validar token seguindo o padrão das outras APIs
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Não autorizado - Token não fornecido" }, { status: 401 });
    }
    
    const userId = verifyJwtAndGetUserId(token);
    if (!userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    // Converter e validar o ID do funcionário
    const funcionarioId = parseInt(params.funcionarioId);
    if (isNaN(funcionarioId)) {
      return NextResponse.json(
        { error: "ID do funcionário inválido" }, 
        { status: 400 }
      );
    }
    
    // Buscar o último caixa para este funcionário
    const ultimoCaixa = await prisma.caixaViagem.findFirst({
      where: {
        funcionarioId,
        oculto: false
      },
      orderBy: {
        numeroCaixa: 'desc'
      },
      include: {
        funcionario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true
          }
        },
        lancamentos: true
      }
    });
    
    // Se não encontrou, retornar objeto com valores iniciais
    if (!ultimoCaixa) {
      const funcionario = await prisma.colaborador.findUnique({
        where: { id: funcionarioId },
        select: { id: true, nome: true, sobrenome: true }
      });
      
      if (!funcionario) {
        return NextResponse.json(
          { error: "Funcionário não encontrado" }, 
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        funcionarioId,
        proximoNumero: 1,
        saldoAnterior: 0,
        funcionario
      });
    }
    
    // Calcular saldo do último caixa
    let totalEntradas = 0;
    let totalSaidas = 0;
    
    ultimoCaixa.lancamentos.forEach(lanc => {
      if (lanc.entrada) {
        totalEntradas += parseFloat(String(lanc.entrada));
      }
      if (lanc.saida) {
        totalSaidas += parseFloat(String(lanc.saida));
      }
    });
    
    // Calcular saldo final (considerando saldo anterior do último caixa)
    const saldoAnteriorUltimoCaixa = Number(ultimoCaixa.saldoAnterior) || 0;
    const saldoFinal = saldoAnteriorUltimoCaixa + totalEntradas - totalSaidas;
    
    return NextResponse.json({
      funcionarioId,
      ultimoCaixa: {
        id: ultimoCaixa.id,
        numeroCaixa: ultimoCaixa.numeroCaixa
      },
      proximoNumero: (ultimoCaixa.numeroCaixa || 0) + 1,
      saldoAnterior: saldoFinal,
      funcionario: ultimoCaixa.funcionario
    });
    
  } catch (error) {
    console.error("Erro ao buscar último caixa:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}