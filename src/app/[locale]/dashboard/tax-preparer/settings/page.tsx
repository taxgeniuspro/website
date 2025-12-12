import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
  Award,
  Trash2,
  Save,
  Upload,
  FileText,
  Clock,
} from 'lucide-react';
import { MarketingContactForm } from '@/components/settings/MarketingContactForm';
import { AvailabilitySettings } from '@/components/settings/AvailabilitySettings';

export const metadata = {
  title: 'Settings | Tax Genius Pro',
  description: 'Manage your tax preparer settings',
};

async function checkAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user) return { hasAccess: false, profileId: null };

  const role = user?.role;
  const hasAccess = role === 'tax_preparer' || role === 'admin' || role === 'super_admin';

  if (!hasAccess) return { hasAccess: false, profileId: null };

  // Get profile ID
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return { hasAccess, profileId: profile?.id || null };
}

export default async function TaxPreparerSettingsPage() {
  const { hasAccess, profileId } = await checkAccess();

  if (!hasAccess) {
    redirect('/forbidden');
  }

  const session = await auth();
  const user = session?.user;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Preparer Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your professional profile and preferences
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
            <CardTitle>Professional Profile</CardTitle>
          </div>
          <CardDescription>Your public profile visible to clients</CardDescription>
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
            <div className="space-y-2 flex-1">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>

              {/* QR Code Branding Option */}
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="usePhotoInQRCodes" />
                <Label htmlFor="usePhotoInQRCodes" className="text-sm font-normal cursor-pointer">
                  Use this photo in your QR codes
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Your profile photo will appear in QR codes for promotional materials and lead pages
                  </span>
                </Label>
              </div>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="est">
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="est">Eastern Time (ET)</SelectItem>
                  <SelectItem value="cst">Central Time (CT)</SelectItem>
                  <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                  <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell clients about your experience and expertise..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Credentials */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            <CardTitle>Credentials & Certifications</CardTitle>
          </div>
          <CardDescription>Your professional qualifications and licenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ptin">PTIN Number</Label>
              <Input id="ptin" placeholder="P12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credential">Professional Credential</Label>
              <Select>
                <SelectTrigger id="credential">
                  <SelectValue placeholder="Select credential" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpa">CPA</SelectItem>
                  <SelectItem value="ea">EA (Enrolled Agent)</SelectItem>
                  <SelectItem value="attorney">Tax Attorney</SelectItem>
                  <SelectItem value="ara">Annual Filing Season Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license">License Number</Label>
              <Input id="license" placeholder="License #" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Licensed State</Label>
              <Select>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GA">Georgia</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Years of Experience</Label>
            <Select defaultValue="5-10">
              <SelectTrigger id="experience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-2">0-2 years</SelectItem>
                <SelectItem value="3-5">3-5 years</SelectItem>
                <SelectItem value="5-10">5-10 years</SelectItem>
                <SelectItem value="10+">10+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialties">Specialties</Label>
            <Textarea
              id="specialties"
              placeholder="List your areas of expertise (e.g., Small business, Real estate, International tax)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Hours & Availability Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <CardTitle>Work Hours & Availability</CardTitle>
          </div>
          <CardDescription>Configure your schedule and booking preferences</CardDescription>
        </CardHeader>
        <CardContent>
          {profileId ? (
            <AvailabilitySettings profileId={profileId} />
          ) : (
            <p className="text-muted-foreground">Unable to load availability settings. Please refresh the page.</p>
          )}
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
            { label: 'New Client Assignments', description: 'Notify when assigned a new client' },
            { label: 'Document Uploads', description: 'Alert when clients upload documents' },
            { label: 'Client Messages', description: 'Notify when clients send messages' },
            { label: 'Payment Notifications', description: 'Alert when you receive payments' },
            { label: 'Deadline Reminders', description: 'Remind me of upcoming tax deadlines' },
            { label: 'Marketing Updates', description: 'Receive platform updates and tips' },
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
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <CardTitle>Payment Settings</CardTitle>
          </div>
          <CardDescription>Manage how you receive payments</CardDescription>
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
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <CardTitle>Professional Documents</CardTitle>
          </div>
          <CardDescription>Upload required licenses and certifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Professional License</p>
                <p className="text-xs text-muted-foreground">Uploaded 3 months ago</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">E&O Insurance</p>
                <p className="text-xs text-muted-foreground">Uploaded 1 month ago</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Upload New Document
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Security & Privacy</CardTitle>
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
        </CardContent>
      </Card>

      {/* Marketing Contact Information */}
      <MarketingContactForm />

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
              <Label>Deactivate Professional Account</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily stop accepting new clients
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
