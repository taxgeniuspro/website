'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Period = '7d' | '30d' | '90d' | 'all';

interface PeriodToggleProps {
  selected: Period;
  onChange: (period: Period) => void;
  className?: string;
}

const periods: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

export function PeriodToggle({ selected, onChange, className }: PeriodToggleProps) {
  return (
    <div className={cn('inline-flex rounded-lg border bg-muted p-1', className)}>
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selected === period.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(period.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-all',
            selected === period.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
