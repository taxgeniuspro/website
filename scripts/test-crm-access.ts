import { prisma } from '../src/lib/prisma';

interface CRMAccessContext {
  userId: string;
  userRole: string;
  preparerId?: string;
}

async function testCRMFlow() {
  const contactId = 'cmj5xl56z000vl804zwccjysn';

  // Get Gelisa's user with profile (role is on profile)
  const user = await prisma.user.findFirst({
    where: { email: 'whitegelisa@gmail.com' },
    include: { profile: true }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User ID:', user.id);
  // Role is on the Profile, not the User
  console.log('User Profile Role:', user.profile?.role);

  // Simulate the auth check - role comes from profile
  const role = user.profile?.role || 'client';

  // Get preparer ID (from API route)
  let preparerId: string | undefined;
  if (role === 'tax_preparer') {
    preparerId = user.profile?.id;
  }

  // Build access context (from API route)
  const accessContext: CRMAccessContext = {
    userId: user.id,
    userRole: role,
    preparerId,
  };

  console.log('Access Context:', accessContext);

  // Now simulate CRM Service logic
  const contact = await prisma.cRMContact.findUnique({
    where: { id: contactId },
    include: {
      user: { select: { id: true, email: true } },
      interactions: {
        orderBy: { occurredAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, email: true } } },
      },
      stageHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
      _count: { select: { interactions: true } },
    },
  });

  if (!contact) {
    console.log('Contact not found');
    return;
  }

  console.log('Contact found:', contact.firstName, contact.lastName);
  console.log('Contact assignedPreparerId:', contact.assignedPreparerId);

  // Row-level security check - use string comparison
  const normalizedRole = String(accessContext.userRole).toLowerCase();
  if (normalizedRole === 'tax_preparer') {
    console.log('Checking tax_preparer access...');
    console.log('accessContext.userId:', accessContext.userId);
    console.log('contact.assignedPreparerId:', contact.assignedPreparerId);
    console.log('Match:', contact.assignedPreparerId === accessContext.userId);

    if (contact.assignedPreparerId !== accessContext.userId) {
      console.log('ACCESS DENIED');
    } else {
      console.log('ACCESS GRANTED');
    }
  }

  await prisma.$disconnect();
}

testCRMFlow();
