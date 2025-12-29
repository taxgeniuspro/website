import AppointmentBooking from '@/components/AppointmentBooking';
import { BookingPageClient } from '@/components/booking/BookingPageClient';
import { db, firstOrNull } from '@/lib/db';
import { Suspense } from 'react';

interface PageProps {
  searchParams: { ref?: string };
}

async function getPreparerByRef(ref: string | undefined) {
  if (!ref) return null;

  try {
    const { data: profiles, error } = await db
      .from('profiles')
      .select('*, users!inner(email)')
      .or(`tracking_code.eq.${ref},custom_tracking_code.eq.${ref}`);

    if (error) throw error;
    const profile = firstOrNull(profiles);

    if (!profile) return null;

    return {
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
      phone: profile.phone,
      email: profile.users?.email,
    };
  } catch (error) {
    console.error('Error fetching preparer:', error);
    return null;
  }
}

export default async function BookAppointmentPage({ searchParams }: PageProps) {
  const preparer = await getPreparerByRef(searchParams.ref);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BookingPageClient preparer={preparer} />
    </Suspense>
  );
}
