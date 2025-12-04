'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { FileManager } from '@/components/file-manager/FileManager';
import { AlertCircle, Users, FileText } from 'lucide-react';
import { logger } from '@/lib/logger';
import { EmptyState } from '@/components/EmptyState';

export function TaxPreparerFileCenter() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Fetch all clients that this preparer manages
  const { data, isLoading, error } = useQuery({
    queryKey: ['tax-preparer-clients'],
    queryFn: async () => {
      const response = await fetch('/api/tax-preparer/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    logger.error('Error loading clients:', error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load clients. Please try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  const clients = data?.clients || [];
  const stats = data?.stats || {};
  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Clients</p>
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
          <CardDescription>
            Choose a client to browse their documents with visual folder navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-full max-w-xl">
              <SelectValue placeholder="Select a client to view their files..." />
            </SelectTrigger>
            <SelectContent>
              {clients.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No clients assigned yet
                </div>
              ) : (
                clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">
                        {client.firstName} {client.lastName}
                      </span>
                      <span className="text-muted-foreground ml-4 text-xs">{client.email}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {selectedClient && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                Viewing files for: {selectedClient.firstName} {selectedClient.lastName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedClient.email} • Client since{' '}
                {new Date(selectedClient.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Manager - Only show when client is selected */}
      {selectedClientId ? (
        <FileManager
          clientId={selectedClientId}
          viewMode="grid"
          showTree={true}
          allowUpload={true}
          allowFolderCreate={true}
          allowDelete={true}
          allowMove={true}
          allowShare={false}
        />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients assigned"
          description="You don't have any clients assigned yet. Once clients are assigned to you, you'll be able to manage their documents here."
          size="lg"
          helpLink={{
            label: 'Learn about client management',
            href: '/help/clients',
          }}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="No client selected"
          description="Select a client from the dropdown above to browse their documents with visual folder navigation. You can upload, organize, and share files with your clients."
          size="md"
          showCard={true}
        />
      )}
    </div>
  );
}
