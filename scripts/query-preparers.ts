import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get all tax preparers
  const preparers = await prisma.profile.findMany({
    where: {
      role: UserRole.TAX_PREPARER
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      customTrackingCode: true,
      shortLinkUsername: true,
      user: {
        select: {
          email: true
        }
      }
    },
    orderBy: { firstName: 'asc' }
  });

  console.log('\n=== TAX PREPARERS (35 Total) ===\n');
  console.log('| Name | Code | Email | Short Links |');
  console.log('|------|------|-------|-------------|');

  for (const p of preparers) {
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'N/A';
    const code = p.customTrackingCode || p.shortLinkUsername || 'N/A';
    const email = p.user?.email || 'N/A';
    let links = 'N/A';
    if (code !== 'N/A') {
      links = 'taxgeniuspro.tax/go/' + code + '-lead, -intake, -appt';
    }
    console.log('| ' + name + ' | ' + code + ' | ' + email + ' | ' + links + ' |');
  }

  // Get recent leads with referral info
  const leads = await prisma.lead.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      source: true,
      referrerUsername: true,
      referrerType: true,
      createdAt: true,
    }
  });

  console.log('\n\n=== RECENT LEADS/REFERRALS (Last 20) ===\n');
  console.log('| Name | Email | Source | Referrer | Type | Date |');
  console.log('|------|-------|--------|----------|------|------|');

  for (const l of leads) {
    const firstName = l.firstName || '';
    const lastName = l.lastName || '';
    const name = (firstName + ' ' + lastName).trim() || 'N/A';
    const date = l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A';
    const email = l.email || 'N/A';
    const source = l.source || 'N/A';
    const referrer = l.referrerUsername || 'N/A';
    const refType = l.referrerType || 'N/A';
    console.log('| ' + name + ' | ' + email + ' | ' + source + ' | ' + referrer + ' | ' + refType + ' | ' + date + ' |');
  }

  // Count by referrer
  const refCounts = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    _count: true,
    where: {
      referrerUsername: { not: null }
    },
    orderBy: {
      _count: {
        referrerUsername: 'desc'
      }
    },
    take: 15
  });

  console.log('\n\n=== TOP REFERRERS ===\n');
  console.log('| Referrer | Lead Count |');
  console.log('|----------|------------|');

  for (const r of refCounts) {
    console.log('| ' + (r.referrerUsername || 'N/A') + ' | ' + r._count + ' |');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
