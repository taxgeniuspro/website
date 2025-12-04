'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getRecentItems,
  getRecentItemsByType,
  formatRecentTime,
  getItemTypeLabel,
  type RecentItem,
  type RecentItemType,
} from '@/lib/recent-items';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, UserPlus, FileText, Mail, Ticket, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { removeRecentItem } from '@/lib/recent-items';

/**
 * Get icon for item type
 */
function getItemTypeIcon(type: RecentItemType) {
  const icons = {
    client: Users,
    lead: UserPlus,
    document: FileText,
    template: Mail,
    form: FileText,
    ticket: Ticket,
  };

  return icons[type] || Clock;
}

interface RecentItemsDropdownProps {
  /**
   * Maximum items to show
   */
  maxItems?: number;

  /**
   * Filter by type (optional)
   */
  type?: RecentItemType;

  /**
   * Custom trigger button text
   */
  triggerText?: string;
}

/**
 * RecentItemsDropdown Component
 *
 * Dropdown showing recently accessed items for quick navigation.
 * Industry standard pattern (GitHub, Linear, Notion).
 *
 * Features:
 * - Shows last accessed items
 * - Grouped by type
 * - Relative timestamps
 * - Quick access links
 * - Remove items
 *
 * @example
 * ```tsx
 * <RecentItemsDropdown maxItems={5} />
 * ```
 */
export function RecentItemsDropdown({
  maxItems = 10,
  type,
  triggerText = 'Recent',
}: RecentItemsDropdownProps) {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const recentItems = type ? getRecentItemsByType(type) : getRecentItems();
      setItems(recentItems.slice(0, maxItems));
    }
  }, [open, maxItems, type]);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeRecentItem(id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">{triggerText}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Items
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recent items
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((item) => {
              const Icon = getItemTypeIcon(item.type);

              return (
                <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 py-3 px-2 group"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <button
                          onClick={(e) => handleRemove(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                          title="Remove from recent"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getItemTypeLabel(item.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRecentTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RecentItemsCardProps {
  /**
   * Card title
   */
  title?: string;

  /**
   * Maximum items to show
   */
  maxItems?: number;

  /**
   * Filter by type (optional)
   */
  type?: RecentItemType;

  /**
   * Show empty state
   */
  showEmpty?: boolean;
}

/**
 * RecentItemsCard Component
 *
 * Card widget showing recent items for dashboard.
 *
 * @example
 * ```tsx
 * <RecentItemsCard
 *   title="Recent Clients"
 *   type="client"
 *   maxItems={5}
 * />
 * ```
 */
export function RecentItemsCard({
  title = 'Recent Items',
  maxItems = 5,
  type,
  showEmpty = true,
}: RecentItemsCardProps) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const recentItems = type ? getRecentItemsByType(type) : getRecentItems();
    setItems(recentItems.slice(0, maxItems));
  }, [maxItems, type]);

  const handleRemove = (id: string) => {
    removeRecentItem(id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  if (items.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recent items yet
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = getItemTypeIcon(item.type);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemove(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-background rounded"
                        title="Remove from recent"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {getItemTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRecentTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
