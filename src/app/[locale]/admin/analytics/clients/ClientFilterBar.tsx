'use client';

import { useRouter, usePathname } from 'next/navigation';
import { FilterBar, type FilterItem } from '@/components/admin/analytics/FilterBar';

interface ClientFilterBarProps {
  clients: FilterItem[];
  currentClientId?: string;
}

export function ClientFilterBar({ clients, currentClientId }: ClientFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (clientId: string | null) => {
    if (clientId) {
      const params = new URLSearchParams();
      params.set('clientId', clientId);
      router.push(`${pathname}?${params.toString()}`);
    } else {
      // Clear filter - go back to base URL
      router.push(pathname);
    }
  };

  return (
    <FilterBar
      items={clients}
      onSelect={handleSelect}
      placeholder="Search clients..."
      type="client"
    />
  );
}
