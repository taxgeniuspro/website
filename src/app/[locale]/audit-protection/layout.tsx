import { auditProtectionMetadata } from '@/lib/seo-llm/1-core-seo/metadata/service-pages-metadata';

export const metadata = auditProtectionMetadata;

export default function AuditProtectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
