import DocumentUpload from '@/components/DocumentUpload';
import SaveFormDataClient from '@/components/SaveFormDataClient';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function UploadDocumentsPage() {
  const session = await auth(); const userId = session?.user?.id;

  // Require authentication for document upload
  if (!userId) {
    redirect('/auth/signin?redirect_url=/upload-documents');
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <SaveFormDataClient />
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Upload Your Tax Documents</h1>
          <p className="text-xl text-muted-foreground">
            Use your phone camera or upload from computer
          </p>
        </div>

        <DocumentUpload />

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-3">Accepted documents:</h3>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li>✓ W-2 forms (employer wages)</li>
            <li>✓ 1099 forms (contractor income)</li>
            <li>✓ 1098 forms (mortgage interest)</li>
            <li>✓ Receipts for deductions</li>
            <li>✓ Student loan interest statements</li>
            <li>✓ Charitable donation receipts</li>
            <li>✓ Healthcare statements (1095-A, B, C)</li>
            <li>✓ Prior year tax returns</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
