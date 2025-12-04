'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  UserPlus,
  Shield,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Phone,
} from 'lucide-react'
import { StaffTable } from '@/components/admin/staff/staff-table'
import { RolePermissionsTable } from '@/components/admin/staff/role-permissions-table'

import { AddStaffDialog } from '@/components/admin/staff/add-staff-dialog'

interface StaffMember {
  id: string
  name: string | null
  email: string
  role: string
  emailVerified: Date | null
  createdAt: Date
  lastLoginAt: Date | null
  isActive: boolean
  permissions: string[]
}

interface StaffData {
  staff: StaffMember[]
  roles: Array<{
    name: string
    count: number
    permissions: string[]
  }>
  stats: {
    total: number
    active: number
    pending: number
    admins: number
  }
  recentActivity: Array<{
    id: string
    userId: string
    userName: string
    action: string
    timestamp: Date
    details: string
  }>
}

function getPermissionsForRole(role: string): string[] {
  const permissions: { [key: string]: string[] } = {
    ADMIN: [
      'Manage Users',
      'Manage Products',
      'Manage Orders',
      'View Analytics',
      'Manage Settings',
      'Manage Vendors',
      'Manage Marketing',
      'View Financial Reports',
      'System Configuration',
    ],
    STAFF: ['View Users', 'Manage Products', 'Manage Orders', 'View Analytics', 'Customer Support'],
    CUSTOMER: ['View Products', 'Place Orders', 'View Order History'],
  }

  return permissions[role] || []
}

function StaffPageContent() {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'members'

  const [data, setData] = useState<StaffData>({
    staff: [],
    roles: [
      { name: 'ADMIN', count: 0, permissions: getPermissionsForRole('ADMIN') },
      { name: 'STAFF', count: 0, permissions: getPermissionsForRole('STAFF') },
    ],
    stats: { total: 0, active: 0, pending: 0, admins: 0 },
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch('/api/staff')
        if (response.ok) {
          const staffData = await response.json()
          setData(staffData)
        } else {
          // Use mock data if API fails
          setData({
            staff: [
              {
                id: '1',
                name: 'Admin User',
                email: 'admin@gangrunprinting.com',
                role: 'ADMIN',
                emailVerified: new Date(),
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
                permissions: getPermissionsForRole('ADMIN'),
              },
            ],
            roles: [
              { name: 'ADMIN', count: 1, permissions: getPermissionsForRole('ADMIN') },
              { name: 'STAFF', count: 0, permissions: getPermissionsForRole('STAFF') },
            ],
            stats: { total: 1, active: 1, pending: 0, admins: 1 },
            recentActivity: [
              {
                id: '1',
                userId: '1',
                userName: 'Admin User',
                action: 'Logged in',
                timestamp: new Date(),
                details: 'Successfully logged in',
              },
            ],
          })
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Role Settings
          </Button>
          <AddStaffDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total}</div>
            <p className="text-xs text-muted-foreground">{data.stats.admins} administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.active}</div>
            <p className="text-xs text-muted-foreground">Verified accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.admins}</div>
            <p className="text-xs text-muted-foreground">Full access members</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs className="space-y-4" defaultValue="members" value={currentTab}>
        <TabsList>
          <TabsTrigger value="members">Staff Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Staff Members Tab */}
        <TabsContent className="space-y-4" value="members">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>Manage team members and their access levels</CardDescription>
            </CardHeader>
            <CardContent>
              {data.staff.length > 0 ? (
                <StaffTable staff={data.staff} />
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No staff members yet</h3>
                  <p className="text-muted-foreground">Add your first team member to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent className="space-y-4" value="roles">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Role Overview</CardTitle>
                <CardDescription>Current role distribution and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.roles.map((role) => (
                  <div key={role.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={role.name === 'ADMIN' ? 'default' : 'secondary'}>
                          {role.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {role.count} member{role.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {role.permissions.slice(0, 3).join(', ')}
                      {role.permissions.length > 3 && ` +${role.permissions.length - 3} more`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>Detailed view of role permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {data.roles.length > 0 ? (
                  <RolePermissionsTable roles={data.roles} />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No roles configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent className="space-y-4" value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent actions performed by staff members</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between py-3 border-b"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{activity.action}</Badge>
                          <span className="text-sm font-medium">{activity.userName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No recent activity</h3>
                  <p className="text-muted-foreground">
                    Activity will appear here as staff members perform actions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <div className="text-center">Loading staff data...</div>
        </div>
      }
    >
      <StaffPageContent />
    </Suspense>
  )
}
