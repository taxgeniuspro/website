import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Preparer Jobs Houston TX - Earn $75k-$150k | Free Training | Tax Genius Pro',
  description: 'Become a tax preparer in Houston, TX. Earn $75,000-$150,000 working from home. No experience needed - free 4-6 week training & certification. Apply today in Downtown Houston, The Woodlands, Sugar Land. Call (404) 627-1015.',
  keywords: 'tax preparer jobs Houston TX, tax preparer Houston, become tax preparer Texas, tax professional training Houston, remote tax jobs Houston, IRS certification Texas, work from home Houston, tax season jobs Texas',
  openGraph: {
    title: 'Tax Preparer Jobs in Houston, TX - Earn $75k-$150k Annually',
    description: 'No experience needed. Free training & certification. Work remotely from home. Earn $75,000-$150,000 as a tax preparer in Houston.',
    url: 'https://taxgeniuspro.tax/en/careers/tax-preparer/houston-tx',
    siteName: 'Tax Genius Pro',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://taxgeniuspro.tax/og-image-en.jpg',
        width: 1200,
        height: 630,
        alt: 'Become a Tax Preparer in Houston - Earn $75k-$150k',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tax Preparer Jobs Houston TX - Free Training',
    description: 'Earn $75k-$150k as a tax preparer in Houston. No experience needed. Free training included.',
    images: ['https://taxgeniuspro.tax/og-image-en.jpg'],
  },
  alternates: {
    canonical: 'https://taxgeniuspro.tax/en/careers/tax-preparer/houston-tx',
    languages: {
      'en': 'https://taxgeniuspro.tax/en/careers/tax-preparer/houston-tx',
      'es': 'https://taxgeniuspro.tax/es/careers/tax-preparer/houston-tx',
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

export default function HoustonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
