'use client';

import { useRouter, usePathname } from 'next/navigation';
import { FilterBar, type FilterItem } from '@/components/admin/analytics/FilterBar';

interface PreparerFilterBarProps {
  preparers: FilterItem[];
  currentPreparerId?: string;
}

export function PreparerFilterBar({ preparers, currentPreparerId }: PreparerFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (preparerId: string | null) => {
    if (preparerId) {
      const params = new URLSearchParams();
      params.set('preparerId', preparerId);
      router.push(`${pathname}?${params.toString()}`);
    } else {
      // Clear filter - go back to base URL
      router.push(pathname);
    }
  };

  return (
    <FilterBar
      items={preparers}
      onSelect={handleSelect}
      placeholder="Search tax preparers..."
      type="preparer"
    />
  );
}
