/**
 * Tax Preparer Calendar Dashboard
 * Displays appointments in calendar view with action capabilities
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import TaxPreparerCalendarClient from './calendar-client';

// TypeScript interface for profile data
interface CalendarProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  bookingEnabled: boolean | null;
  allowPhoneBookings: boolean | null;
  allowVideoBookings: boolean | null;
  allowInPersonBookings: boolean | null;
  requireApprovalForBookings: boolean | null;
  customBookingMessage: string | null;
  bookingCalendarColor: string | null;
}

export default async function TaxPreparerCalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profiles } = await db
    .from('profiles')
    .select(`
      id,
      firstName,
      lastName,
      role,
      bookingEnabled,
      allowPhoneBookings,
      allowVideoBookings,
      allowInPersonBookings,
      requireApprovalForBookings,
      customBookingMessage,
      bookingCalendarColor
    `)
    .eq('userId', session.user.id)
    .limit(1);

  const profile = firstOrNull(profiles) as CalendarProfile | null;

  if (!profile || profile.role !== 'tax_preparer') {
    redirect('/dashboard');
  }

  return <TaxPreparerCalendarClient profile={profile} />;
}
