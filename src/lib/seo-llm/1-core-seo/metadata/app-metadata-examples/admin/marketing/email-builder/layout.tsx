'use client'

import { AdminAuthWrapper } from '@/components/admin/admin-auth-wrapper'

export default function EmailBuilderLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthWrapper>{children}</AdminAuthWrapper>
}
