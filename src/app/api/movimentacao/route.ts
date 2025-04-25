import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// 🔐 Função para autenticar token JWT
const authenticateToken = (req: NextRequest) => {
  const token = req.headers.get("Authorization")?.split(" ")[1]?.trim();
  if (!token) throw new Error("Token não fornecido.");
  return jwt.verify(token, SECRET_KEY) as { id: string };
};

export async function GET(req: NextRequest) {
  try {
    const patrimonioId = req.nextUrl.searchParams.get("patrimonioId");
    
    if (!patrimonioId) {
      return NextResponse.json({ error: "ID do patrimônio não fornecido" }, { status: 400 });
    }

    const movimentacoes = await prisma.movimentacao.findMany({
      where: {
        patrimonioId: Number(patrimonioId)
      },
      include: {
        responsavelAnterior: {
          select: {
            id: true,
            nome: true,
            sobrenome: true
          }
        },
        responsavelNovo: {
          select: {
            id: true,
            nome: true,
            sobrenome: true
          }
        },
        patrimonio: {
          select: {
            tipo: true,
            kmEntrega: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ data: movimentacoes }); // Retorna um objeto com a propriedade data
  } catch (error) {
    console.error("Erro ao buscar movimentações:", error);
    return NextResponse.json({ error: "Erro ao buscar movimentações" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { colaboradorId, patrimonioId, tipo, localizacaoNova, responsavelNovoId, kmEntrega } = await req.json();

    const movimentacao = await prisma.movimentacao.create({
      data: {
        tipo,
        autorId: colaboradorId, // Agora usa o ID do colaborador
        patrimonioId: Number(patrimonioId),
        localizacaoNova,
        responsavelNovoId: responsavelNovoId ? Number(responsavelNovoId) : undefined,
      },
      include: {
        autor: true,
        responsavelNovo: true,
        patrimonio: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            data_aquisicao: true,
            valor: true,
            status: true,
            fabricante: true,
            localizacao: true,
            tipo: true,
            numeroNotaFiscal: true,
            dataNotaFiscal: true,
            dataGarantia: true,
            placa: true,
            renavan: true,
            locado: true,
            proprietario: true,
            numeroSerie: true,
            anoModelo: true,
            segurado: true,
            seguradora: true,
            dataVencimentoSeguro: true,
            oculto: true,
            kmEntrega: true, // Adicionando kmEntrega ao retorno
            responsavel: {
              select: {
                id: true,
                nome: true,
                sobrenome: true
              }
            },
            updatedAt: true
          }
        }
      }
    });

    return NextResponse.json(movimentacao);
  } catch (error) {
    console.error("Erro ao criar movimentação:", error);
    
    // Mensagem de erro mais detalhada
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return NextResponse.json(
      { 
        error: "Erro ao criar movimentação",
        message: errorMessage 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}