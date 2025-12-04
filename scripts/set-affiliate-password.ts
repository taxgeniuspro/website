import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 SETTING PASSWORD FOR AFFILIATE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const email = 'test-affiliate@example.com';
  const password = 'TestAffiliate123!';

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update user with hashed password
  const user = await prisma.user.update({
    where: { email },
    data: {
      hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log('✅ Password set successfully!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('URL: https://taxgeniuspro.tax/auth/signin');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');
  console.log('📊 After logging in, go to:');
  console.log('https://taxgeniuspro.tax/dashboard/affiliate/leads');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
  });
