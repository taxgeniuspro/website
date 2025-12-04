import { taxCalculatorMetadata } from '@/lib/seo-llm/1-core-seo/metadata/marketing-pages-metadata';

export const metadata = taxCalculatorMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
