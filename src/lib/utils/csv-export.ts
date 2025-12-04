/**
 * CSV Export Utility
 *
 * Provides CSV generation and download functionality for analytics data
 * Supports custom column formatters and automatic date-based filenames
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.5
 */

export interface ExportColumn<T = unknown> {
  key: string;
  label: string;
  formatter?: (value: T) => string;
}

export interface MaterialPerformance {
  id: string;
  title: string;
  type: string;
  location?: string;
  clicks: number;
  intakeStarts: number;
  intakeCompletes: number;
  returnsFiled: number;
  conversionRate: number;
  intakeConversionRate?: number;
  completeConversionRate?: number;
  filedConversionRate?: number;
  lastActivity: Date | string;
  createdAt: Date | string;
}

/**
 * Generate CSV string from data array
 */
export function generateCSV<T = Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[]
): string {
  if (!data || data.length === 0) {
    return columns.map((col) => escapeCSV(col.label)).join(',') + '\n';
  }

  // Generate header row
  const header = columns.map((col) => escapeCSV(col.label)).join(',');

  // Generate data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value = row[col.key];

        // Apply custom formatter if provided
        if (col.formatter) {
          value = col.formatter(value);
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        return escapeCSV(String(value));
      })
      .join(',');
  });

  return header + '\n' + rows.join('\n');
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return '';

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Trigger browser download of CSV content
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export materials performance data to CSV
 */
export function exportMaterials(materials: MaterialPerformance[]): void {
  const columns: ExportColumn[] = [
    { key: 'title', label: 'Material Name' },
    { key: 'type', label: 'Type', formatter: (val) => formatType(val) },
    { key: 'location', label: 'Location' },
    { key: 'clicks', label: 'Total Clicks' },
    { key: 'intakeStarts', label: 'Intake Started' },
    { key: 'intakeCompletes', label: 'Intake Completed' },
    { key: 'returnsFiled', label: 'Returns Filed' },
    {
      key: 'conversionRate',
      label: 'Overall Conversion Rate',
      formatter: (val) => `${(val || 0).toFixed(2)}%`,
    },
    {
      key: 'intakeConversionRate',
      label: 'Click to Intake Rate',
      formatter: (val) => (val ? `${val.toFixed(2)}%` : 'N/A'),
    },
    {
      key: 'completeConversionRate',
      label: 'Intake to Complete Rate',
      formatter: (val) => (val ? `${val.toFixed(2)}%` : 'N/A'),
    },
    {
      key: 'filedConversionRate',
      label: 'Complete to Filed Rate',
      formatter: (val) => (val ? `${val.toFixed(2)}%` : 'N/A'),
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      formatter: (date) => (date ? new Date(date).toLocaleDateString() : 'Never'),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formatter: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  const csv = generateCSV(materials, columns);
  const filename = `materials-export-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export funnel data to CSV
 */
export interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate?: number;
  conversionRate?: number;
}

export function exportFunnel(funnelData: FunnelData[], dateRange: string = 'all'): void {
  const columns: ExportColumn[] = [
    { key: 'stage', label: 'Funnel Stage' },
    { key: 'count', label: 'Count' },
    { key: 'percentage', label: 'Percentage of Initial', formatter: (val) => `${val.toFixed(1)}%` },
    {
      key: 'dropOffRate',
      label: 'Drop-off Rate',
      formatter: (val) => (val ? `${val.toFixed(1)}%` : 'N/A'),
    },
    {
      key: 'conversionRate',
      label: 'Stage Conversion Rate',
      formatter: (val) => (val ? `${val.toFixed(1)}%` : 'N/A'),
    },
  ];

  const csv = generateCSV(funnelData, columns);
  const filename = `funnel-analysis-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export source breakdown data to CSV
 */
export interface SourceData {
  name: string;
  type: 'type' | 'campaign' | 'location';
  count: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export function exportSourceBreakdown(
  sourceData: SourceData[],
  breakdownType: string = 'all'
): void {
  const columns: ExportColumn[] = [
    { key: 'name', label: 'Source Name' },
    { key: 'type', label: 'Category' },
    { key: 'count', label: 'Material Count' },
    { key: 'clicks', label: 'Total Clicks' },
    { key: 'conversions', label: 'Total Conversions' },
    { key: 'conversionRate', label: 'Conversion Rate', formatter: (val) => `${val.toFixed(2)}%` },
  ];

  const csv = generateCSV(sourceData, columns);
  const filename = `source-breakdown-${breakdownType}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Generic export function for custom data
 */
export function exportGeneric<T = Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filePrefix: string = 'export'
): void {
  const csv = generateCSV(data, columns);
  const filename = `${filePrefix}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Format material type for display
 */
function formatType(type: string): string {
  if (!type) return 'Unknown';

  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
