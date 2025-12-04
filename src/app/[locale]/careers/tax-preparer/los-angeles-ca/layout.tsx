import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Preparer Jobs Los Angeles CA - Earn $75k-$150k | Free Training | Tax Genius Pro',
  description: 'Become a tax preparer in Los Angeles, CA. Earn $75,000-$150,000 working from home. No experience needed - free 4-6 week training & certification. Apply today in Hollywood, Downtown LA, Santa Monica. Call (404) 627-1015.',
  keywords: 'tax preparer jobs Los Angeles CA, tax preparer LA, become tax preparer California, tax professional training Los Angeles, remote tax jobs LA, IRS certification California, work from home Los Angeles, tax season jobs California',
  openGraph: {
    title: 'Tax Preparer Jobs in Los Angeles, CA - Earn $75k-$150k Annually',
    description: 'No experience needed. Free training & certification. Work remotely from home. Earn $75,000-$150,000 as a tax preparer in Los Angeles.',
    url: 'https://taxgeniuspro.tax/en/careers/tax-preparer/los-angeles-ca',
    siteName: 'Tax Genius Pro',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://taxgeniuspro.tax/og-image-en.jpg',
        width: 1200,
        height: 630,
        alt: 'Become a Tax Preparer in Los Angeles - Earn $75k-$150k',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tax Preparer Jobs Los Angeles CA - Free Training',
    description: 'Earn $75k-$150k as a tax preparer in Los Angeles. No experience needed. Free training included.',
    images: ['https://taxgeniuspro.tax/og-image-en.jpg'],
  },
  alternates: {
    canonical: 'https://taxgeniuspro.tax/en/careers/tax-preparer/los-angeles-ca',
    languages: {
      'en': 'https://taxgeniuspro.tax/en/careers/tax-preparer/los-angeles-ca',
      'es': 'https://taxgeniuspro.tax/es/careers/tax-preparer/los-angeles-ca',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function LosAngelesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
