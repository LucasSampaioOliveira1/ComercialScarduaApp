import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ 
        permissions: {
          home: { canAccess: true, canEdit: false, canDelete: false }
        },
        error: "User ID é obrigatório" 
      }, { status: 400 });
    }
    
    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ 
        permissions: {
          home: { canAccess: true, canEdit: false, canDelete: false }
        },
        error: "Usuário não encontrado" 
      }, { status: 404 });
    }
    
    // Buscar permissões
    const permissions = await prisma.permission.findMany({
      where: {
        userId: userId
      }
    });
    
    // No backend, garantir que as permissões incluem todas as páginas do sistema
    const formattedPermissions: Record<string, {canAccess: boolean, canEdit: boolean, canDelete: boolean, canCreate?: boolean}> = {
      home: { canAccess: true, canEdit: false, canDelete: false },
      patrimonio: { canAccess: false, canEdit: false, canDelete: false },
      empresas: { canAccess: false, canEdit: false, canDelete: false },
      colaboradores: { canAccess: false, canEdit: false, canDelete: false },
      usuarios: { canAccess: false, canEdit: false, canDelete: false },
      contacorrente: { canAccess: false, canEdit: false, canDelete: false, canCreate: false },
      contacorrentetodos: { canAccess: false, canEdit: false, canDelete: false, canCreate: false },
      caixaviagem: { canAccess: false, canEdit: false, canDelete: false, canCreate: false },
      caixaviagemtodos: { canAccess: false, canEdit: false, canDelete: false, canCreate: false }
    };
    
    // Garantir que as permissões do banco são mapeadas corretamente
    if (permissions.length > 0) {
      permissions.forEach(perm => {
        formattedPermissions[perm.page] = {
          canAccess: perm.canAccess,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canCreate: perm.canEdit // Usar canEdit como valor para canCreate por padrão
        };
      });
    }
    
    // Retornar as permissões formatadas
    return NextResponse.json({ permissions: formattedPermissions });
  } catch (error: any) {
    console.error("Erro ao obter permissões:", error);
    // Mesmo em caso de erro, retorne um objeto válido
    return NextResponse.json({ 
      permissions: {
        home: { canAccess: true, canEdit: false, canDelete: false },
        patrimonio: { canAccess: false, canEdit: false, canDelete: false },
        empresas: { canAccess: false, canEdit: false, canDelete: false },
        colaboradores: { canAccess: false, canEdit: false, canDelete: false },
        usuarios: { canAccess: false, canEdit: false, canDelete: false },
        contacorrente: { canAccess: false, canEdit: false, canDelete: false, canCreate: false },
        contacorrentetodos: { canAccess: false, canEdit: false, canDelete: false, canCreate: false },
        caixaviagem: { canAccess: false, canEdit: false, canDelete: false, canCreate: false },
        caixaviagemtodos: { canAccess: false, canEdit: false, canDelete: false, canCreate: false }
      },
      error: "Erro ao obter permissões" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, permissions } = body;
    
    if (!userId || !permissions) {
      return NextResponse.json({ error: "UserID e permissões são obrigatórios" }, { status: 400 });
    }

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
    
    if (permissionsData.length > 0) {
      await prisma.permission.createMany({
        data: permissionsData
      });
    }
    
    return NextResponse.json({ success: true, message: "Permissões atualizadas com sucesso" });
  } catch (error: any) {
    console.error("Erro ao salvar permissões:", error);
    return NextResponse.json({ error: "Erro ao salvar permissões" }, { status: 500 });
  }
}