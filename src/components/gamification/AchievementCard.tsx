'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Check, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  achievement: {
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
  };
  onClick?: () => void;
}

const rarityStyles = {
  COMMON: 'from-green-500/20 to-green-600/20 border-green-500/30',
  RARE: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  EPIC: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  LEGENDARY: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
};

const rarityBadgeStyles = {
  COMMON: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  RARE: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  EPIC: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  LEGENDARY: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
};

export function AchievementCard({ achievement, onClick }: AchievementCardProps) {
  const rarityStyle = rarityStyles[achievement.rarity as keyof typeof rarityStyles] || rarityStyles.COMMON;
  const rarityBadge = rarityBadgeStyles[achievement.rarity as keyof typeof rarityBadgeStyles] || rarityBadgeStyles.COMMON;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer',
        achievement.isUnlocked
          ? `bg-gradient-to-br ${rarityStyle}`
          : 'bg-muted/30 opacity-75 hover:opacity-100',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* New badge indicator */}
      {achievement.isUnlocked && !achievement.viewed && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="destructive" className="animate-pulse text-xs">
            NEW
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Icon & Status */}
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center relative',
                achievement.isUnlocked
                  ? 'bg-gradient-to-br shadow-lg'
                  : 'bg-muted'
              )}
              style={{
                backgroundImage: achievement.isUnlocked
                  ? `linear-gradient(to bottom right, ${achievement.badgeColor}40, ${achievement.badgeColor}60)`
                  : undefined,
              }}
            >
              {achievement.isUnlocked ? (
                <Trophy
                  className="h-8 w-8"
                  style={{ color: achievement.badgeColor }}
                />
              ) : (
                <Lock className="h-8 w-8 text-muted-foreground" />
              )}

              {achievement.isUnlocked && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <Badge variant="outline" className={cn('text-xs', rarityBadge)}>
              {achievement.rarity}
            </Badge>
          </div>

          {/* Title & Description */}
          <div>
            <h3
              className={cn(
                'font-bold text-lg mb-1',
                !achievement.isUnlocked && 'text-muted-foreground'
              )}
            >
              {achievement.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
          </div>

          {/* Progress Bar (if not unlocked) */}
          {!achievement.isUnlocked && achievement.progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(achievement.progress)}%</span>
              </div>
              <Progress value={achievement.progress} className="h-2" />
            </div>
          )}

          {/* Unlock date (if unlocked) */}
          {achievement.isUnlocked && achievement.unlockedAt && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>
                  Unlocked{' '}
                  {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* XP Points */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Reward</span>
            <Badge
              variant="secondary"
              className="font-semibold"
              style={{
                backgroundColor: achievement.isUnlocked
                  ? achievement.badgeColor + '20'
                  : undefined,
                color: achievement.isUnlocked
                  ? achievement.badgeColor
                  : undefined,
              }}
            >
              +{achievement.points} XP
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
