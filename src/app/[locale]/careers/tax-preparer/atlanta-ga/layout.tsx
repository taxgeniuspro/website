import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Preparer Jobs Atlanta GA - Earn $75k-$150k | Free Training | Tax Genius Pro',
  description: 'Become a tax preparer in Atlanta, GA. Earn $75,000-$150,000 working from home. No experience needed - free 4-6 week training & certification. Apply today in Buckhead, Midtown, Downtown Atlanta. Call (404) 627-1015.',
  keywords: 'tax preparer jobs Atlanta GA, tax preparer Atlanta, become tax preparer Georgia, tax professional training Atlanta, remote tax jobs Atlanta, IRS certification Georgia, work from home Atlanta, tax season jobs Georgia',
  openGraph: {
    title: 'Tax Preparer Jobs in Atlanta, GA - Earn $75k-$150k Annually',
    description: 'No experience needed. Free training & certification. Work remotely from home. Earn $75,000-$150,000 as a tax preparer in Atlanta.',
    url: 'https://taxgeniuspro.tax/en/careers/tax-preparer/atlanta-ga',
    siteName: 'Tax Genius Pro',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://taxgeniuspro.tax/og-image-en.jpg',
        width: 1200,
        height: 630,
        alt: 'Become a Tax Preparer in Atlanta - Earn $75k-$150k',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tax Preparer Jobs Atlanta GA - Free Training',
    description: 'Earn $75k-$150k as a tax preparer in Atlanta. No experience needed. Free training included.',
    images: ['https://taxgeniuspro.tax/og-image-en.jpg'],
  },
  alternates: {
    canonical: 'https://taxgeniuspro.tax/en/careers/tax-preparer/atlanta-ga',
    languages: {
      'en': 'https://taxgeniuspro.tax/en/careers/tax-preparer/atlanta-ga',
      'es': 'https://taxgeniuspro.tax/es/careers/tax-preparer/atlanta-ga',
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

export default function AtlantaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
