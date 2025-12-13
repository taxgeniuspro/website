'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-auto',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

const imageSizes = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 40, height: 40 },
  xl: { width: 200, height: 50 },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const { width, height } = imageSizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative flex-shrink-0', sizeClasses[size])}>
        {/* Light theme logo - hidden in dark mode */}
        <Image
          src="/images/logo-light-theme.png"
          alt="Tax Genius Pro"
          width={width}
          height={height}
          className="object-contain dark:hidden"
          priority
        />
        {/* Dark theme logo - hidden in light mode */}
        <Image
          src="/images/logo-dark-theme.png"
          alt="Tax Genius Pro"
          width={width}
          height={height}
          className="object-contain hidden dark:block"
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
  const { width, height } = imageSizes[size];

  return (
    <div className={cn('relative flex-shrink-0', sizeClasses[size], className)}>
      {/* Light theme logo - hidden in dark mode */}
      <Image
        src="/images/logo-light-theme.png"
        alt="Tax Genius Pro"
        width={width}
        height={height}
        className="object-contain dark:hidden"
        priority
      />
      {/* Dark theme logo - hidden in light mode */}
      <Image
        src="/images/logo-dark-theme.png"
        alt="Tax Genius Pro"
        width={width}
        height={height}
        className="object-contain hidden dark:block"
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
      {/* Light theme logo */}
      <Image
        src="/images/logo-light-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className="h-12 w-auto dark:hidden"
        priority
      />
      {/* Dark theme logo */}
      <Image
        src="/images/logo-dark-theme.png"
        alt="Tax Genius Pro"
        width={200}
        height={50}
        className="h-12 w-auto hidden dark:block"
        priority
      />
    </div>
  );
}
