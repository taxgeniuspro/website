import { servicesMetadata } from '@/lib/seo-llm/1-core-seo/metadata/service-pages-metadata';

export const metadata = servicesMetadata;

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
