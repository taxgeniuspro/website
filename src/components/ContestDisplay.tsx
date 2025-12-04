import React from 'react';
import { Trophy, Calendar, Target, Gift, Crown, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveContests, useContestLeaderboard } from '@/hooks/useReferrerData';
import type { Contest } from '@/lib/types';
import type { ContestLeaderboardEntry } from '@/lib/types';

interface ContestDisplayProps {
  currentUserId?: string;
  referrerId?: string;
}

export const ContestDisplay: React.FC<ContestDisplayProps> = ({ currentUserId, referrerId }) => {
  const { data: contests, isLoading: contestsLoading } = useActiveContests();
  const { data: leaderboard, isLoading: leaderboardLoading } = useContestLeaderboard(10);

  const activeContest = contests?.[0]; // Get the most recent active contest

  const getUserRankInfo = () => {
    if (!referrerId || !leaderboard) return null;

    const userEntry = leaderboard.find((entry) => entry.referrer_id === referrerId);
    if (userEntry) {
      return {
        rank: userEntry.rank,
        score: userEntry.score,
        isInTopTen: true,
      };
    }

    // If not in top 10, we would need to fetch their actual rank
    // For now, return a placeholder
    return {
      rank: null,
      score: 0,
      isInTopTen: false,
    };
  };

  const userRankInfo = getUserRankInfo();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-accent-foreground" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatContestDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProgressPercentage = () => {
    if (!activeContest || !userRankInfo) return 0;

    // Calculate progress based on contest rules
    const rules = activeContest.rules as any;
    const minReferrals = rules?.min_referrals || 5;
    const userScore = userRankInfo.score || 0;

    return Math.min((userScore / minReferrals) * 100, 100);
  };

  if (contestsLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activeContest) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Contest & Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active contests</p>
            <p className="text-xs">Check back later for exciting competitions!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Contest Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {activeContest.title}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatContestDate(activeContest.start_date)} -{' '}
              {formatContestDate(activeContest.end_date)}
            </div>
            <Badge variant="secondary" className="capitalize">
              {activeContest.contest_type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeContest.description && (
            <p className="text-sm text-muted-foreground">{activeContest.description}</p>
          )}

          {/* User Progress */}
          {userRankInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm text-muted-foreground">
                  {userRankInfo.score} referrals
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
              {userRankInfo.rank && (
                <div className="flex items-center gap-2 text-sm">
                  {getRankIcon(userRankInfo.rank)}
                  <span className="font-medium">Current Rank: #{userRankInfo.rank}</span>
                </div>
              )}
            </div>
          )}

          {/* Prize Information */}
          {activeContest.prize_description && (
            <div className="p-3 bg-accent dark:bg-accent border border-accent-foreground rounded-md">
              <div className="flex items-start gap-2">
                <Gift className="h-4 w-4 text-accent-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-accent-foreground">Prizes</p>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {activeContest.prize_description}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard - Top 10
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.referrer_id === referrerId;
                const displayName = isCurrentUser
                  ? 'You'
                  : `${entry.referrer?.first_name || ''} ${entry.referrer?.last_name || ''}`.trim() ||
                    entry.referrer?.vanity_slug ||
                    'Anonymous';

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-md transition-colors ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-8">
                        {getRankIcon(entry.rank)}
                        <span className="font-bold text-sm">#{entry.rank}</span>
                      </div>
                      <div>
                        <p
                          className={`font-medium ${isCurrentUser ? 'text-blue-900 dark:text-blue-100' : ''}`}
                        >
                          {displayName}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs mt-1">
                            That's you!
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.floor(entry.score)} referrals</p>
                      <p className="text-xs text-muted-foreground">
                        ~${(entry.score * 50).toFixed(0)} earned
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Show user rank if not in top 10 */}
              {userRankInfo && !userRankInfo.isInTopTen && userRankInfo.rank && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-center py-2 text-muted-foreground">
                    <span className="text-xs">...</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-8">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold text-sm">#{userRankInfo.rank}</span>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">You</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          Your position
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {Math.floor(userRankInfo.score)} referrals
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ~${(userRankInfo.score * 50).toFixed(0)} earned
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No participants yet</p>
              <p className="text-xs">Be the first to join the contest!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContestDisplay;
