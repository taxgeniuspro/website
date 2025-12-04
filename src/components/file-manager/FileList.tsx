'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Folder, FileText, Download, MoreVertical } from 'lucide-react';
import { FileManagerFolder, FileManagerFile } from './FileManager';
import { formatDistanceToNow } from 'date-fns';

interface FileListProps {
  files: FileManagerFile[];
  folders: FileManagerFolder[];
  selectedFiles: Set<string>;
  selectedFolders: Set<string>;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onFolderSelect: (folderId: string, selected: boolean) => void;
  onFolderOpen: (folderId: string) => void;
  onFilePreview: (file: FileManagerFile) => void;
}

export function FileList({
  files,
  folders,
  selectedFiles,
  selectedFolders,
  onFileSelect,
  onFolderSelect,
  onFolderOpen,
  onFilePreview,
}: FileListProps) {
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
    <div className="overflow-y-auto h-full">
      <table className="w-full">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="w-12 p-4">
              <Checkbox />
            </th>
            <th className="p-4">Name</th>
            <th className="p-4 w-32">Size</th>
            <th className="p-4 w-40">Modified</th>
            <th className="p-4 w-32">Type</th>
            <th className="p-4 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {/* Folders First */}
          {folders.map((folder) => {
            const isSelected = selectedFolders.has(folder.id);

            return (
              <tr
                key={folder.id}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onFolderOpen(folder.id)}
              >
                <td className="p-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onFolderSelect(folder.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {folder.documentCount || 0} items
                </td>
                <td className="p-4 text-sm text-muted-foreground">—</td>
                <td className="p-4 text-sm text-muted-foreground">Folder</td>
                <td className="p-4">
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const isSelected = selectedFiles.has(file.id);

            return (
              <tr
                key={file.id}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onFilePreview(file)}
              >
                <td className="p-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onFileSelect(file.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span>{file.fileName}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatFileSize(file.fileSize)}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                </td>
                <td className="p-4 text-sm text-muted-foreground">{file.type}</td>
                <td className="p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Download file
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
