import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get all marketing links
  const links = await prisma.marketingLink.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' }
  });

  console.log('=== ALL MARKETING LINKS ===');
  links.forEach(link => {
    console.log('https://taxgeniuspro.tax/go/' + link.code + ' → ' + link.url);
  });

  // Get Gelisa's links specifically
  const gelisaLinks = links.filter(l => l.code.startsWith('gw'));
  if (gelisaLinks.length > 0) {
    console.log('');
    console.log('=== GELISA WHITE LINKS ===');
    gelisaLinks.forEach(link => {
      console.log('https://taxgeniuspro.tax/go/' + link.code);
      console.log('  → ' + link.url);
      console.log('  Type: ' + link.linkType);
      console.log('');
    });
  }

  // Get Gelisa's profile
  const gelisa = await prisma.profile.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Gelisa', mode: 'insensitive' } },
        { customTrackingCode: 'gw' }
      ]
    },
    include: { user: true }
  });

  if (gelisa) {
    console.log('=== GELISA WHITE PROFILE ===');
    console.log('Name: ' + gelisa.firstName + ' ' + gelisa.lastName);
    console.log('Email: ' + gelisa.user?.email);
    console.log('Tracking Code: ' + gelisa.customTrackingCode);
    console.log('Profile ID: ' + gelisa.id);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
