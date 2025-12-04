'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  columns?: { key: string; label: string }[];
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ExportButton({
  data,
  filename = 'export',
  columns,
  className,
  variant = 'outline',
  size = 'default',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Generate CSV content from data
  const generateCSV = (): string => {
    if (data.length === 0) return '';

    // Determine columns to export
    const exportColumns =
      columns ||
      Object.keys(data[0]).map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      }));

    // CSV header
    const header = exportColumns.map((col) => `"${col.label}"`).join(',');

    // CSV rows
    const rows = data.map((row) => {
      return exportColumns
        .map((col) => {
          let value = row[col.key];

          // Handle different data types
          if (value === null || value === undefined) {
            value = '';
          } else if (value instanceof Date) {
            value = value.toLocaleDateString();
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value);
          }

          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  };

  // Download file
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Export as CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing
      const csv = generateCSV();
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(csv, `${filename}_${timestamp}.csv`, 'text/csv');
    } catch (error) {
      logger.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as JSON
  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing
      const json = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(json, `${filename}_${timestamp}.json`, 'application/json');
    } catch (error) {
      logger.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as Excel-compatible CSV (with UTF-8 BOM)
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing
      const csv = generateCSV();
      // Add UTF-8 BOM for Excel compatibility
      const bom = '\uFEFF';
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(bom + csv, `${filename}_${timestamp}.csv`, 'text/csv;charset=utf-8');
    } catch (error) {
      logger.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Download className="w-4 h-4 mr-2" />
        No Data to Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting} className={cn(className)}>
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export for Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to flatten nested objects for export
export function flattenObjectForExport(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      Object.assign(flattened, flattenObjectForExport(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}
