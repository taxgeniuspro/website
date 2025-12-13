'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative flex-shrink-0', sizeClasses[size])}>
        <Image
          src={resolvedTheme === 'dark' ? '/images/logo-dark-theme.png' : '/images/logo-light-theme.png'}
          alt="Tax Genius Pro"
          fill
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={cn('font-semibold', textSizeClasses[size])}>Tax Genius Pro</span>
      )}
    </div>
  );
}

export function LogoIcon({ size = 'md', className }: Omit<LogoProps, 'showText'>) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={cn('relative flex-shrink-0', sizeClasses[size], className)}>
      <Image
        src={resolvedTheme === 'dark' ? '/images/logo-dark-theme.png' : '/images/logo-light-theme.png'}
        alt="Tax Genius Pro"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
