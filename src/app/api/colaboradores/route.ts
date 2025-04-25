import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET - Listar colaboradores
export async function GET(req: NextRequest) {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: {
        oculto: false,
      },
      include: {
        patrimonios: {
          select: {
            id: true,
            nome: true,
            status: true,
            tipo: true,
            localizacao: true,
            fabricante: true,
            numeroSerie: true,
            placa: true,
            valor: true,
            numeroNotaFiscal: true,
            dataNotaFiscal: true,
            dataGarantia: true,
            oculto: true
          },
          where: {
            oculto: false 
          }
        },
        empresa: {
          select: {
            id: true,
            nomeEmpresa: true,
            numero: true
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });

    return NextResponse.json(colaboradores);
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colaboradores" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Criar colaborador
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verificar se o CPF já existe
    if (body.cpf) {
      const cpfExistente = await prisma.colaborador.findUnique({
        where: { cpf: body.cpf },
      });

      if (cpfExistente) {
        return NextResponse.json(
          { error: "Já existe um colaborador com este CPF." },
          { status: 400 }
        );
      }
    }

    // Se a empresaId foi fornecida, buscar o número da empresa
    let numeroEmpresa = body.numeroEmpresa;
    if (body.empresaId && !numeroEmpresa) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: body.empresaId },
        select: { numero: true }
      });
      
      if (empresa) {
        numeroEmpresa = empresa.numero;
      }
    }

    // Criação do colaborador (campos removidos)
    const novoColaborador = await prisma.colaborador.create({
      data: {
        nome: body.nome || null,
        sobrenome: body.sobrenome || null,
        idade: body.idade || null,
        dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null,
        numeroCelular: body.numeroCelular || null,
        numeroEmergencia: body.numeroEmergencia || null,
        email: body.email || null,
        estadoCivil: body.estadoCivil || null,
        conjuge: body.conjuge || null,
        filiacao: body.filiacao || null,
        setor: body.setor || null,
        cargo: body.cargo || null,
        cpf: body.cpf || null,
        identidade: body.identidade || null,
        pis: body.pis || null,
        ctps: body.ctps || null,
        cnhNumero: body.cnhNumero || null,
        cnhVencimento: body.cnhVencimento ? new Date(body.cnhVencimento) : null,
        endereco: body.endereco || null,
        bairro: body.bairro || null,
        cidade: body.cidade || null,
        cep: body.cep || null,
        uf: body.uf || null,
        banco: body.banco || null,
        bancoNumero: body.bancoNumero || null,
        contaNumero: body.contaNumero || null,
        agenciaNumero: body.agenciaNumero || null,
        tipoVale: body.tipoVale || null,
        vt1Valor: body.vt1Valor || null,
        // Campos removidos: empresaAcess, empresaRegistro, empresaTrabalho
        tipo: body.tipo || null,
        comissao: body.comissao || null,
        admissao: body.admissao ? new Date(body.admissao) : null,
        demissao: body.demissao ? new Date(body.demissao) : null,
        numeroEmpresa: numeroEmpresa || null,
        empresaId: body.empresaId || null,
      },
      include: {
        empresa: true
      }
    });

    return NextResponse.json(novoColaborador, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao criar colaborador." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Atualizar colaborador (similar ao POST, removendo os mesmos campos)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Dados recebidos para atualização:", body);

    // Garantir que o ID seja numérico
    if (!body.id || isNaN(Number(body.id))) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se o colaborador existe
    const colaboradorExistente = await prisma.colaborador.findUnique({
      where: { id: Number(body.id) }
    });

    if (!colaboradorExistente) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    // Processar datas corretamente
    const dataFields = {
      dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
      admissao: body.admissao ? new Date(body.admissao) : undefined,
      demissao: body.demissao ? new Date(body.demissao) : undefined,
      cnhVencimento: body.cnhVencimento ? new Date(body.cnhVencimento) : undefined
    };

    // Criar objeto de atualização apenas com os campos presentes no body
    const updateData: Record<string, any> = {
      nome: body.nome,
      sobrenome: body.sobrenome, 
      cpf: body.cpf,
      identidade: body.identidade,
      email: body.email,
      numeroCelular: body.numeroCelular,
      numeroEmergencia: body.numeroEmergencia,
      estadoCivil: body.estadoCivil,
      conjuge: body.conjuge,
      filiacao: body.filiacao,
      setor: body.setor,
      cargo: body.cargo,
      pis: body.pis,
      ctps: body.ctps,
      cnhNumero: body.cnhNumero,
      endereco: body.endereco,
      bairro: body.bairro,
      cidade: body.cidade,
      cep: body.cep,
      uf: body.uf,
      banco: body.banco,
      bancoNumero: body.bancoNumero,
      contaNumero: body.contaNumero,
      agenciaNumero: body.agenciaNumero,
      tipoVale: body.tipoVale,
      vt1Valor: body.vt1Valor ? parseFloat(body.vt1Valor) : undefined,
      empresaAcess: body.empresaAcess,
      empresaRegistro: body.empresaRegistro,
      empresaTrabalho: body.empresaTrabalho,
      tipo: body.tipo,
      comissao: body.comissao ? parseFloat(body.comissao) : undefined,
      numeroEmpresa: body.numeroEmpresa,
      empresaId: body.empresaId ? parseInt(body.empresaId) : undefined,
      idade: body.idade ? parseInt(body.idade) : undefined,
      ...dataFields
    };

    // Remover campos undefined para não sobrescrever com null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log("Dados para update:", updateData);

    // Atualizar colaborador
    const colaboradorAtualizado = await prisma.colaborador.update({
      where: { id: Number(body.id) },
      data: updateData,
      include: {
        empresa: true,
        patrimonios: {
          where: { oculto: false }
        }
      }
    });

    return NextResponse.json(colaboradorAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar colaborador." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Ocultar colaborador
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const colaboradorOcultado = await prisma.colaborador.update({
      where: { id: body.id },
      data: { oculto: true },
    });

    return NextResponse.json(colaboradorOcultado);
  } catch (error) {
    console.error("Erro ao ocultar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao ocultar colaborador." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}