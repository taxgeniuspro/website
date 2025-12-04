'use client';

import { useRouter, usePathname } from 'next/navigation';
import { PeriodToggle, type Period } from '@/components/admin/analytics/PeriodToggle';

interface AnalyticsPeriodSelectorProps {
  currentPeriod: Period;
}

export function AnalyticsPeriodSelector({ currentPeriod }: AnalyticsPeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handlePeriodChange = (period: Period) => {
    // Update URL with new period
    const params = new URLSearchParams();
    params.set('period', period);
    router.push(`${pathname}?${params.toString()}`);
  };

  return <PeriodToggle selected={currentPeriod} onChange={handlePeriodChange} />;
}
