import { startFilingMetadata } from '@/lib/seo-llm/1-core-seo/metadata/application-auth-metadata';

export const metadata = startFilingMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
