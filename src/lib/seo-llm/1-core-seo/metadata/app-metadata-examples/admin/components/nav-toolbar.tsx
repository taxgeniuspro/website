'use client'

import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface NavToolbarProps {
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function NavToolbar({ onExpandAll, onCollapseAll }: NavToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-1 border-t px-2 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpandAll}
              className="h-7 w-7 p-0"
              aria-label="Expand all sections"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Expand All</p>
            <p className="text-xs text-muted-foreground">Cmd+E</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCollapseAll}
              className="h-7 w-7 p-0"
              aria-label="Collapse all sections"
            >
              <ChevronsDownUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Collapse All</p>
            <p className="text-xs text-muted-foreground">Cmd+Shift+E</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
