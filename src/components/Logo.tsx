'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Dark logo for light theme (better contrast) */}
      <Image
        src="/images/logo-dark-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className={cn(sizeClasses[size], 'w-auto dark:hidden')}
        priority
      />
      {/* Light logo for dark theme (better contrast) */}
      <Image
        src="/images/logo-light-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className={cn(sizeClasses[size], 'w-auto hidden dark:block')}
        priority
      />
      {showText && (
        <span className={cn('font-semibold', textSizeClasses[size])}>Tax Genius Pro</span>
      )}
    </div>
  );
}

export function LogoIcon({ size = 'md', className }: Omit<LogoProps, 'showText'>) {
  return (
    <div className={cn('flex items-center', className)}>
      {/* Dark logo for light theme (better contrast) */}
      <Image
        src="/images/logo-dark-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className={cn(sizeClasses[size], 'w-auto dark:hidden')}
        priority
      />
      {/* Light logo for dark theme (better contrast) */}
      <Image
        src="/images/logo-light-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className={cn(sizeClasses[size], 'w-auto hidden dark:block')}
        priority
      />
    </div>
  );
}

/**
 * Full logo with both light and dark versions for auth pages
 * Uses CSS to switch between them based on dark mode
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center', className)}>
      {/* Dark logo for light theme (better contrast) */}
      <Image
        src="/images/logo-dark-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className="h-12 w-auto dark:hidden"
        priority
      />
      {/* Light logo for dark theme (better contrast) */}
      <Image
        src="/images/logo-light-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className="h-12 w-auto hidden dark:block"
        priority
      />
    </div>
  );
}
