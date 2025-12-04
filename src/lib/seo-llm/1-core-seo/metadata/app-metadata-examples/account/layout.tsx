import CustomerLayout from '@/components/customer/customer-layout'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>
}
