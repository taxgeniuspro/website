/**
 * Recent Items Tracking System
 *
 * Tracks user's recently viewed items across the application.
 * Stores in localStorage for persistence across sessions.
 *
 * Supported item types:
 * - Clients
 * - Leads
 * - Documents
 * - Email Templates
 * - Forms
 */

export type RecentItemType = 'client' | 'lead' | 'document' | 'template' | 'form' | 'ticket';

export interface RecentItem {
  /**
   * Unique identifier for the item
   */
  id: string;

  /**
   * Type of item
   */
  type: RecentItemType;

  /**
   * Display name/title
   */
  title: string;

  /**
   * Optional subtitle (email, status, etc.)
   */
  subtitle?: string;

  /**
   * Link to the item
   */
  href: string;

  /**
   * Timestamp when accessed
   */
  timestamp: number;

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'recent_items';
const MAX_ITEMS = 10; // Keep last 10 items per type
const MAX_TOTAL_ITEMS = 50; // Total limit across all types

/**
 * Get all recent items
 */
export function getRecentItems(): RecentItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const items = JSON.parse(stored) as RecentItem[];

    // Sort by timestamp (most recent first)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error reading recent items:', error);
    return [];
  }
}

/**
 * Get recent items by type
 */
export function getRecentItemsByType(type: RecentItemType): RecentItem[] {
  const allItems = getRecentItems();
  return allItems.filter(item => item.type === type).slice(0, MAX_ITEMS);
}

/**
 * Add or update a recent item
 */
export function addRecentItem(item: Omit<RecentItem, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentItems();

    // Remove existing item with same id (to update timestamp)
    const filtered = items.filter(i => i.id !== item.id);

    // Add new item with current timestamp
    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now(),
    };

    filtered.unshift(newItem);

    // Limit total items
    const limited = filtered.slice(0, MAX_TOTAL_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Error saving recent item:', error);
  }
}

/**
 * Remove a recent item
 */
export function removeRecentItem(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentItems();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing recent item:', error);
  }
}

/**
 * Clear all recent items
 */
export function clearRecentItems(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent items:', error);
  }
}

/**
 * Clear recent items by type
 */
export function clearRecentItemsByType(type: RecentItemType): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentItems();
    const filtered = items.filter(i => i.type !== type);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error clearing recent items by type:', error);
  }
}

/**
 * Get item type display name
 */
export function getItemTypeLabel(type: RecentItemType): string {
  const labels: Record<RecentItemType, string> = {
    client: 'Client',
    lead: 'Lead',
    document: 'Document',
    template: 'Template',
    form: 'Form',
    ticket: 'Ticket',
  };

  return labels[type] || type;
}

/**
 * Format timestamp for display
 */
export function formatRecentTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  // Show date for older items
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Hook to track page views
 *
 * @example
 * ```tsx
 * // In a client detail page
 * useEffect(() => {
 *   if (client) {
 *     addRecentItem({
 *       id: client.id,
 *       type: 'client',
 *       title: client.name,
 *       subtitle: client.email,
 *       href: `/clients/${client.id}`,
 *     });
 *   }
 * }, [client]);
 * ```
 */
export function useTrackRecentItem(item: Omit<RecentItem, 'timestamp'> | null) {
  if (typeof window === 'undefined') return;

  // Track on mount if item provided
  if (item) {
    addRecentItem(item);
  }
}
