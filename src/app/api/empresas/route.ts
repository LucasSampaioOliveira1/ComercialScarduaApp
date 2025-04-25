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

// GET - Listar todas as empresas (com filtro para não mostrar ocultas por padrão)
export async function GET(request: NextRequest) {
  try {
    const userData = await authenticateToken(request);
    
    // Verificar parâmetros de URL
    const { searchParams } = new URL(request.url);
    const mostrarOcultos = searchParams.get('mostrarOcultos') === 'true';
    const searchTerm = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Construir query
    const where: any = {};
    
    // Filtrar itens ocultos se não for solicitado mostrá-los
    if (!mostrarOcultos) {
      where.oculto = false;
    }
    
    // Adicionar busca por termo (em vários campos)
    if (searchTerm) {
      where.OR = [
        { nomeEmpresa: { contains: searchTerm, mode: 'insensitive' } },
        { cnpj: { contains: searchTerm, mode: 'insensitive' } },
        { cidade: { contains: searchTerm, mode: 'insensitive' } },
        { numero: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }
    
    // Buscar empresas com paginação
    const [empresas, total] = await Promise.all([
      prisma.empresa.findMany({
        where,
        orderBy: { nomeEmpresa: 'asc' },
        skip,
        take: limit,
        include: {
          colaboradores: {
            select: {
              id: true,
              nome: true,
              sobrenome: true
            },
            where: { oculto: false }
          },
          criadoPor: {
            select: {
              id: true,
              nome: true, 
              email: true
            }
          }
        }
      }),
      prisma.empresa.count({ where })
    ]);
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      empresas,
      pagination: {
        total,
        pages: totalPages,
        page,
        limit
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar empresas:", error);
    
    if (error.message === "Acesso restrito a administradores.") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message || "Erro ao buscar empresas" }, { status: 500 });
  }
}

// POST - Criar nova empresa
export async function POST(request: NextRequest) {
  try {
    // Verificar se é admin (passando true como segundo parâmetro)
    const userData = await authenticateToken(request, true);
    
    const data = await request.json();
    
    // Validações básicas
    if (!data.nomeEmpresa || data.nomeEmpresa.trim() === '') {
      return NextResponse.json({ error: "Nome da empresa é obrigatório" }, { status: 400 });
    }
    
    // Verificar se CNPJ já existe (se fornecido)
    if (data.cnpj && data.cnpj.trim() !== '') {
      const cnpjExists = await prisma.empresa.findUnique({
        where: { cnpj: data.cnpj }
      });
      
      if (cnpjExists) {
        return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 400 });
      }
    }
    
    // Criar empresa
    const novaEmpresa = await prisma.empresa.create({
      data: {
        nomeEmpresa: data.nomeEmpresa,
        numero: data.numero || null,
        cnpj: data.cnpj || null,
        cidade: data.cidade || null,
        oculto: false,
        criadoPorId: userData.id // adiciona o ID do usuário que criou
      }
    });
    
    return NextResponse.json({ 
      message: "Empresa criada com sucesso", 
      empresa: novaEmpresa 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar empresa:", error);
    
    if (error.message === "Acesso restrito a administradores.") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message || "Erro ao criar empresa" }, { status: 500 });
  }
}

// PUT - Atualizar empresa
export async function PUT(request: NextRequest) {
  try {
    // Verificar se é admin
    const userData = await authenticateToken(request, true);
    
    const data = await request.json();
    
    // Validações básicas
    if (!data.id) {
      return NextResponse.json({ error: "ID da empresa é obrigatório" }, { status: 400 });
    }
    
    if (!data.nomeEmpresa || data.nomeEmpresa.trim() === '') {
      return NextResponse.json({ error: "Nome da empresa é obrigatório" }, { status: 400 });
    }
    
    // Verificar se CNPJ já existe em outra empresa (se fornecido)
    if (data.cnpj && data.cnpj.trim() !== '') {
      const cnpjExists = await prisma.empresa.findFirst({
        where: { 
          cnpj: data.cnpj,
          id: { not: data.id } // Excluir a própria empresa
        }
      });
      
      if (cnpjExists) {
        return NextResponse.json({ error: "CNPJ já cadastrado em outra empresa" }, { status: 400 });
      }
    }
    
    // Atualizar empresa
    const empresaAtualizada = await prisma.empresa.update({
      where: { id: data.id },
      data: {
        nomeEmpresa: data.nomeEmpresa,
        numero: data.numero || null,
        cnpj: data.cnpj || null,
        cidade: data.cidade || null,
      }
    });
    
    return NextResponse.json({ 
      message: "Empresa atualizada com sucesso", 
      empresa: empresaAtualizada 
    });
  } catch (error: any) {
    console.error("Erro ao atualizar empresa:", error);
    
    if (error.message === "Acesso restrito a administradores.") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message || "Erro ao atualizar empresa" }, { status: 500 });
  }
}

// DELETE - Ocultar empresa (ao invés de excluir permanentemente)
export async function DELETE(request: NextRequest) {
  try {
    // Verificar se é admin
    const userData = await authenticateToken(request, true);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "ID da empresa é obrigatório" }, { status: 400 });
    }
    
    // Verificar se a empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }
    
    // "Excluir" (ocultar) empresa
    await prisma.empresa.update({
      where: { id: parseInt(id) },
      data: { oculto: true }
    });
    
    return NextResponse.json({ message: "Empresa excluída com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir empresa:", error);
    
    if (error.message === "Acesso restrito a administradores.") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message || "Erro ao excluir empresa" }, { status: 500 });
  }
}