import { redirect } from 'next/navigation'

export default function AdminPage() {
  // Redirect to the dashboard page which has real data
  redirect('/admin/dashboard')
}
