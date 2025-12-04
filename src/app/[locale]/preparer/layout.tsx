import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo-llm/1-core-seo/metadata/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return genMeta({
    title: 'For Tax Preparers - Partner With Tax Genius Pro',
    description:
      'Partner with Tax Genius Pro and grow your tax preparation business. Access our client network, marketing tools, and technology platform. Learn about preparer benefits and opportunities.',
    keywords: [
      'tax preparer partners',
      'tax professional network',
      'preparer opportunities',
      'tax business growth',
    ],
    url: '/preparer',
    locale,
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
