'use client';

import { AchievementsList } from '@/components/gamification/AchievementsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TaxPreparerAchievementsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard/tax-preparer">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500" />
            Your Achievements
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Track your progress and unlock rewards as you grow your tax preparation business
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Earn XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete achievements to earn XP and level up your profile. Higher levels unlock exclusive benefits.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-500" />
              Show Your Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Achievements showcase your expertise to clients. Display your badges to build trust and credibility.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Compete & Win
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Climb the leaderboards and compete with other preparers. Win contests and earn special achievement badges.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements List */}
      <AchievementsList />
    </div>
  );
}
