/**
 * Debug endpoint to check session and role
 * GET /api/debug/session
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get role directly from database
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    // Also get raw query to bypass any enum issues
    const rawProfile = await prisma.$queryRaw`
      SELECT id, role::text as role, "firstName", "lastName"
      FROM profiles
      WHERE "userId" = ${session.user.id}
    ` as { id: string; role: string; firstName: string; lastName: string }[];

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        roleFromSession: session.user.role,
        roleType: typeof session.user.role,
      },
      profileFromPrisma: profile,
      profileFromRawQuery: rawProfile[0] || null,
      comparison: {
        sessionRole: session.user.role,
        prismaRole: profile?.role,
        rawRole: rawProfile[0]?.role,
        sessionMatchesPrisma: session.user.role === profile?.role,
        sessionMatchesRaw: session.user.role === rawProfile[0]?.role,
      },
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: String(error) },
      { status: 500 }
    );
  }
}
