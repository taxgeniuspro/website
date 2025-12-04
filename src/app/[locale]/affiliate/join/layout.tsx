import { affiliateJoinMetadata } from '@/lib/seo-llm/1-core-seo/metadata/application-auth-metadata';

export const metadata = affiliateJoinMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
