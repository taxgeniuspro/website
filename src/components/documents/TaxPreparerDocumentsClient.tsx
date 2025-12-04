'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentUploadZone } from './DocumentUploadZone';
import {
  Users,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Simplified status display - all documents show as "Uploaded"
// Status management still available in edit dialog for preparer workflow

export function TaxPreparerDocumentsClient() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch all clients and their documents
  const { data, isLoading, error } = useQuery({
    queryKey: ['tax-preparer-documents'],
    queryFn: async () => {
      const response = await fetch('/api/tax-preparer/documents');
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({
      documentId,
      status,
      notes,
    }: {
      documentId: string;
      status: string;
      notes: string;
    }) => {
      const response = await fetch(`/api/tax-preparer/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNotes: notes }),
      });
      if (!response.ok) throw new Error('Failed to update document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-preparer-documents'] });
      toast.success('Document updated successfully');
      setEditingDocument(null);
      setNewStatus('');
      setReviewNotes('');
    },
    onError: (error) => {
      logger.error('Error updating document:', error);
      toast.error('Failed to update document');
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/tax-preparer/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-preparer-documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error) => {
      logger.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    },
  });

  const handleUpdateDocument = () => {
    if (!editingDocument || !newStatus) return;
    updateDocumentMutation.mutate({
      documentId: editingDocument.id,
      status: newStatus,
      notes: reviewNotes,
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Document downloaded successfully');
    } catch (error) {
      logger.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load documents. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const clients = data?.clients || [];
  const stats = data?.stats || {};
  const selectedClient = clients.find((c: any) => c.clientId === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{stats.totalClients || 0}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{stats.totalDocuments || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
          <CardDescription>Choose a client to view and manage their documents</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client: any) => (
                <SelectItem key={client.clientId} value={client.clientId}>
                  {client.clientName} - {client.totalDocuments} documents
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Client Documents */}
      {selectedClient && (
        <Tabs defaultValue="view" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="view">
              <FolderOpen className="w-4 h-4 mr-2" />
              View Documents
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* View Documents Tab */}
          <TabsContent value="view" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{selectedClient.clientName}'s Documents</CardTitle>
                <CardDescription>
                  {selectedClient.totalDocuments} documents organized by tax year
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(selectedClient.documentsByYear).length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No documents yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(selectedClient.documentsByYear)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([year, docs]: [string, any]) => (
                        <div key={year} className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            Tax Year {year}
                            <Badge variant="outline">{docs.length} documents</Badge>
                          </h4>
                          <div className="space-y-2">
                            {docs.map((doc: any) => {
                              return (
                                <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-start justify-between gap-4">
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
                                          {formatDistanceToNow(new Date(doc.createdAt), {
                                            addSuffix: true,
                                          })}
                                        </span>
                                      </div>

                                      <div className="mt-2">
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

                                    <div className="flex flex-col gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingDocument(doc);
                                              setNewStatus(doc.status);
                                              setReviewNotes(doc.reviewNotes || '');
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Update Document</DialogTitle>
                                            <DialogDescription>
                                              Update the status and review notes for this document
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div className="space-y-2">
                                              <Label>Status</Label>
                                              <Select
                                                value={newStatus}
                                                onValueChange={setNewStatus}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="PENDING">
                                                    Pending Review
                                                  </SelectItem>
                                                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                                                  <SelectItem value="APPROVED">Approved</SelectItem>
                                                  <SelectItem value="REJECTED">Rejected</SelectItem>
                                                  <SelectItem value="PROCESSING">
                                                    Processing
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="space-y-2">
                                              <Label>Review Notes</Label>
                                              <Textarea
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Add notes about this document..."
                                                rows={4}
                                              />
                                            </div>

                                            <Button
                                              onClick={handleUpdateDocument}
                                              disabled={updateDocumentMutation.isPending}
                                              className="w-full"
                                            >
                                              {updateDocumentMutation.isPending ? (
                                                <>
                                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                  Updating...
                                                </>
                                              ) : (
                                                'Update Document'
                                              )}
                                            </Button>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        disabled={deleteDocumentMutation.isPending}
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Document for {selectedClient.clientName}</CardTitle>
                <CardDescription>Upload tax documents on behalf of this client</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUploadZone
                  clientId={selectedClient.clientId}
                  onUploadComplete={() =>
                    queryClient.invalidateQueries({ queryKey: ['tax-preparer-documents'] })
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
