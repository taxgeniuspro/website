import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Preparer Jobs New York NY - Earn $75k-$150k | Free Training | Tax Genius Pro',
  description: 'Become a tax preparer in New York, NY. Earn $75,000-$150,000 working from home. No experience needed - free 4-6 week training & certification. Apply today in Manhattan, Brooklyn, Queens. Call (404) 627-1015.',
  keywords: 'tax preparer jobs New York NY, tax preparer NYC, become tax preparer New York, tax professional training NYC, remote tax jobs New York, IRS certification NY, work from home New York, tax season jobs NYC',
  openGraph: {
    title: 'Tax Preparer Jobs in New York, NY - Earn $75k-$150k Annually',
    description: 'No experience needed. Free training & certification. Work remotely from home. Earn $75,000-$150,000 as a tax preparer in New York.',
    url: 'https://taxgeniuspro.tax/en/careers/tax-preparer/new-york-ny',
    siteName: 'Tax Genius Pro',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://taxgeniuspro.tax/og-image-en.jpg',
        width: 1200,
        height: 630,
        alt: 'Become a Tax Preparer in New York - Earn $75k-$150k',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tax Preparer Jobs New York NY - Free Training',
    description: 'Earn $75k-$150k as a tax preparer in New York. No experience needed. Free training included.',
    images: ['https://taxgeniuspro.tax/og-image-en.jpg'],
  },
  alternates: {
    canonical: 'https://taxgeniuspro.tax/en/careers/tax-preparer/new-york-ny',
    languages: {
      'en': 'https://taxgeniuspro.tax/en/careers/tax-preparer/new-york-ny',
      'es': 'https://taxgeniuspro.tax/es/careers/tax-preparer/new-york-ny',
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

export default function NewYorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
