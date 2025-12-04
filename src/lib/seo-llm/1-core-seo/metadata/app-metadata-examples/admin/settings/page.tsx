import { Button } from '@/components/ui/button'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  Settings,
  Building,
  Bell,
  Shield,
  Palette,
  Printer,
  Mail,
  Truck,
  CreditCard,
  Webhook,
  Database,
  Save,
  RefreshCw,
  Upload,
  Download,
  Eye,
  EyeOff,
  Key,
  Zap,
} from 'lucide-react'
import { GeneralSettingsForm } from '@/components/admin/settings/general-settings-form'
import { NotificationSettingsForm } from '@/components/admin/settings/notification-settings-form'
import { PrintingSettingsForm } from '@/components/admin/settings/printing-settings-form'
import { PaymentSettingsForm } from '@/components/admin/settings/payment-settings-form'
import { ShippingSettingsForm } from '@/components/admin/settings/shipping-settings-form'
import { IntegrationSettingsForm } from '@/components/admin/settings/integration-settings-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure your printing business operations and system preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs className="space-y-4" defaultValue="general">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger className="flex items-center gap-2" value="general">
            <Building className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="printing">
            <Printer className="h-4 w-4" />
            Printing
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="payments">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="shipping">
            <Truck className="h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="notifications">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="integrations">
            <Webhook className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent className="space-y-4" value="general">
          <GeneralSettingsForm />
        </TabsContent>

        {/* Printing Settings Tab */}
        <TabsContent className="space-y-4" value="printing">
          <PrintingSettingsForm />
        </TabsContent>

        {/* Payment Settings Tab */}
        <TabsContent className="space-y-4" value="payments">
          <PaymentSettingsForm />
        </TabsContent>

        {/* Shipping Settings Tab */}
        <TabsContent className="space-y-4" value="shipping">
          <ShippingSettingsForm />
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent className="space-y-4" value="notifications">
          <NotificationSettingsForm />
        </TabsContent>

        {/* Integration Settings Tab */}
        <TabsContent className="space-y-4" value="integrations">
          <IntegrationSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
