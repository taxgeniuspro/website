/**
 * Tax Preparer Calendar Dashboard
 * Displays appointments in calendar view with action capabilities
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TaxPreparerCalendarClient from './calendar-client';

export default async function TaxPreparerCalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Get user profile
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      bookingEnabled: true,
      allowPhoneBookings: true,
      allowVideoBookings: true,
      allowInPersonBookings: true,
      requireApprovalForBookings: true,
      customBookingMessage: true,
      bookingCalendarColor: true,
    },
  });

  if (!profile || profile.role !== 'tax_preparer') {
    redirect('/dashboard');
  }

  return <TaxPreparerCalendarClient profile={profile} />;
}
