import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função atualizada para obter o ID do usuário do token
function getUserIdFromToken(req: NextRequest): string | null {
  try {
    const header = req.headers.get("Authorization");
    if (!header) return null;
    
    const token = header.startsWith("Bearer ") ? header.substring(7) : header;
    if (!token) return null;
    
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as any;
      return decoded?.id || null;
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return null;
    }
  } catch (error) {
    console.error("Erro ao processar cabeçalho:", error);
    return null;
  }
}

// GET - Obter caixas de viagem de um usuário específico (atualizado)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestedUserId = params.id;
    if (!requestedUserId) {
      return NextResponse.json({ error: "ID de usuário não fornecido" }, { status: 400 });
    }
    
    // Buscar todas as caixas de viagem do usuário
    const caixasViagem = await prisma.caixaViagem.findMany({
      where: {
        userId: params.id,
        oculto: false
      },
      include: {
        empresa: true,
        funcionario: true,
        veiculo: {
          select: {
            id: true,
            nome: true,
            modelo: true,
            placa: true
          }
        },
        lancamentos: true
      },
      orderBy: [
        { funcionarioId: 'asc' },
        { numeroCaixa: 'desc' }  // Ordenação por número do caixa
      ]
    });

    return NextResponse.json(caixasViagem);
  } catch (error) {
    console.error("Erro ao buscar caixas de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao buscar caixas de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Criar/Atualizar caixa para um usuário específico
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuário não fornecido" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    console.log("Corpo da requisição POST caixaViagem/usuario/[id]:", body);
    
    // Se existe ID, é uma atualização
    if (body.id) {
      // Verificar se a caixa de viagem existe
      const caixaViagem = await prisma.caixaViagem.findUnique({
        where: { id: Number(body.id) }
      });
      
      if (!caixaViagem) {
        return NextResponse.json(
          { error: "Caixa de viagem não encontrada" },
          { status: 404 }
        );
      }
      
      // Verificar se o usuário tem permissão (proprietário ou admin)
      const tokenUserId = getUserIdFromToken(request);
      if (!tokenUserId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      
      const userInfo = await prisma.user.findUnique({
        where: { id: tokenUserId },
        select: { role: true }
      });
      
      const isAdmin = userInfo?.role === "ADMIN";
      const isOwner = caixaViagem.userId === userId;
      
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: "Sem permissão para editar esta caixa de viagem" },
          { status: 403 }
        );
      }
      
      // Atualizar a caixa de viagem
      const updatedCaixa = await prisma.caixaViagem.update({
        where: { id: Number(body.id) },
        data: {
          data: body.data ? new Date(body.data) : undefined,
          destino: body.destino,
          empresaId: body.empresaId !== undefined ?
            (body.empresaId === null ? null : Number(body.empresaId)) : undefined,
          funcionarioId: body.funcionarioId !== undefined ?
            (body.funcionarioId === null ? null : Number(body.funcionarioId)) : undefined,
          oculto: body.oculto !== undefined ? Boolean(body.oculto) : undefined
        }
      });
      
      return NextResponse.json(updatedCaixa);
    } else {
      // Criar nova caixa de viagem
      const funcionarioId = body.funcionarioId ? Number(body.funcionarioId) : null;
      
      // Se não tem funcionário, não podemos fazer a sequência
      if (!funcionarioId) {
        return NextResponse.json({ error: "Funcionário é obrigatório" }, { status: 400 });
      }
      
      // É um novo caixa, vamos buscar o último caixa desse funcionário
      const ultimoCaixa = await prisma.caixaViagem.findFirst({
        where: {
          funcionarioId,
          oculto: false
        },
        orderBy: {
          numeroCaixa: 'desc'
        }
      });
      
      // Calcular o próximo número e saldo anterior
      const proximoNumero = ultimoCaixa ? ultimoCaixa.numeroCaixa + 1 : 1;
      
      // Calcular o saldo do último caixa para usar como saldo anterior
      let saldoAnterior = 0;
      
      if (ultimoCaixa) {
        // Buscar lançamentos do último caixa
        const lancamentosUltimoCaixa = await prisma.viagemLancamento.findMany({
          where: {
            caixaViagemId: ultimoCaixa.id
          }
        });
        
        // Calcular saldo
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        lancamentosUltimoCaixa.forEach(lanc => {
          if (lanc.entrada) {
            totalEntradas += parseFloat(String(lanc.entrada));
          }
          if (lanc.saida) {
            totalSaidas += parseFloat(String(lanc.saida));
          }
        });
        
        // Considerar também o saldo anterior do último caixa
        saldoAnterior = Number(ultimoCaixa.saldoAnterior) + totalEntradas - totalSaidas;
      }
      
      // Criar novo caixa com número sequencial e saldo anterior
      const novaCaixa = await prisma.caixaViagem.create({
        data: {
          userId,
          destino: body.destino || "",
          data: new Date(body.data),
          empresaId: body.empresaId ? parseInt(body.empresaId) : null,
          funcionarioId,
          oculto: body.oculto || false,
          numeroCaixa: proximoNumero,
          saldoAnterior: saldoAnterior,
        }
      });
      
      return NextResponse.json(novaCaixa);
    }
  } catch (error) {
    console.error("Erro ao salvar caixa de viagem:", error);
    return NextResponse.json(
      { error: "Erro ao salvar caixa de viagem" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}