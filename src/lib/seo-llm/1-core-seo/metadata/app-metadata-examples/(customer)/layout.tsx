import CustomerLayout from '@/components/customer/customer-layout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>
}
