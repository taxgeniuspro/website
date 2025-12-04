import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Link2,
  Trash2,
  Save,
  Upload,
  FileText,
} from 'lucide-react';

export const metadata = {
  title: 'Settings | Tax Genius Pro',
  description: 'Manage your affiliate settings',
};

async function isAffiliate() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'affiliate' || role === 'admin';
}

export default async function AffiliateSettingsPage() {
  const userIsAffiliate = await isAffiliate();

  if (!userIsAffiliate) {
    redirect('/forbidden');
  }

  const session = await auth(); const user = session?.user;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your affiliate account and preferences
          </p>
        </div>
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Your affiliate account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-2xl">
                {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" defaultValue={user?.firstName || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" defaultValue={user?.lastName || ''} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user?.emailAddresses[0]?.emailAddress || ''}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company/Website Name</Label>
              <Input id="company" placeholder="Your Company LLC" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website URL</Label>
            <Input id="website" type="url" placeholder="https://yourwebsite.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your website or platform..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            <CardTitle>Affiliate Program Settings</CardTitle>
          </div>
          <CardDescription>Manage your affiliate ID and tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="affiliateId">Affiliate ID</Label>
              <div className="flex gap-2">
                <Input id="affiliateId" defaultValue="AFF12345" className="font-mono" disabled />
                <Button variant="outline">Regenerate</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Current Tier</Label>
              <div className="flex gap-2 items-center h-10">
                <Badge className="bg-blue-100 text-blue-700 text-base px-4 py-2">
                  Standard - 20%
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="customSlug">Custom Affiliate Slug</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <span className="text-sm text-muted-foreground">taxgeniuspro.tax/aff/</span>
                <Input
                  id="customSlug"
                  placeholder="yourname"
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                />
              </div>
              <Button variant="outline">Check</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cookie Duration</Label>
              <p className="text-sm text-muted-foreground">
                30 days - Commissions tracked for 30 days after click
              </p>
            </div>
            <Badge variant="outline">30 Days</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose how you want to receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              label: 'New Lead Signups',
              description: 'Notify when someone clicks your affiliate link',
            },
            { label: 'Lead Conversions', description: 'Alert when a lead becomes a customer' },
            { label: 'Commission Earned', description: 'Notify when you earn a commission' },
            { label: 'Payout Processed', description: 'Alert when your payout is sent' },
            { label: 'Tier Upgrades', description: 'Notify when you reach a new commission tier' },
            { label: 'Weekly Performance Report', description: 'Receive weekly stats summary' },
            { label: 'Marketing Updates', description: 'New marketing materials available' },
          ].map((setting) => (
            <div key={setting.label}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{setting.label}</Label>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <Switch defaultChecked={!setting.label.includes('Marketing')} />
              </div>
              <Separator className="mt-4" />
            </div>
          ))}

          <div className="pt-4 space-y-2">
            <Label>Notification Delivery Method</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="email-notif" defaultChecked />
                <Label htmlFor="email-notif" className="font-normal">
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="sms-notif" />
                <Label htmlFor="sms-notif" className="font-normal">
                  SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="push-notif" defaultChecked />
                <Label htmlFor="push-notif" className="font-normal">
                  Push Notifications
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <CardTitle>Payment Settings</CardTitle>
          </div>
          <CardDescription>Manage how you receive commission payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Direct Deposit</p>
                <p className="text-sm text-muted-foreground">Bank Account •••• 4567</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">Active</Badge>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <CreditCard className="w-4 h-4 mr-2" />
            Update Payment Method
          </Button>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="payoutThreshold">Minimum Payout Threshold</Label>
            <Select defaultValue="100">
              <SelectTrigger id="payoutThreshold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">$50</SelectItem>
                <SelectItem value="100">$100</SelectItem>
                <SelectItem value="250">$250</SelectItem>
                <SelectItem value="500">$500</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Receive payouts when your balance reaches this amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payoutFrequency">Payout Frequency</Label>
            <Select defaultValue="monthly">
              <SelectTrigger id="payoutFrequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <CardTitle>Tax Information</CardTitle>
          </div>
          <CardDescription>Required for IRS reporting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID (EIN or SSN)</Label>
              <Input id="taxId" type="password" defaultValue="***-**-1234" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select>
                <SelectTrigger id="businessType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Business Name</Label>
            <Input id="legalName" placeholder="As registered with IRS" />
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">W-9 Form</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for payments over $600/year
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="w-3 h-3 mr-2" />
                  Upload W-9
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Privacy & Security</CardTitle>
          </div>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Change Password</Label>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
            <Button variant="outline" size="sm">
              Change
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>API Access</Label>
              <p className="text-sm text-muted-foreground">
                Generate API keys for tracking integration
              </p>
            </div>
            <Button variant="outline" size="sm">
              Generate Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Deactivate Affiliate Account</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily stop your affiliate links from working
              </p>
            </div>
            <Button variant="outline" size="sm">
              Deactivate
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
