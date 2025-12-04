import { businessTaxMetadata } from '@/lib/seo-llm/1-core-seo/metadata/service-pages-metadata';

export const metadata = businessTaxMetadata;

export default function BusinessTaxLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
