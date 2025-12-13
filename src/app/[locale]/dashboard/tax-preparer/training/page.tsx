'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, PlayCircle, CheckCircle, Clock, BookOpen, Award } from 'lucide-react';

const trainingModules = [
  {
    id: 1,
    title: 'Getting Started with Tax Genius Pro',
    description: 'Learn the basics of navigating the platform and setting up your profile.',
    duration: '15 min',
    completed: true,
    lessons: 5,
  },
  {
    id: 2,
    title: 'Client Management Best Practices',
    description: 'How to effectively manage your client relationships and documents.',
    duration: '25 min',
    completed: true,
    lessons: 8,
  },
  {
    id: 3,
    title: 'Using the File Center',
    description: 'Master the file upload, organization, and sharing features.',
    duration: '20 min',
    completed: false,
    lessons: 6,
  },
  {
    id: 4,
    title: 'Marketing Your Services',
    description: 'Learn how to use tracking codes, QR codes, and referral links effectively.',
    duration: '30 min',
    completed: false,
    lessons: 10,
  },
  {
    id: 5,
    title: 'Tax Filing Workflow',
    description: 'Step-by-step guide to the complete tax filing process.',
    duration: '45 min',
    completed: false,
    lessons: 12,
  },
];

export default function TrainingPage() {
  const completedCount = trainingModules.filter(m => m.completed).length;
  const progressPercent = (completedCount / trainingModules.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Training Center</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Complete training modules to become a certified Tax Genius Pro preparer
              </p>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Your Progress
            </CardTitle>
            <CardDescription>
              {completedCount} of {trainingModules.length} modules completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {progressPercent.toFixed(0)}% complete - Keep going!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Training Modules */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Training Modules</h2>
          <div className="grid gap-4">
            {trainingModules.map((module) => (
              <Card key={module.id} className={module.completed ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${module.completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                        {module.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <BookOpen className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{module.title}</h3>
                          {module.completed && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {module.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {module.lessons} lessons
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={module.completed ? 'outline' : 'default'}
                      className="shrink-0"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {module.completed ? 'Review' : 'Start'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Certification Info */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-4 rounded-full bg-primary/20">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Earn Your Certification</h3>
                <p className="text-sm text-muted-foreground">
                  Complete all training modules to receive your Tax Genius Pro Certified Preparer badge.
                  This certification demonstrates your expertise to potential clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
