'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  Home,
  DollarSign,
  MessageSquare,
  HelpCircle,
  Search,
  Clock,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: 'clients' | 'documents' | 'navigation' | 'settings' | 'help';
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Global Search Component
 *
 * Features:
 * - Command+K / Ctrl+K keyboard shortcut
 * - Search across clients, documents, navigation, settings
 * - Recent searches
 * - Categorized results
 * - Keyboard navigation
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        logger.error('Failed to parse recent searches', error);
      }
    }
  }, []);

  // Listen for Command+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      await performSearch(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      logger.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = useCallback(
    (result: SearchResult) => {
      // Add to recent searches
      const newRecent = [
        result,
        ...recentSearches.filter((r) => r.id !== result.id),
      ].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));

      // Navigate
      router.push(result.href);
      setOpen(false);
      setSearch('');
    },
    [recentSearches, router]
  );

  const getCategoryIcon = (category: SearchResult['category']) => {
    switch (category) {
      case 'clients':
        return Users;
      case 'documents':
        return FileText;
      case 'navigation':
        return Home;
      case 'settings':
        return Settings;
      case 'help':
        return HelpCircle;
      default:
        return Search;
    }
  };

  const getCategoryLabel = (category: SearchResult['category']) => {
    switch (category) {
      case 'clients':
        return 'Clients & Leads';
      case 'documents':
        return 'Documents';
      case 'navigation':
        return 'Pages';
      case 'settings':
        return 'Settings';
      case 'help':
        return 'Help & Support';
      default:
        return 'Results';
    }
  };

  // Group results by category
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-input"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search clients, documents, pages..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? 'Searching...' : 'No results found.'}
          </CommandEmpty>

          {/* Recent Searches */}
          {!search && recentSearches.length > 0 && (
            <>
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((result) => {
                  const Icon = result.icon || getCategoryIcon(result.category);
                  return (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-xs text-muted-foreground">
                            {result.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Search Results by Category */}
          {Object.entries(groupedResults).map(([category, items]) => {
            const categoryIcon = getCategoryIcon(category as SearchResult['category']);
            const categoryLabel = getCategoryLabel(category as SearchResult['category']);

            return (
              <CommandGroup key={category} heading={categoryLabel}>
                {items.map((result) => {
                  const Icon = result.icon || categoryIcon;
                  return (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-xs text-muted-foreground">
                            {result.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}

          {/* Quick Tips */}
          {!search && recentSearches.length === 0 && (
            <CommandGroup heading="Quick Tips">
              <CommandItem disabled className="text-xs text-muted-foreground">
                Use Command+K (Mac) or Ctrl+K (Windows) to open search
              </CommandItem>
              <CommandItem disabled className="text-xs text-muted-foreground">
                Search for clients, documents, pages, or settings
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
