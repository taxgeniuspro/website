import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  Video,
  FileText,
  Upload,
  PlayCircle,
  Download,
  BookOpen,
  Users,
  Clock,
  Award,
} from 'lucide-react';

export default async function LearningCenterPage() {
  const session = await auth(); const user = session?.user;
  if (!user) redirect('/auth/signin');

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as any;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  if (!permissions.learningCenter) redirect('/forbidden');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="w-8 h-8" />
              Learning Center
            </h1>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Content
            </Button>
          </div>
          <p className="text-muted-foreground">Training hub for staff and client education</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">Available courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
              <Video className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Training videos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">Resources</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
              <Users className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Training Courses</CardTitle>
                <CardDescription>Structured learning paths for staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Tax Preparation Basics',
                      modules: 8,
                      duration: '4 hours',
                      level: 'Beginner',
                    },
                    {
                      title: 'Advanced Tax Strategies',
                      modules: 12,
                      duration: '6 hours',
                      level: 'Advanced',
                    },
                    {
                      title: 'Client Communication',
                      modules: 5,
                      duration: '2 hours',
                      level: 'All Levels',
                    },
                    {
                      title: 'Software Training',
                      modules: 10,
                      duration: '3 hours',
                      level: 'Beginner',
                    },
                  ].map((course) => (
                    <div key={course.title} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <Badge>{course.level}</Badge>
                      </div>
                      <h3 className="font-medium mb-2">{course.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span>{course.modules} modules</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.duration}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          View
                        </Button>
                        <Button size="sm" className="flex-1">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle>Training Videos</CardTitle>
                <CardDescription>Video tutorials and webinars</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: 'Getting Started with Tax Genius', duration: '15:30', views: 234 },
                    { title: 'Understanding Form 1040', duration: '28:45', views: 189 },
                    { title: 'Client Onboarding Process', duration: '12:15', views: 156 },
                    { title: 'Using the Document Scanner', duration: '8:20', views: 92 },
                  ].map((video) => (
                    <div
                      key={video.title}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <PlayCircle className="w-10 h-10 text-primary" />
                        <div>
                          <p className="font-medium">{video.title}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{video.duration}</span>
                            <span>{video.views} views</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                        <Button size="sm">Watch</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents & Resources</CardTitle>
                <CardDescription>Downloadable training materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: 'Tax Preparer Handbook', type: 'PDF', size: '2.4 MB' },
                    { title: 'IRS Guidelines 2024', type: 'PDF', size: '5.1 MB' },
                    { title: 'Client FAQ Template', type: 'DOCX', size: '245 KB' },
                    { title: 'Tax Forms Checklist', type: 'PDF', size: '180 KB' },
                  ].map((doc) => (
                    <div
                      key={doc.title}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type} • {doc.size}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms">
            <Card>
              <CardHeader>
                <CardTitle>Forms & Templates</CardTitle>
                <CardDescription>Standardized forms for various purposes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    'Client Intake Form',
                    'Tax Organizer',
                    'Engagement Letter',
                    'Privacy Policy',
                    'Power of Attorney',
                    'Extension Request',
                  ].map((form) => (
                    <div key={form} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="font-medium">{form}</span>
                        </div>
                        <div className="space-x-2">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
