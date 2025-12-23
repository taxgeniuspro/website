'use client';

import Image from 'next/image';

interface ReferralBannerProps {
  preparerName: string;
  preparerAvatar?: string | null;
  message?: string;
  className?: string;
}

/**
 * ReferralBanner - Displays a personalized message with the tax preparer's photo
 * Used on public forms (contact, cash-advance, start-filing, book)
 *
 * Shows: "[Photo] [Name] will help you with your taxes"
 */
export function ReferralBanner({
  preparerName,
  preparerAvatar,
  message,
  className = '',
}: ReferralBannerProps) {
  // Generate initials for fallback avatar
  const initials = preparerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayMessage = message || `${preparerName} will help you with your taxes`;

  return (
    <div
      className={`flex items-center gap-4 p-4 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20 ${className}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {preparerAvatar ? (
          <Image
            src={preparerAvatar}
            alt={preparerName}
            width={64}
            height={64}
            className="rounded-full object-cover border-2 border-primary/30"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
            <span className="text-xl font-semibold text-primary">{initials}</span>
          </div>
        )}
      </div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-lg font-medium text-foreground">{displayMessage}</p>
      </div>
    </div>
  );
}

export default ReferralBanner;
