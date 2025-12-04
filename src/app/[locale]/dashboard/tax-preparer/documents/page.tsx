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
  const role = user?.role;
  return role === 'TAX_PREPARER' || role === 'ADMIN';
}

export default async function TaxPreparerDocumentsPage() {
  const userIsTaxPreparer = await isTaxPreparer();

  if (!userIsTaxPreparer) {
    redirect('/forbidden');
  }

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

        {/* File Manager with Client Selector */}
        <TaxPreparerFileCenter />
      </div>
    </div>
  );
}
