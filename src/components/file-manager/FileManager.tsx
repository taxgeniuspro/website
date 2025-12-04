'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FolderOpen,
  FileText,
  Grid3x3,
  List,
  Search,
  Filter,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Copy,
  Move,
  Share2,
  LayoutGrid,
  Loader2,
  ChevronRight,
  Home,
  Link2,
} from 'lucide-react';
import { FileTree } from './FileTree';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { FileActions } from './FileActions';
import { FilePreview } from './FilePreview';
import { CreateFolderDialog } from './CreateFolderDialog';
import { UploadDialog } from './UploadDialog';
import { CreateUploadLinkDialog } from './CreateUploadLinkDialog';
import { ShareUploadLinkDialog } from './ShareUploadLinkDialog';
import { logger } from '@/lib/logger';

export interface FileManagerFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  level: number;
  children?: FileManagerFolder[];
  documentCount?: number;
}

export interface FileManagerFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  type: string;
  taxYear: number;
  status: string;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FileManagerProps {
  clientId?: string; // For admin/preparer viewing specific client
  viewMode?: 'grid' | 'list';
  showTree?: boolean;
  allowUpload?: boolean;
  allowFolderCreate?: boolean;
  allowDelete?: boolean;
  allowMove?: boolean;
  allowShare?: boolean;
}

