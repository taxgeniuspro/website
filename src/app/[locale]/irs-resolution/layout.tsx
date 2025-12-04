import { irsResolutionMetadata } from '@/lib/seo-llm/1-core-seo/metadata/service-pages-metadata';

export const metadata = irsResolutionMetadata;

export default function IrsResolutionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
