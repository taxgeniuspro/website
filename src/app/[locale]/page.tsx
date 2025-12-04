import type { Metadata } from 'next';
import { LandingPageContent } from '@/components/home/LandingPageContent';
import { generateMetadata as genMeta } from '@/lib/seo-llm/1-core-seo/metadata/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return genMeta({
    title: 'Professional Tax Preparation & Filing Services | Tax Genius Pro',
    description:
      'Expert tax preparation services with guaranteed accuracy and maximum refunds. Personal tax filing, business tax services, tax planning, audit protection, and IRS resolution. Get started with certified tax professionals today.',
    keywords: [
      'tax preparation',
      'tax filing',
      'tax services',
      'professional tax preparer',
      'business tax',
      'personal tax',
      'tax expert',
      'tax professional',
      'tax refund',
      'IRS certified',
      'tax planning',
      'audit protection',
    ],
    url: '/',
    type: 'website',
    locale,
  });
}

export default function LandingPage() {
  return <LandingPageContent />;
}
