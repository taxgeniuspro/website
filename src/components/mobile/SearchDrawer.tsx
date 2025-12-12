'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  Phone,
  Mail,
  MessageCircle,
  Loader2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  contactType: string;
  stage: string;
}

interface SearchResult {
  id: string;
  type: 'contact' | 'appointment' | 'document' | 'page';
  title: string;
  subtitle?: string;
  href: string;
  contact?: Contact;
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

// Helper to get stage badge styling
const getStageBadgeClass = (stage: string) => {
  const classes: Record<string, string> = {
    'NEW': 'bg-blue-100 text-blue-800 border-blue-300',
    'CONTACTED': 'bg-purple-100 text-purple-800 border-purple-300',
    'QUALIFIED': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'DOCUMENTS': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'FILED': 'bg-orange-100 text-orange-800 border-orange-300',
    'CLOSED': 'bg-green-100 text-green-800 border-green-300',
    'LOST': 'bg-red-100 text-red-800 border-red-300',
  };
  return classes[stage] || '';
};

export function SearchDrawer({ open, onOpenChange }: SearchDrawerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Load recent contacts when drawer opens
      loadRecentContacts();
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

  // Load recent contacts from localStorage
  const loadRecentContacts = () => {
    const saved = localStorage.getItem('recentContacts');
    if (saved) {
      try {
        setRecentContacts(JSON.parse(saved));
      } catch {
        setRecentContacts([]);
      }
    }
  };

  // Save recent contact to localStorage
  const saveRecentContact = (contact: Contact) => {
    const updated = [contact, ...recentContacts.filter((c) => c.id !== contact.id)].slice(0, 5);
    setRecentContacts(updated);
    localStorage.setItem('recentContacts', JSON.stringify(updated));
  };

  // Debounced search function
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Search contacts via API
      const response = await fetch(`/api/crm/contacts?search=${encodeURIComponent(searchQuery)}&limit=10`);

      if (response.ok) {
        const data = await response.json();
        const contacts = data.data?.contacts || [];

        // Convert contacts to search results
        const contactResults: SearchResult[] = contacts.map((contact: Contact) => ({
          id: contact.id,
          type: 'contact' as const,
          title: `${contact.firstName} ${contact.lastName}`,
          subtitle: contact.email,
          href: `/crm/contacts/${contact.id}`,
          contact,
        }));

        // Add a "View all results" option if there are results
        if (contactResults.length > 0) {
          contactResults.push({
            id: 'view-all',
            type: 'page' as const,
            title: 'View all results in CRM',
            subtitle: `Search "${searchQuery}" in contacts`,
            href: `/crm/contacts?search=${encodeURIComponent(searchQuery)}`,
          });
        }

        setResults(contactResults);
      } else {
        // Fallback to CRM redirect if API fails
        setResults([{
          id: 'fallback',
          type: 'contact' as const,
          title: 'Search in CRM',
          subtitle: `Search for "${searchQuery}" in contacts`,
          href: `/crm/contacts?search=${encodeURIComponent(searchQuery)}`,
        }]);
      }
    } catch {
      // Fallback to CRM redirect on error
      setResults([{
        id: 'fallback',
        type: 'contact' as const,
        title: 'Search in CRM',
        subtitle: `Search for "${searchQuery}" in contacts`,
        href: `/crm/contacts?search=${encodeURIComponent(searchQuery)}`,
      }]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search with 300ms delay
  const debouncedSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  }, [handleSearch]);

  const handleSelect = (result: SearchResult | { href: string; label?: string }) => {
    // Save to recent searches
    const searchTerm = query || ('label' in result ? result.label : '');
    if (searchTerm) {
      const updated = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }

    // Save contact to recent contacts if it's a contact result
    if ('contact' in result && result.contact) {
      saveRecentContact(result.contact);
    }

    onOpenChange(false);
    router.push(result.href);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const clearRecentContacts = () => {
    setRecentContacts([]);
    localStorage.removeItem('recentContacts');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Clients
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
              placeholder="Search by name, email, or phone..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                debouncedSearch(e.target.value);
              }}
              className="pl-10 h-11"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
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
                <div className="space-y-2">
                  {results.map((result) => {
                    const Icon = typeIcons[result.type];

                    // Contact card with quick actions
                    if (result.contact) {
                      const contact = result.contact;
                      return (
                        <div
                          key={result.id}
                          className="border rounded-lg p-3 bg-card"
                        >
                          {/* Contact Header */}
                          <button
                            onClick={() => handleSelect(result)}
                            className="w-full flex items-center gap-3 text-left mb-2"
                          >
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {contact.firstName[0]}{contact.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {contact.firstName} {contact.lastName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className={cn('text-xs px-1.5 py-0', getStageBadgeClass(contact.stage))}>
                                  {contact.stage}
                                </Badge>
                                <span>{contact.contactType}</span>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>

                          {/* Contact Info */}
                          <div className="space-y-1 text-xs text-muted-foreground mb-2 pl-[52px]">
                            <p className="truncate">{contact.email}</p>
                            {contact.phone && <p>{contact.phone}</p>}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            {contact.phone && (
                              <>
                                <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
                                  <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
                                    <Phone className="w-3 h-3 mr-1" />
                                    Call
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
                                  <a href={`sms:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Text
                                  </a>
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
                              <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    // Regular result (view all, fallback)
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border"
                      >
                        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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

            {/* Searching indicator */}
            {query && isSearching && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {/* No Results */}
            {query && results.length === 0 && !isSearching && query.length >= 2 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No contacts found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try different keywords or check the spelling
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/crm/contacts?search=${encodeURIComponent(query)}`);
                  }}
                >
                  View all in CRM
                </Button>
              </div>
            )}

            {/* Quick Links (shown when no query) */}
            {!query && (
              <>
                {/* Recent Contacts */}
                {recentContacts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Contacts
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                        onClick={clearRecentContacts}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {recentContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="border rounded-lg p-3 bg-card"
                        >
                          <button
                            onClick={() => handleSelect({
                              id: contact.id,
                              type: 'contact',
                              title: `${contact.firstName} ${contact.lastName}`,
                              href: `/crm/contacts/${contact.id}`,
                              contact,
                            } as SearchResult)}
                            className="w-full flex items-center gap-3 text-left mb-2"
                          >
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {contact.firstName[0]}{contact.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {contact.firstName} {contact.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                            </div>
                          </button>

                          {/* Quick Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            {contact.phone && (
                              <>
                                <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
                                  <a href={`tel:${contact.phone}`}>
                                    <Phone className="w-3 h-3 mr-1" />
                                    Call
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
                                  <a href={`sms:${contact.phone}`}>
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Text
                                  </a>
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm" className="flex-1 h-8" asChild>
                              <a href={`mailto:${contact.email}`}>
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Links */}
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
