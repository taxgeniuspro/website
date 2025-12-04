'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Folder, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileManagerFolder, FileManagerFile } from './FileManager';
import { formatDistanceToNow } from 'date-fns';

interface FileGridProps {
  files: FileManagerFile[];
  folders: FileManagerFolder[];
  selectedFiles: Set<string>;
  selectedFolders: Set<string>;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onFolderSelect: (folderId: string, selected: boolean) => void;
  onFolderOpen: (folderId: string) => void;
  onFilePreview: (file: FileManagerFile) => void;
}

export function FileGrid({
  files,
  folders,
  selectedFiles,
  selectedFolders,
  onFileSelect,
  onFolderSelect,
  onFolderOpen,
  onFilePreview,
}: FileGridProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">This folder is empty</p>
          <p className="text-sm">Upload files or create folders to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {/* Folders First */}
        {folders.map((folder) => {
          const isSelected = selectedFolders.has(folder.id);

          return (
            <div
              key={folder.id}
              className={cn(
                'group relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                isSelected && 'border-primary bg-primary/5'
              )}
            >
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onFolderSelect(folder.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div
                onClick={() => onFolderOpen(folder.id)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 flex items-center justify-center">
                  <Folder className="w-14 h-14 text-blue-600" />
                </div>
                <div className="w-full text-center">
                  <p className="text-sm font-medium truncate" title={folder.name}>
                    {folder.name}
                  </p>
                  {folder.documentCount !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {folder.documentCount} file{folder.documentCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Files */}
        {files.map((file) => {
          const isSelected = selectedFiles.has(file.id);
          const FileIcon = getFileIcon(file.mimeType);
          // Ensure fileUrl uses /api/uploads prefix
          const fileUrl = file.fileUrl.startsWith('/api/uploads')
            ? file.fileUrl
            : file.fileUrl.replace('/uploads', '/api/uploads');

          return (
            <div
              key={file.id}
              className={cn(
                'group relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                isSelected && 'border-primary bg-primary/5'
              )}
            >
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onFileSelect(file.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div onClick={() => onFilePreview(file)} className="flex flex-col items-center gap-2">
                {/* Thumbnail */}
                <div className="w-16 h-16 flex items-center justify-center rounded border overflow-hidden bg-muted">
                  {file.mimeType.startsWith('image/') ? (
                    <img src={fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                  ) : file.mimeType === 'application/pdf' ? (
                    <div className="w-full h-full flex items-center justify-center bg-red-50">
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                  ) : (
                    <FileIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="w-full text-center">
                  <p className="text-sm font-medium truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
