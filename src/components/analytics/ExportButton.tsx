/**
 * Export Button Component
 *
 * Reusable button with dropdown for exporting data to CSV or PDF
 * Supports materials, funnel, source breakdown, and custom data exports
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.5
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  exportMaterials,
  exportFunnel,
  exportSourceBreakdown,
  exportGeneric,
  type MaterialPerformance,
  type FunnelData,
  type SourceData,
  type ExportColumn,
} from '@/lib/utils/csv-export';
import {
  exportDashboardReport,
  exportMaterialsReport,
  exportFunnelReport,
  type DashboardData,
} from '@/lib/utils/pdf-export';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface ExportButtonProps {
  data: MaterialPerformance[] | DashboardData | FunnelData | SourceData[] | unknown;
  type: 'materials' | 'dashboard' | 'funnel' | 'source' | 'custom';
  dateRange?: string;
  userName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';

  // For custom exports
  customColumns?: ExportColumn[];
  filePrefix?: string;
}

export function ExportButton({
  data,
  type,
  dateRange = 'all',
  userName = 'User',
  variant = 'outline',
  size = 'sm',
  customColumns,
  filePrefix,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'materials':
          exportMaterials(data as MaterialPerformance[]);
          break;

        case 'funnel':
          exportFunnel(data as FunnelData[], dateRange);
          break;

        case 'source':
          exportSourceBreakdown(data as SourceData[], dateRange);
          break;

        case 'custom':
          if (!customColumns) {
            throw new Error('Custom export requires columns definition');
          }
          exportGeneric(data, customColumns, filePrefix);
          break;

        case 'dashboard':
          // Convert dashboard data to materials for CSV export
          if (data.materials) {
            exportMaterials(data.materials);
          }
          break;

        default:
          throw new Error(`Unknown export type: ${type}`);
      }

      toast({
        title: 'Export Successful',
        description: 'CSV file has been downloaded',
      });
    } catch (error) {
      logger.error('CSV export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export CSV',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'dashboard':
          await exportDashboardReport(data as DashboardData);
          break;

        case 'materials':
          await exportMaterialsReport({
            materials: data as MaterialPerformance[],
            userName,
            dateRange,
          });
          break;

        case 'funnel':
          await exportFunnelReport({
            funnelData: data,
            userName,
            dateRange,
            materialName: data.materialName,
          });
          break;

        default:
          throw new Error(`PDF export not supported for type: ${type}`);
      }

      toast({
        title: 'Report Generated',
        description: 'PDF report has been downloaded',
      });
    } catch (error) {
      logger.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Determine if PDF export is available for this type
  const pdfAvailable = ['dashboard', 'materials', 'funnel'].includes(type);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
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
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        {pdfAvailable && (
          <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
            <FileText className="w-4 h-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simplified export button for single format
 */
export function SimpleExportButton({
  data,
  type,
  format,
  label = 'Export',
  ...props
}: Omit<ExportButtonProps, 'variant' | 'size'> & {
  format: 'csv' | 'pdf';
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format === 'csv') {
        switch (type) {
          case 'materials':
            exportMaterials(data as MaterialPerformance[]);
            break;
          case 'funnel':
            exportFunnel(data as FunnelData[], props.dateRange || 'all');
            break;
          case 'source':
            exportSourceBreakdown(data as SourceData[], props.dateRange || 'all');
            break;
          case 'custom':
            if (!props.customColumns) {
              throw new Error('Custom export requires columns definition');
            }
            exportGeneric(data, props.customColumns, props.filePrefix);
            break;
        }
        toast({
          title: 'Export Successful',
          description: 'CSV file has been downloaded',
        });
      } else {
        // PDF export
        switch (type) {
          case 'dashboard':
            await exportDashboardReport(data as DashboardData);
            break;
          case 'materials':
            await exportMaterialsReport({
              materials: data as MaterialPerformance[],
              userName: props.userName || 'User',
              dateRange: props.dateRange || 'all',
            });
            break;
          case 'funnel':
            await exportFunnelReport({
              funnelData: data,
              userName: props.userName || 'User',
              dateRange: props.dateRange || 'all',
              materialName: data.materialName,
            });
            break;
        }
        toast({
          title: 'Report Generated',
          description: 'PDF report has been downloaded',
        });
      }
    } catch (error) {
      logger.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={props.variant || 'outline'}
      size={props.size || 'sm'}
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          {format === 'csv' ? (
            <FileSpreadsheet className="w-4 h-4 mr-2" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {label}
        </>
      )}
    </Button>
  );
}
