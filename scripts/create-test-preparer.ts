import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function generateQRCodeWithLogo(url: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
  return qrDataUrl;
}

async function main() {
  const email = 'taxgenius.tax@gmail.com';
  const trackingCode = 'ow';
  const name = 'Owliver Owl';
  const password = 'TestPreparer2024!';

  console.log('Creating test tax preparer:', email);
  console.log('Tracking code:', trackingCode);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existingUser) {
    console.log('User already exists!');
    console.log('User ID:', existingUser.id);
    console.log('Has profile:', !!existingUser.profile);
    if (existingUser.profile) {
      console.log('Current role:', existingUser.profile.role);
      console.log('Tracking code:', existingUser.profile.customTrackingCode);
    }
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user with profile
  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          role: 'tax_preparer',
          firstName: 'Owliver',
          lastName: 'Owl',
          customTrackingCode: trackingCode,
          trackingCode: trackingCode,
          trackingCodeFinalized: true,
          shortLinkUsername: trackingCode,
          usePhotoInQRCodes: true,
          avatarUrl: 'https://res.cloudinary.com/dmbzcxgzv/image/upload/v1734816689/tax-genius/avatars/owliver-owl_clzsbv.png',
          qrCodeLogoUrl: 'https://res.cloudinary.com/dmbzcxgzv/image/upload/v1734816689/tax-genius/avatars/owliver-owl_clzsbv.png',
          trackingCodeQRUrl: await generateQRCodeWithLogo(`https://taxgeniuspro.tax/go/${trackingCode}-intake`),
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log('✓ Created user:', user.id);
  console.log('✓ Created profile with role:', user.profile?.role);

  // Create marketing links
  const linkTypes = [
    {
      type: 'LEAD' as const,
      suffix: '-lead',
      targetPage: '/contact',
      title: 'Lead Capture Form',
    },
    {
      type: 'INTAKE' as const,
      suffix: '-intake',
      targetPage: '/start-filing/form',
      title: 'Tax Intake Form',
    },
    {
      type: 'APPOINTMENT' as const,
      suffix: '-appt',
      targetPage: '/book',
      title: 'Appointment Booking',
    },
  ];

  for (const config of linkTypes) {
    const code = `${trackingCode}${config.suffix}`;
    const url = `${config.targetPage}?ref=${trackingCode}`;
    const fullUrl = `https://taxgeniuspro.tax/go/${code}`;
    const qrCodeImageUrl = await generateQRCodeWithLogo(fullUrl);

    await prisma.marketingLink.create({
      data: {
        creatorId: user.profile!.id,
        creatorType: 'TAX_PREPARER',
        linkType: config.type,
        code,
        url,
        shortUrl: `/go/${code}`,
        title: config.title,
        targetPage: config.targetPage,
        qrCodeImageUrl,
        isActive: true,
      },
    });

    console.log(`✓ Created link: /go/${code} → ${url}`);
  }

  console.log('\n✅ Test preparer created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Tracking Code:', trackingCode);
  console.log('User ID:', user.id);
  console.log('Profile ID:', user.profile?.id);
  console.log('\nMarketing links:');
  console.log(`  - Lead: https://taxgeniuspro.tax/go/${trackingCode}-lead`);
  console.log(`  - Intake: https://taxgeniuspro.tax/go/${trackingCode}-intake`);
  console.log(`  - Appointment: https://taxgeniuspro.tax/go/${trackingCode}-appt`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
