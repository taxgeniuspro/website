'use client';

import { useState } from 'react';
import { FileManager } from '@/components/file-manager/FileManager';
import { EasyUpload } from '@/components/documents/EasyUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Upload, FolderOpen, FileText } from 'lucide-react';

export default function ClientDocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Increment key to trigger FileManager refresh
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Upload and manage your tax documents securely
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload your tax documents securely. Documents are organized by folders and can be
            downloaded anytime. Select a folder before uploading to keep your documents organized.
          </AlertDescription>
        </Alert>

        {/* Tabbed Interface */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Documents
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Browse Files
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab - Easy and user-friendly */}
          <TabsContent value="upload" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Upload Area */}
              <div className="lg:col-span-2">
                <EasyUpload
                  onUploadComplete={handleUploadComplete}
                  showFolderPicker={true}
                />
              </div>

              {/* Quick Tips Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      What to Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">📄</span>
                      <div>
                        <p className="font-medium">W-2 Forms</p>
                        <p className="text-muted-foreground text-xs">From your employer(s)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">📋</span>
                      <div>
                        <p className="font-medium">1099 Forms</p>
                        <p className="text-muted-foreground text-xs">Interest, dividends, freelance income</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🪪</span>
                      <div>
                        <p className="font-medium">ID Documents</p>
                        <p className="text-muted-foreground text-xs">Driver's license, Social Security card</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🧾</span>
                      <div>
                        <p className="font-medium">Receipts</p>
                        <p className="text-muted-foreground text-xs">Deductible expenses and donations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🏠</span>
                      <div>
                        <p className="font-medium">Mortgage Documents</p>
                        <p className="text-muted-foreground text-xs">Form 1098, property tax statements</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm">
                      <strong>💡 Tip:</strong> Create folders for each tax year to keep your documents organized.
                      Your tax preparer can access all documents you upload.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Browse Tab - Full file manager */}
          <TabsContent value="browse" className="mt-6">
            <FileManager
              key={refreshKey}
              viewMode="list"
              showTree={false}
              allowUpload={true}
              allowFolderCreate={true}
              allowDelete={false}
              allowMove={false}
              allowShare={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
