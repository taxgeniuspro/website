'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Search,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'contact' | 'appointment' | 'document' | 'page';
  title: string;
  subtitle?: string;
  href: string;
}

interface SearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickLinks = [
  { label: 'CRM Contacts', href: '/crm/contacts', icon: Users },
  { label: 'Calendar', href: '/dashboard/tax-preparer/calendar', icon: Calendar },
  { label: 'Analytics', href: '/dashboard/tax-preparer/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/tax-preparer/settings', icon: Settings },
];

const typeIcons = {
  contact: Users,
  appointment: Calendar,
  document: FileText,
  page: BarChart3,
};

export function SearchDrawer({ open, onOpenChange }: SearchDrawerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // TODO: Replace with actual API search
    // For now, simulate search with delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock results based on query
    const mockResults: SearchResult[] = [];

    if (searchQuery.toLowerCase().includes('contact') || searchQuery.length > 2) {
      mockResults.push({
        id: '1',
        type: 'contact',
        title: 'Search in CRM',
        subtitle: `Search for "${searchQuery}" in contacts`,
        href: `/crm/contacts?search=${encodeURIComponent(searchQuery)}`,
      });
    }

    setResults(mockResults);
    setIsSearching(false);
  };

  const handleSelect = (result: SearchResult | { href: string; label?: string }) => {
    // Save to recent searches
    const searchTerm = query || ('label' in result ? result.label : '');
    if (searchTerm) {
      const updated = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }

    onOpenChange(false);
    router.push(result.href);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>

          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search contacts, appointments..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="pl-10 h-11"
            />
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-6">
            {/* Search Results */}
            {query && results.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Results
                </h3>
                <div className="space-y-1">
                  {results.map((result) => {
                    const Icon = typeIcons[result.type];
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {query && results.length === 0 && !isSearching && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try different keywords
                </p>
              </div>
            )}

            {/* Quick Links (shown when no query) */}
            {!query && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Quick Links
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <button
                          key={link.href}
                          onClick={() => handleSelect(link)}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{link.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Searches
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                        onClick={clearRecentSearches}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(search);
                            handleSearch(search);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
