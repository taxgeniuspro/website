'use client';

import { useViewModeContext } from '@/context/ViewModeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AffiliateOnlyModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function AffiliateOnlyModeToggle({
  className = '',
  showLabel = true
}: AffiliateOnlyModeToggleProps) {
  const { isAffiliateOnly, toggleViewMode } = useViewModeContext();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-3 ${className}`}>
            {showLabel && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label
                  htmlFor="affiliate-only-mode"
                  className="text-sm font-medium cursor-pointer"
                >
                  Affiliate View
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="affiliate-only-mode"
                checked={isAffiliateOnly}
                onCheckedChange={toggleViewMode}
              />
              {isAffiliateOnly ? (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Tax Hidden
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <Eye className="w-3 h-3 mr-1" />
                  All Data
                </Badge>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium mb-1">
            {isAffiliateOnly ? 'Affiliate-Only View Active' : 'Full Data View Active'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAffiliateOnly
              ? 'Tax filing status, documents, and personal tax info are hidden. Only referral/affiliate data is shown.'
              : 'All data is visible including tax filing status, documents, and personal information.'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
