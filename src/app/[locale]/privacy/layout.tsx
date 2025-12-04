import { privacyMetadata } from '@/lib/seo-llm/1-core-seo/metadata/marketing-pages-metadata';

export const metadata = privacyMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
