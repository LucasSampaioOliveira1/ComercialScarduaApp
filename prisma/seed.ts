import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker'; // Para gerar dados falsos automaticamente

const prisma = new PrismaClient();

// Função para criar um usuário admin
async function createAdminUser() {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('123456', saltRounds);

  // Verifica se o usuário admin já existe
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@exemplo.com' },
  });

  if (!adminExists) {
    // Cria o usuário admin se ele não existir
    await prisma.user.create({
      data: {
        nome: 'Admin',
        sobrenome: 'Admin',
        email: 'admin@exemplo.com',
        cpf: '12345678900',
        password: hashedPassword,
        role: 'ADMIN',
        foto: '/uploads/default-avatar.jpg', // Foto padrão para o admin
        oculto: false, // O admin nunca estará oculto
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('Usuário Admin criado com sucesso!');
  } else {
    console.log('Usuário Admin já existe.');
  }
}

// Função para criar um usuário genérico
async function createUser() {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('123456', saltRounds);

  // Gerar dados dinâmicos para o usuário
  const nome = faker.person.firstName();
  const sobrenome = faker.person.lastName();
  const email = faker.internet.email();
  const cpf = faker.string.numeric(11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const fotoUrl = '/uploads/default-avatar.jpg'; // Foto padrão para novos usuários
  const role = faker.helpers.arrayElement(['USER', 'ADMIN']); // Role aleatória entre 'USER' e 'ADMIN'
  const oculto = faker.datatype.boolean(); // Define aleatoriamente se o usuário estará oculto

  // Verifica se o usuário já existe
  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (!userExists) {
    await prisma.user.create({
      data: {
        nome,
        sobrenome,
        email,
        cpf,
        password: hashedPassword,
        role,
        foto: fotoUrl, // Foto padrão para usuários criados
        oculto, // Define se o usuário estará oculto ou não
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`Usuário ${nome} ${sobrenome} criado com sucesso! Oculto: ${oculto}`);
  } else {
    console.log(`Usuário ${nome} ${sobrenome} já existe.`);
  }
}

async function main() {
  // Criar o usuário Admin
  await createAdminUser();

  // Gerar 10 usuários dinâmicos
  const numberOfUsers = 10;
  for (let i = 0; i < numberOfUsers; i++) {
    await createUser();
  }

  console.log('Usuários criados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
