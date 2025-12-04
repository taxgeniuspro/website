'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PlayCircle,
  CheckCircle,
  Clock,
  Search,
  GraduationCap,
  Award,
  BookOpen,
  FileText,
  Star,
  Filter,
  Loader2,
} from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  completed: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
}

export default function AcademyPage() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());

  // 🎛️ Check permissions
  const role = user?.role as UserRole | undefined;
  const permissions = role
    ? getUserPermissions(role, user?.permissions as any)
    : null;

  // Extract micro-permissions for academy features
  const canView = permissions?.academy_view ?? permissions?.academy ?? false;
  const canEnroll = permissions?.academy_enroll ?? permissions?.academy ?? false; // Access videos
  const canComplete = permissions?.academy_complete ?? permissions?.academy ?? false; // Mark as complete

  // Redirect if no access
  useEffect(() => {
    if (isLoaded && (!user || !permissions?.academy)) {
      redirect('/forbidden');
    }
  }, [isLoaded, user, permissions]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Training videos - Real Tax Genius training content
  const videos: Video[] = [
    {
      id: '1',
      title: 'The Basics of Tax Preparation',
      description:
        'This will give you the basics of Tax preparations. Comprehensive introduction to tax preparation fundamentals and the Tax Genius software.',
      duration: '90 min',
      thumbnail: 'https://img.youtube.com/vi/J1ebKU1YWnc/maxresdefault.jpg',
      videoUrl: 'https://www.youtube.com/embed/J1ebKU1YWnc',
      completed: false,
      difficulty: 'Beginner',
      category: 'Fundamentals',
    },
    {
      id: '2',
      title: 'Tax Genius Software Mobile App and Portal',
      description:
        "Gain valuable insights into the Tax Genius Software through the lens of customers as we explore both the mobile app and portal functionalities. Understand the features and convenience from a customer's viewpoint.",
      duration: '101 min',
      thumbnail: 'https://img.youtube.com/vi/z6KrrDK1KkY/maxresdefault.jpg',
      videoUrl: 'https://www.youtube.com/embed/z6KrrDK1KkY',
      completed: false,
      difficulty: 'Intermediate',
      category: 'Software Training',
    },
    {
      id: '3',
      title: 'Tax Genius Software Full Return Demo',
      description:
        'A comprehensive journey through the Tax Genius Software from start to finish, including payments and banking products. This walkthrough covers the complete spectrum of tax preparation.',
      duration: '66 min',
      thumbnail: 'https://img.youtube.com/vi/rxWy8O4Gqvc/maxresdefault.jpg',
      videoUrl: 'https://www.youtube.com/embed/rxWy8O4Gqvc',
      completed: false,
      difficulty: 'Intermediate',
      category: 'Software Training',
    },
    {
      id: '4',
      title: 'Tax Genius Software Login, Dashboard and Sections',
      description:
        "Explore the Tax Genius Software seamlessly from the login phase to navigating the dashboard and understanding the different sections. Ensure you have a comprehensive grasp of the Tax Genius Software's interface.",
      duration: '45 min',
      thumbnail: 'https://img.youtube.com/vi/LjEWXwKdxGw/maxresdefault.jpg',
      videoUrl: 'https://www.youtube.com/embed/LjEWXwKdxGw',
      completed: false,
      difficulty: 'Beginner',
      category: 'Software Training',
    },
    {
      id: '5',
      title: 'Tax Genius Complimentary Vacations',
      description:
        'Our Travel Partner Redeem Vacations has joined us to provide you with a complimentary vacation to destinations including Cancun, Cabo San Lucas, Puerto Vallarta, Las Vegas, Phuket, Kuta & Dubai when you hire us to help you with your taxes.',
      duration: '15 min',
      thumbnail: 'https://img.youtube.com/vi/ni_RRH39MB0/maxresdefault.jpg',
      videoUrl: 'https://www.youtube.com/embed/ni_RRH39MB0',
      completed: false,
      difficulty: 'Beginner',
      category: 'Client Benefits',
    },
    {
      id: '6',
      title: 'Tax Genius Complimentary Vacations (Extended)',
      description:
        'Extended version: Our Travel Partner Redeem Vacations provides complimentary vacations to popular destinations when you use our tax services. Learn how to present this benefit to clients.',
      duration: '20 min',
      thumbnail: 'https://img.youtube.com/vi/Br8UqmAA5l8/maxresdefault.jpg',
      videoUrl: 'https://www.youtube.com/embed/Br8UqmAA5l8',
      completed: false,
      difficulty: 'Beginner',
      category: 'Client Benefits',
    },
  ];

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalVideos = videos.length;
  const watchedVideos = completedVideos.size;
  const progressPercentage = (watchedVideos / totalVideos) * 100;

  const handleMarkComplete = (videoId: string) => {
    setCompletedVideos((prev) => new Set([...prev, videoId]));
  };

  const handleWatchVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Advanced':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              Tax Preparer Academy
            </h1>
            <p className="text-muted-foreground mt-1">
              Master tax preparation with our comprehensive training videos
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Award className="mr-2 h-4 w-4" />
            {watchedVideos}/{totalVideos} Complete
          </Badge>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Track your learning journey through the academy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Completion</span>
                <span className="font-semibold">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {progressPercentage === 100 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Congratulations! Course Complete
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      You've completed all training videos. Download your certificate below.
                    </p>
                  </div>
                </div>
                <Button className="w-full mt-4" size="lg">
                  <Award className="mr-2 h-4 w-4" />
                  Download Certificate
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{watchedVideos}</p>
                <p className="text-xs text-muted-foreground">Videos Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalVideos - watchedVideos}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {videos.reduce((acc, v) => {
                    const minutes = parseInt(v.duration.replace(/\D/g, ''));
                    return acc + (isNaN(minutes) ? 0 : minutes);
                  }, 0)}{' '}
                  min
                </p>
                <p className="text-xs text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Video Library */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => {
            const isCompleted = completedVideos.has(video.id);

            return (
              <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors cursor-pointer group"
                    onClick={() => handleWatchVideo(video)}
                  >
                    <PlayCircle className="h-16 w-16 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  {isCompleted && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="bg-black/60 text-white">
                      <Clock className="h-3 w-3 mr-1" />
                      {video.duration}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base line-clamp-2">{video.title}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getDifficultyColor(video.difficulty)} variant="outline">
                      {video.difficulty}
                    </Badge>
                    <Badge variant="outline">{video.category}</Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <CardDescription className="line-clamp-2 mb-4">
                    {video.description}
                  </CardDescription>

                  <div className="flex gap-2">
                    {canView && (
                      <Button className="flex-1" onClick={() => handleWatchVideo(video)}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Watch
                      </Button>
                    )}
                    {canComplete && !isCompleted && (
                      <Button variant="outline" onClick={() => handleMarkComplete(video.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredVideos.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No videos found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your search query</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Resources
            </CardTitle>
            <CardDescription>Supplementary materials to enhance your learning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto py-4">
                <FileText className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <p className="font-semibold">Tax Preparation Handbook</p>
                  <p className="text-xs text-muted-foreground">Comprehensive PDF guide</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4">
                <Star className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <p className="font-semibold">Quick Reference Sheet</p>
                  <p className="text-xs text-muted-foreground">Key formulas and tables</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4">
                <BookOpen className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <p className="font-semibold">IRS Publication Library</p>
                  <p className="text-xs text-muted-foreground">Official IRS documents</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4">
                <GraduationCap className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <p className="font-semibold">Practice Scenarios</p>
                  <p className="text-xs text-muted-foreground">Test your knowledge</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Player Dialog */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo.title}</DialogTitle>
              <DialogDescription>{selectedVideo.description}</DialogDescription>
            </DialogHeader>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={selectedVideo.videoUrl}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-2">
                <Badge className={getDifficultyColor(selectedVideo.difficulty)}>
                  {selectedVideo.difficulty}
                </Badge>
                <Badge variant="outline">{selectedVideo.duration}</Badge>
              </div>
              <Button
                onClick={() => {
                  handleMarkComplete(selectedVideo.id);
                  setSelectedVideo(null);
                }}
                disabled={completedVideos.has(selectedVideo.id)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {completedVideos.has(selectedVideo.id) ? 'Completed' : 'Mark as Complete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
