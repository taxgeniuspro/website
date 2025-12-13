'use client';

import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface TrackingCodeActionsProps {
  activeCode: string | null;
}

export function TrackingCodeActions({ activeCode }: TrackingCodeActionsProps) {
  const handleCopy = () => {
    if (activeCode) {
      navigator.clipboard.writeText(activeCode);
      toast.success('Tracking code copied!');
    }
  };

  return (
    <div className="flex gap-1">
      <button
        className="p-2 hover:bg-accent rounded-md transition-colors"
        title="Copy tracking code"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
      </button>
      <a
        href={`https://taxgeniuspro.tax?ref=${activeCode}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-accent rounded-md transition-colors"
        title="View tracking URL"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
