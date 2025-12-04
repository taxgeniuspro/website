'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Download, FileText, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  type: string;
  taxYear: number;
  status: string;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

interface DocumentsByYear {
  [year: number]: Document[];
}

interface DocumentsListProps {
  documentsByYear: DocumentsByYear;
  stats?: {
    totalDocuments: number;
    byStatus?: Record<string, number>;
  };
  onRefresh?: () => void;
}

// Simplified status display - all documents show as "Uploaded"

export function DocumentsList({ documentsByYear, stats, onRefresh }: DocumentsListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.id);
    try {
      const response = await fetch(doc.fileUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Document downloaded successfully');
    } catch (error) {
      logger.error('Error downloading document:', error);
      toast.error('Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const years = Object.keys(documentsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  if (years.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No documents yet</p>
          <p className="text-sm text-muted-foreground">Upload your tax documents to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents by Year */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>Organized by tax year</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue={years[0]?.toString()}>
            {years.map((year) => {
              const docs = documentsByYear[year] || [];
              return (
                <AccordionItem key={year} value={year.toString()}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold">Tax Year {year}</span>
                      <Badge variant="outline">{docs.length} documents</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {docs.map((doc) => {
                        return (
                          <div
                            key={doc.id}
                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Thumbnail Preview */}
                                <div className="w-16 h-16 flex-shrink-0 rounded border overflow-hidden bg-muted">
                                  {doc.mimeType.startsWith('image/') ? (
                                    <img
                                      src={doc.fileUrl}
                                      alt={doc.fileName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : doc.mimeType === 'application/pdf' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-red-50">
                                      <FileText className="w-8 h-8 text-red-600" />
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <FileText className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{doc.fileName}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-sm text-muted-foreground">
                                      {formatFileSize(doc.fileSize)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {doc.type}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      Uploaded{' '}
                                      {formatDistanceToNow(new Date(doc.createdAt), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="font-medium">Uploaded</span>
                                    </div>
                                  </div>

                                  {doc.reviewNotes && (
                                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                                      <p className="font-medium mb-1">Review Notes:</p>
                                      <p className="text-muted-foreground">{doc.reviewNotes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                disabled={downloadingId === doc.id}
                              >
                                {downloadingId === doc.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
