import { verifyMetadata } from '@/lib/seo-llm/1-core-seo/metadata/application-auth-metadata';

export const metadata = verifyMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
