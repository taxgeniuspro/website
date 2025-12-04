/**
 * Set Tax Preparer Password
 * Sets a password for Ray Hamilton (Oliver)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setPreparerPassword() {
  try {
    const email = 'taxgenius.tax@gmail.com';
    const newPassword = 'TaxGenius2024!';

    console.log('\n🔐 Setting password for tax preparer...\n');

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: {
            role: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    console.log('Found user:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.profile?.role}`);
    console.log();

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { email },
      data: { hashedPassword: hashedPassword }
    });

    console.log('✅ Password updated successfully!\n');
    console.log('📋 Login Credentials:\n');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}`);
    console.log(`  URL: https://taxgeniuspro.tax/login`);
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPreparerPassword();
