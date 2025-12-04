import AppointmentBooking from '@/components/AppointmentBooking';
import { BookingPageClient } from '@/components/booking/BookingPageClient';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

interface PageProps {
  searchParams: { ref?: string };
}

async function getPreparerByRef(ref: string | undefined) {
  if (!ref) return null;

  try {
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: ref },
          { customTrackingCode: ref },
        ],
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!profile) return null;

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      email: profile.user?.email,
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
