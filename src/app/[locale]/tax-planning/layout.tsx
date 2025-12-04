import { taxPlanningMetadata } from '@/lib/seo-llm/1-core-seo/metadata/service-pages-metadata';

export const metadata = taxPlanningMetadata;

export default function TaxPlanningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
