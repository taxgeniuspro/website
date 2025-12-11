'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileManager } from '@/components/file-manager/FileManager';
import {
  AlertCircle,
  Users,
  FileText,
  FolderOpen,
  Search,
  UserPlus,
  Files,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';

interface TaxPreparerFileCenterProps {
  initialFolderId?: string;
}

interface LeadFolder {
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    convertedToClient: boolean;
    createdAt: string;
  };
  folder: {
    id: string;
    name: string;
    path: string;
    documentCount: number;
    yearFolders: Array<{
      id: string;
      name: string;
      path: string;
      documentCount: number;
    }>;
  } | null;
}

export function TaxPreparerFileCenter({ initialFolderId }: TaxPreparerFileCenterProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null);
  const [activeTab, setActiveTab] = useState<string>(initialFolderId ? 'leads' : 'clients');
  const [leadSearch, setLeadSearch] = useState('');

  // Update selected folder when initialFolderId changes
  useEffect(() => {
    if (initialFolderId) {
      setSelectedFolderId(initialFolderId);
      setActiveTab('leads');
    }
  }, [initialFolderId]);

  // Fetch all clients that this preparer manages
  const { data: clientsData, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['tax-preparer-clients'],
    queryFn: async () => {
      const response = await fetch('/api/tax-preparer/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Fetch lead folders
  const { data: leadFoldersData, isLoading: leadFoldersLoading, error: leadFoldersError } = useQuery({
    queryKey: ['tax-preparer-lead-folders', leadSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (leadSearch) params.append('search', leadSearch);
      const response = await fetch(`/api/tax-preparer/lead-folders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch lead folders');
      return response.json();
    },
  });

  const isLoading = clientsLoading || leadFoldersLoading;
  const error = clientsError || leadFoldersError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    logger.error('Error loading data:', error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load data. Please try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  const clients = clientsData?.clients || [];
  const clientStats = clientsData?.stats || {};
  const leadFolders: LeadFolder[] = leadFoldersData?.leadFolders || [];
  const leadStats = leadFoldersData?.stats || {};
  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  // Find the selected lead folder
  const selectedLeadFolder = leadFolders.find((lf) => lf.folder?.id === selectedFolderId);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Converted Clients</p>
                <p className="text-2xl font-bold">{clientStats.totalClients || 0}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Intake Leads</p>
                <p className="text-2xl font-bold">{leadStats.totalLeads || 0}</p>
              </div>
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads with Folders</p>
                <p className="text-2xl font-bold">{leadStats.leadsWithFolders || 0}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">
                  {(clientStats.totalDocuments || 0) + (leadStats.totalDocuments || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Leads vs Clients */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="leads" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Intake Leads
            {leadStats.leadsWithFolders > 0 && (
              <Badge variant="secondary" className="ml-1">
                {leadStats.leadsWithFolders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clients
            {clientStats.totalClients > 0 && (
              <Badge variant="secondary" className="ml-1">
                {clientStats.totalClients}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Document Folders</CardTitle>
              <CardDescription>
                Browse documents from tax intake form submissions. Each lead has their own folder
                organized by tax year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name or email..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-9 max-w-md"
                />
              </div>

              {/* Lead Folder List */}
              {leadFolders.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No lead folders yet"
                  description="When clients submit tax intake forms, their document folders will appear here."
                  size="sm"
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {leadFolders.map((lf) => (
                    <Card
                      key={lf.lead.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedFolderId === lf.folder?.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => lf.folder && setSelectedFolderId(lf.folder.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <FolderOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {lf.lead.lastName}, {lf.lead.firstName}
                              </p>
                              <p className="text-xs text-muted-foreground">{lf.lead.email}</p>
                            </div>
                          </div>
                          {lf.lead.convertedToClient && (
                            <Badge variant="outline" className="text-xs">
                              Converted
                            </Badge>
                          )}
                        </div>

                        {lf.folder ? (
                          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Files className="h-3 w-3" />
                              {lf.folder.documentCount +
                                lf.folder.yearFolders.reduce((sum, y) => sum + y.documentCount, 0)}{' '}
                              docs
                            </span>
                            <span>
                              {lf.folder.yearFolders.length} year folder
                              {lf.folder.yearFolders.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground italic">
                            No folder created yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Selected Lead Info */}
              {selectedLeadFolder && selectedLeadFolder.folder && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Viewing files for: {selectedLeadFolder.lead.firstName}{' '}
                        {selectedLeadFolder.lead.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedLeadFolder.lead.email} • Lead since{' '}
                        {new Date(selectedLeadFolder.lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/en/dashboard/tax-preparer/leads`}>View Lead Details</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Manager for selected lead folder */}
          {selectedFolderId ? (
            <FileManager
              folderId={selectedFolderId}
              viewMode="grid"
              showTree={true}
              allowUpload={true}
              allowFolderCreate={true}
              allowDelete={true}
              allowMove={true}
              allowShare={false}
            />
          ) : leadFolders.length > 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Select a lead folder"
              description="Click on a lead folder above to browse their documents."
              size="md"
              showCard={true}
            />
          ) : null}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>
                Choose a converted client to browse their documents with visual folder navigation
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
              description="You don't have any converted clients yet. Once leads are converted to clients, they'll appear here."
              size="lg"
              helpLink={{
                label: 'View intake leads',
                href: '/en/dashboard/tax-preparer/leads',
              }}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No client selected"
              description="Select a client from the dropdown above to browse their documents with visual folder navigation."
              size="md"
              showCard={true}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
