'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterItem {
  id: string;
  name: string;
  email?: string;
}

interface FilterBarProps {
  items: FilterItem[];
  onSelect: (itemId: string | null) => void;
  placeholder?: string;
  type: 'preparer' | 'affiliate' | 'client';
  className?: string;
}

export function FilterBar({
  items,
  onSelect,
  placeholder = 'Search...',
  type,
  className,
}: FilterBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      (item.email?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleSelect = (value: string) => {
    if (value === 'all') {
      setSelectedId(null);
      onSelect(null);
    } else {
      setSelectedId(value);
      onSelect(value);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedId(null);
    onSelect(null);
  };

  const typeLabels = {
    preparer: 'Tax Preparer',
    affiliate: 'Affiliate',
    client: 'Client',
  };

  return (
    <div className={cn('flex flex-col md:flex-row gap-4', className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Dropdown */}
      <div className="w-full md:w-[300px]">
        <Select value={selectedId || 'all'} onValueChange={handleSelect}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${typeLabels[type]}...`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {typeLabels[type]}s</SelectItem>
            {filteredItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
                {item.email && (
                  <span className="text-muted-foreground ml-2 text-xs">({item.email})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filter Button */}
      {selectedId && (
        <Button variant="outline" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-2" />
          Clear Filter
        </Button>
      )}
    </div>
  );
}
