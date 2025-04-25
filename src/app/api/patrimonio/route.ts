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

// 🚀 **[GET] - Listar patrimônios (com filtro para ocultos)**
export async function GET(req: NextRequest) {
  try {
    authenticateToken(req); // Autentica usuário

    const showHidden = req.nextUrl.searchParams.get("showHidden") === 'true';
    const home = req.nextUrl.searchParams.get("home");

    if (home) {
      // Conta apenas patrimônios não ocultos (ignora o showHidden na home)
      const totalPatrimonios = await prisma.patrimonio.count({
        where: { oculto: false }
      });
      
      // Pega os últimos 5 patrimônios não ocultos criados
      const ultimosPatrimonios = await prisma.patrimonio.findMany({ 
        take: 5, 
        orderBy: { createdAt: "desc" },
        include: { 
          responsavel: {
            select: {
              id: true,
              nome: true,
              sobrenome: true,
              cargo: true,
              setor: true
            }
          },
          movimentacoes: {
            orderBy: { createdAt: "desc" }, // Alterado de data para createdAt
            take: 1,
            include: {
              autor: {
                select: {
                  id: true,
                  nome: true,
                  sobrenome: true
                }
              }
            }
          }
        },
        where: { oculto: false }
      });
      
      return NextResponse.json({ 
        totalPatrimonios, 
        ultimosPatrimonios: ultimosPatrimonios.map(patrimonio => ({
          id: patrimonio.id,
          nome: patrimonio.nome,
          tipo: patrimonio.tipo,
          createdAt: patrimonio.createdAt,
          responsavel: patrimonio.responsavel,
          ultimaMovimentacao: patrimonio.movimentacoes[0] || null
        }))
      });
    }

    // Listagem normal de patrimônios (com filtro de ocultos)
    const patrimonios = await prisma.patrimonio.findMany({
      where: showHidden ? {} : { oculto: false },
      select: {
        id: true,
        nome: true,
        descricao: true,
        data_aquisicao: true,
        valor: true,
        status: true,
        fabricante: true,
        modelo: true,
        tipo: true,
        oculto: true,
        localizacao: true,
        responsavelId: true,
        numeroNotaFiscal: true,
        dataNotaFiscal: true,
        dataGarantia: true,
        placa: true,
        renavan: true,
        locado: true,
        franquia: true, // Adiciona franquia na listagem
        proprietario: true,
        numeroSerie: true,
        anoModelo: true,
        segurado: true,
        seguradora: true,
        dataVencimentoSeguro: true,
        createdAt: true,
        updatedAt: true,
        kmEntrega: true,
        responsavel: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            cargo: true,
            setor: true
          }
        },
        movimentacoes: {
          orderBy: { createdAt: "desc" }, // Alterado de data para createdAt
          take: 1,
          include: {
            autor: {
              select: {
                id: true,
                nome: true,
                sobrenome: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(patrimonios);
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Erro ao listar patrimônios:", errorMessage);
    return NextResponse.json(
      { error: "Erro ao listar patrimônios.", details: errorMessage }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[POST] - Criar um novo patrimônio (SEM movimentação)**
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validação condicional para o tipo "Veículo"
    if (body.tipo === "Veículo") {
      if (!body.placa || !body.renavan || !body.anoModelo) {
        return NextResponse.json(
          { error: "Campos Placa, Renavan e Ano/Modelo são obrigatórios para o tipo Veículo." },
          { status: 400 }
        );
      }
    } else {
      // Remove campos desnecessários para outros tipos
      delete body.placa;
      delete body.renavan;
      delete body.anoModelo;
    }

    const novoPatrimonio = await prisma.patrimonio.create({
      data: {
        nome: body.nome,
        descricao: body.descricao,
        data_aquisicao: body.data_aquisicao ? new Date(body.data_aquisicao) : null,
        valor: body.valor,
        status: body.status,
        fabricante: body.fabricante,
        modelo: body.modelo, // Adicionado o campo modelo aqui
        tipo: body.tipo,
        responsavelId: body.responsavelId,
        localizacao: body.localizacao,
        numeroNotaFiscal: body.numeroNotaFiscal,
        dataNotaFiscal: body.dataNotaFiscal ? new Date(body.dataNotaFiscal) : null,
        dataGarantia: body.dataGarantia ? new Date(body.dataGarantia) : null,
        placa: body.placa,
        renavan: body.renavan,
        locado: body.locado || false,
        franquia: body.locado ? body.franquia : null, // Adiciona franquia condicionalmente
        proprietario: body.proprietario,
        numeroSerie: body.numeroSerie,
        anoModelo: body.anoModelo,
        segurado: body.segurado || false,
        seguradora: body.seguradora,
        dataVencimentoSeguro: body.dataVencimentoSeguro ? new Date(body.dataVencimentoSeguro) : null,
        kmEntrega: body.tipo === "Veículo" ? body.kmEntrega : null,
      },
    });

    return NextResponse.json(novoPatrimonio, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar patrimônio:", error);
    return NextResponse.json({ error: "Erro ao criar patrimônio." }, { status: 500 });
  }
}

// 🚀 **[PATCH] - Atualizar um patrimônio existente (movimentação SOMENTE para localização e responsável)**
export async function PATCH(req: NextRequest) {
  try {
    const user = authenticateToken(req); // Autentica usuário e obtém info

    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID do patrimônio não fornecido." }, 
        { status: 400 }
      );
    }

    // Obtém o patrimônio atual com todas as informações necessárias
    const patrimonioAtual = await prisma.patrimonio.findUnique({
      where: { id: parseInt(body.id) },
      include: {
        responsavel: true,
        movimentacoes: {
          orderBy: { createdAt: "desc" }, // Alterado de data para createdAt
          take: 1
        }
      }
    });
    
    if (!patrimonioAtual) {
      return NextResponse.json(
        { error: "Patrimônio não encontrado." }, 
        { status: 404 }
      );
    }

    // Verifica a data de aquisição
    if (body.data_aquisicao && isNaN(new Date(body.data_aquisicao).getTime())) {
      return NextResponse.json(
        { error: "Data de aquisição inválida." }, 
        { status: 400 }
      );
    }

    // Prepara os dados para atualização
    const updateData = {
      nome: body.nome,
      descricao: body.descricao,
      data_aquisicao: body.data_aquisicao ? new Date(body.data_aquisicao) : null,
      valor: body.valor,
      status: body.status,
      fabricante: body.fabricante,
      modelo: body.modelo, // Certifique-se que está aqui
      localizacao: body.localizacao,
      tipo: body.tipo,
      responsavelId: body.responsavelId,
      numeroNotaFiscal: body.numeroNotaFiscal,
      dataNotaFiscal: body.dataNotaFiscal ? new Date(body.dataNotaFiscal) : null,
      dataGarantia: body.dataGarantia ? new Date(body.dataGarantia) : null,
      placa: body.placa,
      renavan: body.renavan,
      locado: body.locado,
      franquia: body.locado ? body.franquia : null, // Adiciona franquia condicionalmente
      proprietario: body.proprietario,
      numeroSerie: body.numeroSerie,
      anoModelo: body.anoModelo,
      segurado: body.segurado,
      seguradora: body.seguradora,
      dataVencimentoSeguro: body.dataVencimentoSeguro ? new Date(body.dataVencimentoSeguro) : null,
      oculto: body.oculto !== undefined ? body.oculto : patrimonioAtual.oculto,
      kmEntrega: body.tipo === "Veículo" ? body.kmEntrega : null
    };

    // Verifica se houve mudanças relevantes para registrar movimentação
    const mudouLocalizacao = body.localizacao !== undefined && patrimonioAtual.localizacao !== body.localizacao;
    const mudouResponsavel = body.responsavelId !== undefined && patrimonioAtual.responsavelId !== body.responsavelId;
    const mudouKm = body.tipo === "Veículo" && body.kmEntrega !== undefined && patrimonioAtual.kmEntrega !== body.kmEntrega;

    // Atualiza o patrimônio
    const updatedPatrimonio = await prisma.patrimonio.update({
      where: { id: parseInt(body.id) },
      data: updateData,
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
        oculto: true,
        locado: true,
        franquia: true, // Adiciona franquia no retorno
        responsavel: {
          select: {
            id: true,
            nome: true,
            sobrenome: true
          }
        },
        updatedAt: true
      }
    });

    // Cria registro de movimentação APENAS se houve mudança em localização, responsável ou KM
    if (mudouLocalizacao || mudouResponsavel || mudouKm) {
      try {
        const movimentacaoData = {
          tipo: mudouResponsavel 
            ? "ALTERACAO_RESPONSAVEL" 
            : mudouKm 
            ? "ALTERACAO_KM" 
            : "ALTERACAO_LOCALIZACAO",
          autorId: parseInt(user.id), // Convertendo para número
          patrimonioId: parseInt(body.id),
          responsavelAnteriorId: patrimonioAtual.responsavelId,
          localizacaoAnterior: patrimonioAtual.localizacao,
          responsavelNovoId: mudouResponsavel ? body.responsavelId : undefined,
          localizacaoNova: mudouLocalizacao ? body.localizacao : undefined,
          kmAnterior: mudouKm ? patrimonioAtual.kmEntrega : undefined,
          kmNovo: mudouKm ? body.kmEntrega : undefined
        };

        await prisma.movimentacao.create({
          data: movimentacaoData
        });
      } catch (error) {
        console.error("Erro ao criar movimentação:", error);
        // Não falhar a operação principal por causa da movimentação
      }
    }

    return NextResponse.json(updatedPatrimonio);
  } catch (error) {
    console.error("Erro ao atualizar patrimônio:", error);
    
    if (error instanceof Error && 'code' in error) {
      if ((error as any).code === 'P2025') {
        return NextResponse.json(
          { error: "Patrimônio não encontrado." }, 
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: "Erro ao atualizar patrimônio.", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 **[PUT] - Alternar status de oculto do patrimônio (SEM movimentação)**
export async function PUT(req: NextRequest) {
  try {
    authenticateToken(req); // Autentica usuário

    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID do patrimônio não fornecido." }, 
        { status: 400 }
      );
    }

    // Verifica se o patrimônio existe
    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id: parseInt(body.id) },
      include: { responsavel: true }
    });
    
    if (!patrimonio) {
      return NextResponse.json(
        { error: "Patrimônio não encontrado." }, 
        { status: 404 }
      );
    }

    // Alterna o status de oculto
    const updatedPatrimonio = await prisma.patrimonio.update({
      where: { id: parseInt(body.id) },
      data: { 
        oculto: !patrimonio.oculto
      },
      select: {
        id: true,
        nome: true,
        oculto: true,
        responsavel: {
          select: {
            id: true,
            nome: true,
            sobrenome: true
          }
        },
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Patrimônio ${updatedPatrimonio.oculto ? 'ocultado' : 'tornado visível'} com sucesso.`,
      patrimonio: updatedPatrimonio
    });
  } catch (error) {
    console.error("Erro ao alterar visibilidade do patrimônio:", error);
    
    return NextResponse.json(
      { 
        error: "Erro ao alterar visibilidade do patrimônio.", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}