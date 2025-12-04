'use client';

/**
 * Tax Form Editor Page
 *
 * Dedicated page for filling out assigned tax forms
 * Shows form editor with PDF preview and fillable fields
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TaxFormEditor } from '@/components/tax-forms/TaxFormEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface Assignment {
  id: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';
  formData?: Record<string, string | boolean>;
  taxForm: {
    id: string;
    formNumber: string;
    title: string;
  };
}

export default function TaxFormEditorPage({ params }: { params: { id: string } }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignment();
  }, [params.id]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      // Fetch all assignments and find the one we need
      const response = await fetch('/api/tax-forms/assigned');

      if (response.ok) {
        const data = await response.json();
        const found = data.assignments.find((a: Assignment) => a.id === params.id);

        if (found) {
          setAssignment(found);
        } else {
          toast({
            title: 'Not Found',
            description: 'Assignment not found',
            variant: 'destructive',
          });
          router.push('/dashboard/client/tax-forms');
        }
      } else {
        throw new Error('Failed to fetch assignment');
      }
    } catch (error) {
      logger.error('Error fetching assignment', { error });
      toast({
        title: 'Error',
        description: 'Failed to load assignment',
        variant: 'destructive',
      });
      router.push('/dashboard/client/tax-forms');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (formData: Record<string, string | boolean>) => {
    logger.info('Form data saved', { assignmentId: params.id });
  };

  const handleComplete = () => {
    toast({
      title: 'Form Completed',
      description: 'Your form has been submitted to your tax preparer',
    });

    // Navigate back to forms list
    setTimeout(() => {
      router.push('/dashboard/client/tax-forms');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/client/tax-forms')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Forms
      </Button>

      {/* Form Editor */}
      <TaxFormEditor
        assignmentId={assignment.id}
        formId={assignment.taxForm.id}
        formNumber={assignment.taxForm.formNumber}
        formTitle={assignment.taxForm.title}
        initialFormData={assignment.formData}
        status={assignment.status}
        isReadOnly={assignment.status === 'REVIEWED'}
        onSave={handleSave}
        onComplete={handleComplete}
      />
    </div>
  );
}
