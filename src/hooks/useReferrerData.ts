import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReferrerStats, ReferralActivity } from '@/lib/services/referrer.service';
import type { Contest, MarketingMaterial, Notification } from '@prisma/client';

// API helper functions
const fetchApi = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response.json();
};

const postApi = async (url: string, data: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to post: ${response.statusText}`);
  }
  return response.json();
};

// Hooks for referrer stats
export function useReferrerStats() {
  return useQuery<ReferrerStats>({
    queryKey: ['referrer', 'stats'],
    queryFn: () => fetchApi('/api/referrers/stats'),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for recent activity
export function useRecentActivity(limit: number = 10) {
  return useQuery<ReferralActivity[]>({
    queryKey: ['referrer', 'activity', limit],
    queryFn: () => fetchApi(`/api/referrers/activity?limit=${limit}`),
    staleTime: 30000,
  });
}

// Hook for vanity URL
export function useVanityUrl(referrerId: string) {
  return useQuery<string | null>({
    queryKey: ['referrer', 'vanity', referrerId],
    queryFn: async () => {
      const data = await fetchApi('/api/referrers/vanity');
      return data.vanityUrl;
    },
    staleTime: 60000,
  });
}

// Hook for setting vanity slug
export function useSetVanitySlug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => postApi('/api/referrers/vanity', { slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrer', 'vanity'] });
    },
  });
}

// Hook for checking vanity slug availability
export function useCheckVanitySlugAvailability() {
  return useMutation({
    mutationFn: async (slug: string) => {
      const data = await fetchApi(`/api/referrers/vanity/check?slug=${slug}`);
      return data.available;
    },
  });
}

// Hook for active contests
export function useActiveContests() {
  return useQuery<Contest[]>({
    queryKey: ['contests', 'active'],
    queryFn: () => fetchApi('/api/contests/active'),
    staleTime: 60000,
  });
}

// Hook for contest leaderboard
export function useContestLeaderboard(limit: number = 10) {
  return useQuery<unknown[]>({
    queryKey: ['contests', 'leaderboard', limit],
    queryFn: () => fetchApi(`/api/contests/leaderboard?limit=${limit}`),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Hook for marketing materials
export function useMarketingMaterials() {
  return useQuery<MarketingMaterial[]>({
    queryKey: ['marketing', 'materials'],
    queryFn: () => fetchApi('/api/marketing/materials'),
    staleTime: 300000, // Consider fresh for 5 minutes
  });
}

// Hook for notifications
export function useNotifications(profileId: string) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', profileId],
    queryFn: () => fetchApi('/api/notifications'),
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

// Hook for marking notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      postApi(`/api/notifications/${notificationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook for marking notification as actioned
export function useMarkNotificationActioned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      postApi(`/api/notifications/${notificationId}/action`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
// Export aliases for backward compatibility
export const useMarkNotificationAsRead = useMarkNotificationRead;
export const useMarkNotificationAsActioned = useMarkNotificationActioned;
