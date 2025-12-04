'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function SaveFormDataClient() {
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saveFormData = async () => {
      // Check if there's form data in localStorage
      const savedData = localStorage.getItem('taxFormData');

      if (!savedData) {
        return; // No form data to save
      }

      try {
        setIsSaving(true);
        const formData = JSON.parse(savedData);

        // Save to database via API
        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to save form data');
        }

        // Clear localStorage after successful save
        localStorage.removeItem('taxFormData');

        logger.info('Tax form data saved successfully');
      } catch (error) {
        logger.error('Error saving tax form data:', error);
        // Keep data in localStorage if save failed
      } finally {
        setIsSaving(false);
      }
    };

    saveFormData();
  }, []);

  // Don't render anything visible
  return null;
}
