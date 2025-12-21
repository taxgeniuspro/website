import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPreparerApps() {
  console.log('=== PREPARER APPLICATIONS FOR celycrypto@gmail.com ===\n');

  const apps = await prisma.preparerApplication.findMany({
    where: {
      email: 'celycrypto@gmail.com'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (apps.length === 0) {
    console.log('No applications found');
  } else {
    apps.forEach(app => {
      console.log(`ID: ${app.id}`);
      console.log(`Name: ${app.firstName} ${app.lastName}`);
      console.log(`Status: ${app.status}`);
      console.log(`Created: ${app.createdAt}`);
      console.log(`Languages: ${app.languages}`);
      console.log(`Experience: ${app.experienceLevel}`);
      console.log('---');
    });
  }

  // Check CRM contacts
  console.log('\n=== CRM CONTACT ===\n');
  const contact = await prisma.cRMContact.findFirst({
    where: { email: 'celycrypto@gmail.com' }
  });

  if (contact) {
    console.log(`ID: ${contact.id}`);
    console.log(`Type: ${contact.contactType}`);
    console.log(`Stage: ${contact.stage}`);
    console.log(`Source: ${contact.source}`);
  } else {
    console.log('No CRM contact found');
  }

  await prisma.$disconnect();
}

checkPreparerApps().catch(console.error);
