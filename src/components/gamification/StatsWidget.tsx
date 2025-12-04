'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Star,
  Flame,
  TrendingUp,
  Award,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GamificationStats {
  stats: {
    totalXP: number;
    level: number;
    currentLevelXP: number;
    nextLevelXP: number;
    loginStreak: number;
    longestLoginStreak: number;
  };
  achievements: {
    unlocked: number;
    total: number;
    new: number;
    recent: Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      icon: string;
      rarity: string;
      points: number;
      badgeColor: string;
      unlockedAt: string;
      viewed: boolean;
    }>;
  };
}

interface StatsWidgetProps {
  userId: string;
  role: 'TAX_PREPARER' | 'AFFILIATE' | 'REFERRER' | 'CLIENT';
  compact?: boolean; // For smaller displays
}

export function StatsWidget({ userId, role, compact = false }: StatsWidgetProps) {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/gamification/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const progressPercent =
    (stats.stats.currentLevelXP / stats.stats.nextLevelXP) * 100;

  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Level */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-foreground">
                    {stats.stats.level}
                  </span>
                </div>
                {stats.achievements.new > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {stats.achievements.new}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Level {stats.stats.level}</span>
                  {stats.stats.loginStreak > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {stats.stats.loginStreak}
                    </Badge>
                  )}
                </div>
                <Progress value={progressPercent} className="h-2 mt-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.stats.currentLevelXP} / {stats.stats.nextLevelXP} XP
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-xs">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span className="font-medium">{stats.achievements.unlocked}</span>
                <span className="text-muted-foreground">/{stats.achievements.total}</span>
              </div>
              <Link href={`/dashboard/${role.toLowerCase().replace(/_/g, '-')}/achievements`}>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  View All
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Your Progress</span>
          </div>
          {stats.achievements.new > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {stats.achievements.new} New!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level & XP Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-primary-foreground">
                  {stats.stats.level}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Level {stats.stats.level}</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.stats.totalXP.toLocaleString()} Total XP
                </p>
              </div>
            </div>
            {stats.stats.loginStreak > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold text-orange-500">
                    {stats.stats.loginStreak}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            )}
          </div>

          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">
              {stats.stats.currentLevelXP} XP
            </span>
            <span className="font-medium">
              {stats.stats.nextLevelXP - stats.stats.currentLevelXP} XP to Level{' '}
              {stats.stats.level + 1}
            </span>
          </div>
        </div>

        {/* Achievement Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/60 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Achievements</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.achievements.unlocked}
              <span className="text-sm text-muted-foreground font-normal">
                /{stats.achievements.total}
              </span>
            </p>
          </div>

          <div className="bg-background/60 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Best Streak</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.stats.longestLoginStreak}
              <span className="text-sm text-muted-foreground font-normal"> days</span>
            </p>
          </div>
        </div>

        {/* Recent Achievements */}
        {stats.achievements.recent.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Recent Achievements
            </h4>
            <div className="space-y-2">
              {stats.achievements.recent.slice(0, 3).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 bg-background/60 rounded-lg border hover:border-primary/40 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: achievement.badgeColor + '20' }}
                  >
                    <Award
                      className="h-5 w-5"
                      style={{ color: achievement.badgeColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{achievement.title}</p>
                      {!achievement.viewed && (
                        <Badge variant="destructive" className="text-xs">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      +{achievement.points} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All Button */}
        <Link href={`/dashboard/${role.toLowerCase().replace(/_/g, '-')}/achievements`}>
          <Button variant="outline" className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            View All Achievements
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
