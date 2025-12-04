import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Megaphone,
  Image,
  FileText,
  QrCode,
  Share2,
  Download,
  Eye,
  Copy,
  Printer,
  TrendingUp,
} from 'lucide-react';

export default async function MarketingHubPage() {
  const session = await auth(); const user = session?.user;
  if (!user) redirect('/auth/signin');

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as any;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  if (!permissions.marketingHub) redirect('/forbidden');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="w-8 h-8" />
              Marketing Hub
            </h1>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Create Material
            </Button>
          </div>
          <p className="text-muted-foreground">
            Central hub for all marketing materials and campaigns
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Materials</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Total assets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">QR Codes</CardTitle>
              <QrCode className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">Active codes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Downloads</CardTitle>
              <Download className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Shares</CardTitle>
              <Share2 className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">892</div>
              <p className="text-xs text-muted-foreground">Social shares</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="qrcodes">QR Codes</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="content">Tax Genius Content</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Materials</CardTitle>
                <CardDescription>Printable and digital marketing assets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: 'Tax Season Flyer', type: 'PDF', downloads: 234 },
                    { title: 'Business Card Template', type: 'PDF', downloads: 189 },
                    { title: 'Social Media Pack', type: 'ZIP', downloads: 156 },
                    { title: 'Email Templates', type: 'HTML', downloads: 98 },
                    { title: 'Window Poster', type: 'PDF', downloads: 67 },
                    { title: 'Referral Cards', type: 'PDF', downloads: 145 },
                  ].map((material) => (
                    <div key={material.title} className="border rounded-lg p-4">
                      <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                        <Image className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-1">{material.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {material.type} • {material.downloads} downloads
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button size="sm" className="flex-1">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qrcodes">
            <Card>
              <CardHeader>
                <CardTitle>QR Code Generator</CardTitle>
                <CardDescription>Create trackable QR codes for marketing materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 border rounded-lg">
                  <h3 className="font-medium mb-4">Generate New QR Code</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Campaign Name</label>
                      <input
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        placeholder="Spring Tax Campaign"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Destination URL</label>
                      <input
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        placeholder="https://taxgenius.com/spring"
                      />
                    </div>
                  </div>
                  <Button className="mt-4">
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Recent QR Codes</h3>
                  {[
                    { name: 'Spring Campaign', scans: 456, created: '2 days ago' },
                    { name: 'Referral Program', scans: 234, created: '1 week ago' },
                    { name: 'Walk-in Special', scans: 189, created: '2 weeks ago' },
                  ].map((qr) => (
                    <div
                      key={qr.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black rounded flex items-center justify-center">
                          <QrCode className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{qr.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {qr.scans} scans • Created {qr.created}
                          </p>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Templates</CardTitle>
                <CardDescription>Customizable templates for various campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    'Email Campaign Template',
                    'Social Media Post Templates',
                    'Print Advertisement',
                    'Business Card Design',
                    'Brochure Template',
                    'Banner Design',
                  ].map((template) => (
                    <div key={template} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{template}</p>
                            <p className="text-xs text-muted-foreground">Last updated 3 days ago</p>
                          </div>
                        </div>
                        <div className="space-x-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Tax Genius Content</CardTitle>
                <CardDescription>Branded content and resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Share Buttons</h3>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Facebook
                      </Button>
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Twitter
                      </Button>
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        LinkedIn
                      </Button>
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Instagram
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Downloadable Resources</h3>
                    <div className="space-y-3">
                      {[
                        'Tax Preparation Checklist',
                        'Deduction Guide 2024',
                        'Small Business Tax Tips',
                        'First-Time Filer Guide',
                      ].map((resource) => (
                        <div
                          key={resource}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <span>{resource}</span>
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Print Materials</h3>
                    <Button variant="outline">
                      <Printer className="w-4 h-4 mr-2" />
                      Print Marketing Kit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
