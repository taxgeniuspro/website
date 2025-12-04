import { securityMetadata } from '@/lib/seo-llm/1-core-seo/metadata/marketing-pages-metadata';

export const metadata = securityMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
