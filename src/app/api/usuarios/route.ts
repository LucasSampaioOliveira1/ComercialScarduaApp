import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET_KEY = process.env.JWT_SECRET || "bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c";

// Função para validar token e permissões
const validateRequest = async (req: NextRequest, requireAdmin = false) => {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) {
    return { error: NextResponse.json(
      { success: false, message: "Token não fornecido." }, 
      { status: 401 }
    ) };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET_KEY) as { id: string, email?: string };
  } catch (error) {
    return { error: NextResponse.json(
      { success: false, message: "Token inválido ou expirado." }, 
      { status: 401 }
    ) };
  }

  if (requireAdmin) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: decoded.id },
          { email: decoded.email }
        ]
      },
      select: { role: true }
    });

    if (!user || user.role !== "ADMIN") {
      return { error: NextResponse.json(
        { success: false, message: "Acesso não autorizado." }, 
        { status: 403 }
      ) };
    }
  }

  return { userId: decoded.id };
};

// Adicione uma função para obter permissões
async function getUserPermissions(userId: string) {
  const permissions = await prisma.permission.findMany({
    where: {
      userId: userId
    }
  });
  
  return permissions;
}

// Adicione uma função para atualizar permissões
async function updateUserPermissions(userId: string, permissions: any) {
  // Excluir permissões existentes
  await prisma.permission.deleteMany({
    where: {
      userId: userId
    }
  });
  
  // Criar as novas permissões
  const pages = Object.keys(permissions);
  const permissionsData = pages.map(page => ({
    userId: userId,
    page: page,
    canAccess: permissions[page].canAccess || false,
    canEdit: permissions[page].canEdit || false,
    canDelete: permissions[page].canDelete || false
  }));
  
  // Inserir as novas permissões
  if (permissionsData.length > 0) {
    await prisma.permission.createMany({
      data: permissionsData
    });
  }
  
  return await getUserPermissions(userId);
}

// Rota GET para listar usuários
export async function GET(req: NextRequest) {
  try {
    const { error } = await validateRequest(req);
    if (error) return error;

    const searchParams = req.nextUrl.searchParams;
    const home = searchParams.get('home');
    const showHidden = searchParams.get('showHidden') === 'true';

    if (home) {
      const [totalUsuarios, ultimosUsuarios] = await Promise.all([
        prisma.user.count({
          where: showHidden ? {} : { oculto: false }
        }),
        prisma.user.findMany({
          where: showHidden ? {} : { oculto: false },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            role: true,
            foto: true,
            createdAt: true
          }
        })
      ]);

      return NextResponse.json({
        success: true,
        totalUsuarios,
        ultimosUsuarios
      });
    }

    const usuarios = await prisma.user.findMany({
      where: showHidden ? {} : { oculto: false },
      select: {
      id: true,
      nome: true,
      sobrenome: true,
      email: true,
      role: true,
      foto: true,
      oculto: true,
      createdAt: true,
      updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      usuarios
    });

  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Erro ao buscar usuários.",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }, 
      { status: 500 }
    );
  }
}

// Rota PATCH para atualizar usuários
export async function PATCH(req: NextRequest) {
  try {
    const { error, userId } = await validateRequest(req, true);
    if (error) return error;

    const { id, action, data } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID do usuário não fornecido." }, 
        { status: 400 }
      );
    }

    // Verifica se o usuário existe usando OR para múltiplos campos únicos
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { email: data?.email }
        ]
      }
    });

    if (!userExists) {
      return NextResponse.json(
        { success: false, message: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    let updatedUser;
    switch (action) {
      case 'toggleVisibility':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { oculto: !userExists.oculto },
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            role: true,
            oculto: true,
            foto: true
          }
        });
        break;

      case 'update':
        if (!data || Object.keys(data).length === 0) {
          return NextResponse.json(
            { success: false, message: "Dados de atualização inválidos." },
            { status: 400 }
          );
        }

        const { nome, sobrenome, email, role, newPassword } = data;
        
        // Dados para atualização
        const updateData: any = {
          nome,
          sobrenome, 
          email,
          role
        };
        
        // Se uma nova senha foi fornecida, hash e adicione aos dados de atualização
        if (newPassword) {
          const saltRounds = 10;
          updateData.password = await bcrypt.hash(newPassword, saltRounds);
        }
        
        // Atualiza o usuário com todos os dados, incluindo a senha se foi fornecida
        updatedUser = await prisma.user.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            role: true,
            oculto: true,
            foto: true
          }
        });
        break;

      case 'updatePermissions':
        const updatedPermissions = await updateUserPermissions(id, data.permissions);
      
        return NextResponse.json({
          success: true,
          message: "Permissões atualizadas com sucesso",
          permissions: updatedPermissions
        });

      default:
        return NextResponse.json(
          { success: false, message: "Ação inválida." },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: action === 'toggleVisibility' 
        ? `Usuário ${updatedUser.oculto ? 'ocultado' : 'tornado visível'} com sucesso.`
        : "Usuário atualizado com sucesso.",
      user: updatedUser
    });

  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    
    if (error instanceof Error && 'code' in error) {
      if ((error as any).code === 'P2002') {
        return NextResponse.json(
          { success: false, message: "Email já está em uso." },
          { status: 400 }
        );
      }
      if ((error as any).code === 'P2025') {
        return NextResponse.json(
          { success: false, message: "Usuário não encontrado." },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: "Erro ao atualizar usuário.",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }, 
      { status: 500 }
    );
  }
}

// Rota DELETE para remover usuários
export async function DELETE(req: NextRequest) {
  try {
    const { error } = await validateRequest(req, true);
    if (error) return error;

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID do usuário não fornecido." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Usuário removido com sucesso."
    });

  } catch (error) {
    console.error("Erro ao remover usuário:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Erro ao remover usuário.",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}