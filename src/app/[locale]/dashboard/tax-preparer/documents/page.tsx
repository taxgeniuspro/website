import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { TaxPreparerFileCenter } from '@/components/documents/TaxPreparerFileCenter';

export const metadata = {
  title: 'Documents | Tax Genius Pro',
  description: 'Manage client documents',
};

async function isTaxPreparer() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = (user?.role as string)?.toLowerCase();
  return role === 'tax_preparer' || role === 'admin' || role === 'super_admin';
}

interface PageProps {
  searchParams: Promise<{ folderId?: string }>;
}

export default async function TaxPreparerDocumentsPage({ searchParams }: PageProps) {
  const userIsTaxPreparer = await isTaxPreparer();

  if (!userIsTaxPreparer) {
    redirect('/forbidden');
  }

  // Await searchParams (Next.js 15+ requirement)
  const params = await searchParams;
  const folderId = params.folderId;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Client File Center</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage documents for all your clients with visual folder navigation
          </p>
        </div>

        {/* File Manager with Client Selector - pass folderId for deep linking */}
        <TaxPreparerFileCenter initialFolderId={folderId} />
      </div>
    </div>
  );
}
