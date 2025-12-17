import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preseason Tax Advance - Get Up to $7,000 | Tax Genius Pro',
  description:
    'Get up to $7,000 preseason tax advance starting January 2, 2025. No credit check, same-day funding available. Apply now with Tax Genius Pro!',
  keywords: [
    'preseason tax advance',
    'tax advance',
    'refund advance',
    'early tax refund',
    '$7000 advance',
    'no credit check tax advance',
    'same day tax advance',
    'Atlanta tax preparer',
    'Tax Genius Pro',
  ],
  openGraph: {
    title: 'Get Up to $7,000 Preseason Tax Advance | Tax Genius Pro',
    description:
      'Need cash fast? Get up to $7,000 preseason advance on your tax refund starting January 2. No credit check, same-day funding. Apply now!',
    type: 'website',
    images: [
      {
        url: '/og-cash-advance.jpg',
        width: 1200,
        height: 630,
        alt: 'Tax Genius Pro - Get Up to $7,000 Tax Advance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Up to $7,000 Preseason Tax Advance | Tax Genius Pro',
    description:
      'Need cash fast? Get up to $7,000 preseason advance on your tax refund. No credit check, same-day funding available.',
    images: ['/og-cash-advance.jpg'],
  },
};

export default function CashAdvanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
