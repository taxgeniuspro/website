'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileManagerFolder } from './FileManager';

interface FileTreeProps {
  folders: FileManagerFolder[];
  currentFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

export function FileTree({ folders, currentFolderId, onFolderSelect }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build tree structure
  const buildTree = (parentId: string | null = null): FileManagerFolder[] => {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const FolderNode = ({ folder, level = 0 }: { folder: FileManagerFolder; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;
    const hasChildren = folders.some((f) => f.parentId === folder.id);

    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors',
            isSelected && 'bg-primary/10 hover:bg-primary/15'
          )}
          style={{ paddingLeft: `${level * 1 + 0.5}rem` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 text-blue-600" />
          )}

          <span className="text-sm truncate flex-1">{folder.name}</span>

          {folder.documentCount !== undefined && (
            <span className="text-xs text-muted-foreground">{folder.documentCount}</span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {buildTree(folder.id).map((child) => (
              <FolderNode key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Root level
  const rootFolders = buildTree(null);

  if (rootFolders.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No folders yet</div>;
  }

  return (
    <div className="p-2">
      {/* Home / Root */}
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors mb-1',
          currentFolderId === null && 'bg-primary/10 hover:bg-primary/15'
        )}
        onClick={() => onFolderSelect(null)}
      >
        <FolderOpen className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium">All Files</span>
      </div>

      {rootFolders.map((folder) => (
        <FolderNode key={folder.id} folder={folder} />
      ))}
    </div>
  );
}
