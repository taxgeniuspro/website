/**
 * Session API Route
 *
 * GET /api/auth/session
 * Returns current user session in NextAuth-compatible format
 *
 * This endpoint is called by the client-side useSession hook
 * to get the current user's profile including their role.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      // Return empty object for unauthenticated state (not an error)
      return NextResponse.json({}, { status: 200 });
    }

    // Return session in NextAuth-compatible format
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: session.user.role,
        isActive: session.user.isActive ?? true,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }, { status: 200 });
  } catch (error) {
    console.error('[Auth /session] Error:', error);
    // Return empty object on error (not an error response)
    return NextResponse.json({}, { status: 200 });
  }
}
