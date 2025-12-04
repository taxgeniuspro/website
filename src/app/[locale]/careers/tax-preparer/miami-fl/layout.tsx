import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Preparer Jobs Miami FL - Earn $75k-$150k | Free Training | Tax Genius Pro',
  description: 'Become a tax preparer in Miami, FL. Earn $75,000-$150,000 working from home. No experience needed - free 4-6 week training & certification. Apply today in South Beach, Brickell, Wynwood. Call (404) 627-1015.',
  keywords: 'tax preparer jobs Miami FL, tax preparer Miami, become tax preparer Florida, tax professional training Miami, remote tax jobs Miami, IRS certification Miami, work from home Miami, tax season jobs Florida',
  openGraph: {
    title: 'Tax Preparer Jobs in Miami, FL - Earn $75k-$150k Annually',
    description: 'No experience needed. Free training & certification. Work remotely from home. Earn $75,000-$150,000 as a tax preparer in Miami.',
    url: 'https://taxgeniuspro.tax/en/careers/tax-preparer/miami-fl',
    siteName: 'Tax Genius Pro',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://taxgeniuspro.tax/og-image-en.jpg',
        width: 1200,
        height: 630,
        alt: 'Become a Tax Preparer in Miami - Earn $75k-$150k',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tax Preparer Jobs Miami FL - Free Training',
    description: 'Earn $75k-$150k as a tax preparer in Miami. No experience needed. Free training included.',
    images: ['https://taxgeniuspro.tax/og-image-en.jpg'],
  },
  alternates: {
    canonical: 'https://taxgeniuspro.tax/en/careers/tax-preparer/miami-fl',
    languages: {
      'en': 'https://taxgeniuspro.tax/en/careers/tax-preparer/miami-fl',
      'es': 'https://taxgeniuspro.tax/es/careers/tax-preparer/miami-fl',
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

export default function MiamiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
