import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://taxgeniuspro_user:TaxGenius2024Secure@72.60.28.175:5435/taxgeniuspro_db?schema=public'
    }
  }
});

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'taxgenius.tax@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        profile: {
          select: {
            role: true,
            trackingCodeFinalized: true,
            customTrackingCode: true,
            avatarUrl: true,
            shortLinkUsername: true,
          }
        }
      }
    });

    console.log('User data:', JSON.stringify(user, null, 2));

    if (!user) {
      console.log('\nUser does not exist in database');
    } else if (!user.profile) {
      console.log('\nUser exists but has no profile');
    } else {
      console.log('\nUser exists with role:', user.profile.role);
      console.log('Tracking code finalized:', user.profile.trackingCodeFinalized);
      console.log('Custom tracking code:', user.profile.customTrackingCode);
      console.log('Short link username:', user.profile.shortLinkUsername);
      console.log('Avatar URL:', user.profile.avatarUrl);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
