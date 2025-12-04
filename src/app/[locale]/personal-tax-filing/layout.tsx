import { personalTaxMetadata } from '@/lib/seo-llm/1-core-seo/metadata/service-pages-metadata';

export const metadata = personalTaxMetadata;

export default function PersonalTaxFilingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
