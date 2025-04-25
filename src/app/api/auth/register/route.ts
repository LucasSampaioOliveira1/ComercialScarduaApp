import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cpf } from "cpf-cnpj-validator";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Pega o corpo da requisição como FormData
    const formData = await req.formData();
    console.log("🔍 Dados recebidos:", formData);

    // Extrai os campos do FormData
    const nome = formData.get("nome") as string;
    const sobrenome = formData.get("sobrenome") as string;
    const cpfField = formData.get("cpf") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const fotoFile = formData.get("foto") as File | null;

    // Validação dos campos obrigatórios
    if (!nome || !sobrenome || !cpfField || !email || !password || !role) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
    }

    // Valida o CPF
    if (!cpf.isValid(cpfField)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    // Verifica se o usuário já existe no banco de dados
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email já cadastrado!" }, { status: 400 });
    }

    // Criptografa a senha com bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    // Se não for fornecida uma foto, define uma foto padrão
    let userFoto = "/default-avatar.png"; // Foto padrão na pasta public
    if (fotoFile) {
      // Aqui você pode adicionar lógica para salvar a foto no servidor, por exemplo, em uma pasta específica
      // E obter a URL correta para salvar no banco de dados.
      // Para simplificação, assumimos que a foto já está salva em um diretório de uploads
      userFoto = "/uploads/" + fotoFile.name; // Exemplo de como definir a URL da foto
    }

    // Criação do usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        nome,
        sobrenome,
        cpf: cpfField,
        email,
        password: hashedPassword,
        role: role.toUpperCase() as "USER" | "ADMIN",
        foto: userFoto,
      },
    });

    console.log("✅ Usuário cadastrado:", user);

    // Retorna uma resposta de sucesso
    return NextResponse.json({ message: "Usuário cadastrado com sucesso!" }, { status: 201 });
  } catch (error: unknown) {
    console.error("❌ Erro ao cadastrar usuário:", error);

    // Verifique se o erro é uma instância de Error
    if (error instanceof Error) {
      return NextResponse.json({ error: `Erro ao cadastrar usuário: ${error.message}` }, { status: 500 });
    } else {
      return NextResponse.json({ error: "Erro desconhecido ao cadastrar usuário." }, { status: 500 });
    }
  }
}
