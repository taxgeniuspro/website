import { startFilingFormMetadata } from '@/lib/seo-llm/1-core-seo/metadata/application-auth-metadata';

export const metadata = startFilingFormMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
