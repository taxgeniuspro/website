import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: 'Get Your Taxes Done Fast | Tax Genius Pro',
  description:
    'Fast refunds, expert tax preparation, and professional service. Start your free tax quote today!',
  openGraph: {
    title: 'Get Your Taxes Done Fast | Tax Genius Pro',
    description:
      'Fast refunds, expert tax preparation, and professional service. Start your free tax quote today!',
    type: 'website',
    url: 'https://taxgeniuspro.tax/new',
    images: [
      {
        url: 'https://taxgeniuspro.tax/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Tax Genius Pro - Fast Tax Refunds',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Your Taxes Done Fast | Tax Genius Pro',
    description: 'Fast refunds and professional tax preparation service.',
    images: ['https://taxgeniuspro.tax/images/og-default.png'],
  },
};

export default function NewLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
