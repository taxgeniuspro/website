const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'whitegelisa@gmail.com' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      isTaxPreparer: true,
    }
  });

  console.log('User:', JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
