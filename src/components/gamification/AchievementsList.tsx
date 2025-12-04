'use client';

import { useEffect, useState } from 'react';
import { AchievementCard } from './AchievementCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Trophy, Lock, TrendingUp } from 'lucide-react';

interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  points: number;
  badgeColor: string;
  badgeImage?: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  viewed?: boolean;
}

interface AchievementsData {
  achievements: Achievement[];
  grouped: Record<string, Achievement[]>;
  summary: {
    total: number;
    unlocked: number;
    inProgress: number;
  };
}

export function AchievementsList() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/gamification/achievements');
      if (response.ok) {
        const achievementsData = await response.json();
        setData(achievementsData);

        // Mark new achievements as viewed after viewing
        const newAchievementIds = achievementsData.achievements
          .filter((a: Achievement) => a.isUnlocked && !a.viewed)
          .map((a: Achievement) => a.id);

        if (newAchievementIds.length > 0) {
          setTimeout(() => {
            markAsViewed(newAchievementIds);
          }, 3000); // Mark as viewed after 3 seconds
        }
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (achievementIds: string[]) => {
    try {
      await fetch('/api/gamification/achievements/mark-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementIds }),
      });
    } catch (error) {
      console.error('Error marking achievements as viewed:', error);
    }
  };

  const filteredAchievements = data?.achievements.filter((achievement) => {
    const matchesSearch =
      searchQuery === '' ||
      achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRarity =
      rarityFilter === 'all' || achievement.rarity === rarityFilter;

    const matchesCategory =
      categoryFilter === 'all' || achievement.category === categoryFilter;

    return matchesSearch && matchesRarity && matchesCategory;
  });

  const unlockedAchievements = filteredAchievements?.filter((a) => a.isUnlocked) || [];
  const lockedAchievements = filteredAchievements?.filter((a) => !a.isUnlocked) || [];
  const inProgressAchievements = filteredAchievements?.filter(
    (a) => !a.isUnlocked && a.progress > 0
  ) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load achievements</p>
      </div>
    );
  }

  const categories = Array.from(
    new Set(data.achievements.map((a) => a.category))
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unlocked</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {data.summary.unlocked}
              </p>
            </div>
            <Trophy className="h-10 w-10 text-green-500/50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {data.summary.inProgress}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-500/50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border border-gray-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Locked</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {data.summary.total - data.summary.unlocked}
              </p>
            </div>
            <Lock className="h-10 w-10 text-gray-500/50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search achievements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={rarityFilter} onValueChange={setRarityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            <SelectItem value="COMMON">Common</SelectItem>
            <SelectItem value="RARE">Rare</SelectItem>
            <SelectItem value="EPIC">Epic</SelectItem>
            <SelectItem value="LEGENDARY">Legendary</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {filteredAchievements?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unlocked">
            Unlocked
            <Badge variant="secondary" className="ml-2">
              {unlockedAchievements.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="progress">
            In Progress
            <Badge variant="secondary" className="ml-2">
              {inProgressAchievements.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="locked">
            Locked
            <Badge variant="secondary" className="ml-2">
              {lockedAchievements.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredAchievements && filteredAchievements.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No achievements found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="unlocked" className="mt-6">
          {unlockedAchievements.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {unlockedAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No unlocked achievements yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete tasks to earn your first achievement!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {inProgressAchievements.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {inProgressAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No achievements in progress</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start working towards your goals!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="locked" className="mt-6">
          {lockedAchievements.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lockedAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">All achievements unlocked!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
