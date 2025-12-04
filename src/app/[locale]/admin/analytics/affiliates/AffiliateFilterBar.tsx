'use client';

import { useRouter, usePathname } from 'next/navigation';
import { FilterBar, type FilterItem } from '@/components/admin/analytics/FilterBar';

interface AffiliateFilterBarProps {
  affiliates: FilterItem[];
  currentAffiliateId?: string;
}

export function AffiliateFilterBar({ affiliates, currentAffiliateId }: AffiliateFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (affiliateId: string | null) => {
    if (affiliateId) {
      const params = new URLSearchParams();
      params.set('affiliateId', affiliateId);
      router.push(`${pathname}?${params.toString()}`);
    } else {
      // Clear filter - go back to base URL
      router.push(pathname);
    }
  };

  return (
    <FilterBar
      items={affiliates}
      onSelect={handleSelect}
      placeholder="Search affiliates..."
      type="affiliate"
    />
  );
}
