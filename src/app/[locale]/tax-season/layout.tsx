import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tax Season 2025 - Get Up to $7,000 | Tax Genius Pro',
  description:
    'Tax Season 2025 is here! Get up to $7,000 preseason tax advance starting January 2. Professional tax preparation services. Apply now with Tax Genius Pro!',
  keywords: [
    'tax season 2025',
    'tax advance',
    'tax preparation',
    'refund advance',
    '$7000 advance',
    'Atlanta tax preparer',
    'Tax Genius Pro',
  ],
};

export default function TaxSeasonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
