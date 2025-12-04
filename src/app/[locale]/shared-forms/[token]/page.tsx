'use client';

import { useState } from 'react';
import { use } from 'react';
import { TaxFormEditor } from '@/components/tax-forms/TaxFormEditor';
import { ESignatureModal } from '@/components/tax-forms/ESignatureModal';
import { FormHistoryModal } from '@/components/tax-forms/FormHistoryModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SharedFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [showSignModal, setShowSignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSignSuccess = () => {
    // Refresh the form editor to show new signature
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Form Editor */}
        <TaxFormEditor
          key={refreshKey}
          token={resolvedParams.token}
          onSign={() => setShowSignModal(true)}
          onViewHistory={() => setShowHistoryModal(true)}
        />

        {/* E-Signature Modal */}
        <ESignatureModal
          open={showSignModal}
          onClose={() => setShowSignModal(false)}
          token={resolvedParams.token}
          onSuccess={handleSignSuccess}
        />

        {/* Form History Modal */}
        <FormHistoryModal
          open={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          token={resolvedParams.token}
          canRevert={false}
        />
      </div>
    </div>
  );
}
