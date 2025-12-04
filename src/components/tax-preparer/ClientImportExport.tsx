'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import Link from 'next/link';

export function ClientImportExport() {
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tax-preparer/clients/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Successfully imported ${result.imported} clients.\n` +
            `${result.skipped} skipped.` +
            (result.errors ? `\n\nErrors:\n${result.errors.join('\n')}` : '')
        );
        window.location.reload();
      } else {
        alert(`Error: ${result.error}${result.details ? '\n' + result.details : ''}`);
      }
    } catch (error) {
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link href="/api/tax-preparer/clients/export">
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </Link>
      <div>
        <input
          type="file"
          accept=".csv"
          id="import-file"
          className="hidden"
          onChange={handleImport}
          disabled={importing}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('import-file')?.click()}
          disabled={importing}
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </div>
    </div>
  );
}
