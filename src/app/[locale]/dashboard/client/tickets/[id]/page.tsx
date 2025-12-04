import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { TicketDetail } from '@/components/support/ticket-detail';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Ticket Details | Tax Genius Pro',
  description: 'View and manage your support ticket',
};

async function getUserProfile() {
  const session = await auth(); const user = session?.user;
  if (!user) return null;

  const role = user?.role;
  if (role !== 'client' && role !== 'admin') {
    return null;
  }

  return {
    userId: user.id,
    role: role as string,
  };
}

export default async function ClientTicketDetailPage({ params }: { params: { id: string } }) {
  const userProfile = await getUserProfile();

  if (!userProfile) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/dashboard/client/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </Link>
        </div>

        {/* Ticket Detail Component */}
        <TicketDetail
          ticketId={params.id}
          userRole="client"
          showInternalNotes={false}
          showStatusControls={false}
          showPriorityControls={false}
        />
      </div>
    </div>
  );
}
