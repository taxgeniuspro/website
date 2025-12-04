'use client';

import { Button } from '@/components/ui/button';
import { Download, Trash2, X, CheckSquare } from 'lucide-react';

interface FileActionsProps {
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete?: () => void;
  allowMove?: boolean;
  allowShare?: boolean;
}

export function FileActions({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  allowMove,
  allowShare,
}: FileActionsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          <CheckSquare className="w-4 h-4 mr-2" />
          Select All
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBulkDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        {onBulkDelete && (
          <Button variant="outline" size="sm" onClick={onBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