export function FileManager({
  clientId,
  viewMode: initialViewMode = 'grid',
  showTree = true,
  allowUpload = true,
  allowFolderCreate = true,
  allowDelete = true,
  allowMove = true,
  allowShare = true,
}: FileManagerProps) {
  const queryClient = useQueryClient();

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileManagerFile | null>(null);
  const [isCreateUploadLinkOpen, setIsCreateUploadLinkOpen] = useState(false);
  const [shareUploadLink, setShareUploadLink] = useState<any>(null);

  // Fetch folders
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['file-manager-folders', clientId],
    queryFn: async () => {
      const url = clientId ? `/api/folders?clientId=${clientId}` : '/api/folders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  // Fetch files in current folder
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['file-manager-files', clientId, currentFolderId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.append('clientId', clientId);
      if (currentFolderId) params.append('folderId', currentFolderId);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/folders/contents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    },
  });

  const folders: FileManagerFolder[] = foldersData?.folders || [];
  const files: FileManagerFile[] = filesData?.files || [];
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Breadcrumb navigation
  const getBreadcrumbs = useCallback(() => {
    if (!currentFolder) return [{ id: null, name: 'Home', path: '/' }];

    const breadcrumbs = [{ id: null, name: 'Home', path: '/' }];
    const parts = currentFolder.path.split('/').filter(Boolean);
    let accumulatedPath = '';

    parts.forEach((part, index) => {
      accumulatedPath += `/${part}`;
      const folder = folders.find((f) => f.path === accumulatedPath);
      if (folder) {
        breadcrumbs.push({
          id: folder.id,
          name: folder.name,
          path: folder.path,
        });
      }
    });

    return breadcrumbs;
  }, [currentFolder, folders]);

  // Selection handlers
  const handleFileSelect = (fileId: string, selected: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleFolderSelect = (folderId: string, selected: boolean) => {
    setSelectedFolders((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(folderId);
      } else {
        newSet.delete(folderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length && selectedFolders.size === 0) {
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
      setSelectedFolders(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  };

  // Bulk download
  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) {
      toast.error('No files selected');
      return;
    }

    try {
      const fileIds = Array.from(selectedFiles);
      const response = await fetch('/api/documents/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds }),
      });

      if (!response.ok) throw new Error('Failed to create zip');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Files downloaded successfully');
      handleClearSelection();
    } catch (error) {
      logger.error('Error downloading files:', error);
      toast.error('Failed to download files');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0 && selectedFolders.size === 0) {
      toast.error('Nothing selected');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedFiles.size} file(s) and ${selectedFolders.size} folder(s)?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/documents/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          folderIds: Array.from(selectedFolders),
        }),
      });

      if (!response.ok) throw new Error('Failed to delete items');

      toast.success('Items deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['file-manager-files'] });
      queryClient.invalidateQueries({ queryKey: ['file-manager-folders'] });
      handleClearSelection();
    } catch (error) {
      logger.error('Error deleting items:', error);
      toast.error('Failed to delete items');
    }
  };

  const hasSelection = selectedFiles.size > 0 || selectedFolders.size > 0;

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] lg:h-[calc(100vh-12rem)] gap-4">
      {/* Left Sidebar - Folder Tree */}
      {showTree && (
        <Card className="w-full lg:w-64 flex-shrink-0 overflow-hidden flex flex-col max-h-[300px] lg:max-h-none">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Folders
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {foldersLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <FileTree
                folders={folders}
                currentFolderId={currentFolderId}
                onFolderSelect={setCurrentFolderId}
              />
            )}
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <Card className="p-4 mb-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 sm:gap-2 mb-4 text-xs sm:text-sm text-muted-foreground overflow-x-auto">
            {getBreadcrumbs().map((crumb, index, array) => (
              <div key={crumb.id || 'home'} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {index === 0 ? <Home className="w-4 h-4" /> : <span className="truncate max-w-[120px] sm:max-w-none">{crumb.name}</span>}
                </button>
                {index < array.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 relative sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {allowUpload && (
                  <Button onClick={() => setIsUploadOpen(true)} size="sm">
                    <Upload className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                )}
                {allowFolderCreate && (
                  <Button variant="outline" onClick={() => setIsCreateFolderOpen(true)} size="sm">
                    <FolderPlus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">New Folder</span>
                  </Button>
                )}
                {clientId && currentFolderId && allowShare && (
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateUploadLinkOpen(true)}
                    size="sm"
                    className="hidden sm:flex"
                  >
                    <Link2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload Link</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {hasSelection && (
            <div className="mt-4 pt-4 border-t">
              <FileActions
                selectedCount={selectedFiles.size + selectedFolders.size}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onBulkDownload={handleBulkDownload}
                onBulkDelete={allowDelete ? handleBulkDelete : undefined}
                allowMove={allowMove}
                allowShare={allowShare}
              />
            </div>
          )}
        </Card>

        {/* Files Display */}
        <Card className="flex-1 overflow-hidden">
          {filesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === 'grid' ? (
            <FileGrid
              files={files}
              folders={folders.filter((f) => f.parentId === currentFolderId)}
              selectedFiles={selectedFiles}
              selectedFolders={selectedFolders}
              onFileSelect={handleFileSelect}
              onFolderSelect={handleFolderSelect}
              onFolderOpen={setCurrentFolderId}
              onFilePreview={setPreviewFile}
            />
          ) : (
            <FileList
              files={files}
              folders={folders.filter((f) => f.parentId === currentFolderId)}
              selectedFiles={selectedFiles}
              selectedFolders={selectedFolders}
              onFileSelect={handleFileSelect}
              onFolderSelect={handleFolderSelect}
              onFolderOpen={setCurrentFolderId}
              onFilePreview={setPreviewFile}
            />
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        parentFolderId={currentFolderId}
        clientId={clientId}
      />

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        folderId={currentFolderId}
        clientId={clientId}
      />

      {clientId && currentFolderId && currentFolder && (
        <>
          <CreateUploadLinkDialog
            open={isCreateUploadLinkOpen}
            onOpenChange={setIsCreateUploadLinkOpen}
            folderId={currentFolderId}
            folderName={currentFolder.name}
            clientId={clientId}
            onLinkCreated={(linkData) => {
              setIsCreateUploadLinkOpen(false);
              setShareUploadLink(linkData);
            }}
          />

          {shareUploadLink && (
            <ShareUploadLinkDialog
              open={!!shareUploadLink}
              onOpenChange={(open) => !open && setShareUploadLink(null)}
              uploadLink={shareUploadLink}
              folderId={currentFolderId}
            />
          )}
        </>
      )}

      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}
