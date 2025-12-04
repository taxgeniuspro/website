/**
 * Activity Timeline Component
 *
 * Displays a chronological timeline of all lead activities.
 * Shows different activity types with appropriate icons and formatting.
 *
 * @module components/crm/ActivityTimeline
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  PhoneCall,
  Mail,
  MailOpen,
  MousePointer,
  StickyNote,
  RefreshCw,
  ListTodo,
  CheckCircle,
  Eye,
  FileUp,
  Calendar,
  CalendarCheck,
  DollarSign,
  UserCheck,
  Activity,
  Plus,
  Filter,
  Loader2,
} from 'lucide-react';
import { ActivityType } from '@prisma/client';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';

interface LeadActivity {
  id: string;
  leadId: string;
  activityType: ActivityType;
  title: string;
  description: string | null;
  metadata: any;
  createdBy: string | null;
  createdByName: string | null;
  automated: boolean;
  createdAt: string;
}

interface ActivityTimelineProps {
  leadId: string;
  readonly?: boolean;
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityType) {
  const iconMap: Record<ActivityType, React.ReactNode> = {
    CONTACT_ATTEMPTED: <Phone className="h-4 w-4" />,
    CONTACT_MADE: <PhoneCall className="h-4 w-4" />,
    EMAIL_SENT: <Mail className="h-4 w-4" />,
    EMAIL_OPENED: <MailOpen className="h-4 w-4" />,
    EMAIL_CLICKED: <MousePointer className="h-4 w-4" />,
    NOTE_ADDED: <StickyNote className="h-4 w-4" />,
    STATUS_CHANGED: <RefreshCw className="h-4 w-4" />,
    TASK_CREATED: <ListTodo className="h-4 w-4" />,
    TASK_COMPLETED: <CheckCircle className="h-4 w-4" />,
    FORM_VIEWED: <Eye className="h-4 w-4" />,
    DOCUMENT_UPLOADED: <FileUp className="h-4 w-4" />,
    MEETING_SCHEDULED: <Calendar className="h-4 w-4" />,
    MEETING_COMPLETED: <CalendarCheck className="h-4 w-4" />,
    CONVERTED: <DollarSign className="h-4 w-4" />,
    ASSIGNED: <UserCheck className="h-4 w-4" />,
  };

  return iconMap[type] || <Activity className="h-4 w-4" />;
}

/**
 * Get color variant for activity type
 */
function getActivityColor(type: ActivityType): string {
  const colorMap: Record<ActivityType, string> = {
    CONTACT_ATTEMPTED: 'bg-yellow-500',
    CONTACT_MADE: 'bg-green-500',
    EMAIL_SENT: 'bg-blue-500',
    EMAIL_OPENED: 'bg-blue-600',
    EMAIL_CLICKED: 'bg-purple-500',
    NOTE_ADDED: 'bg-gray-500',
    STATUS_CHANGED: 'bg-orange-500',
    TASK_CREATED: 'bg-indigo-500',
    TASK_COMPLETED: 'bg-green-600',
    FORM_VIEWED: 'bg-cyan-500',
    DOCUMENT_UPLOADED: 'bg-teal-500',
    MEETING_SCHEDULED: 'bg-pink-500',
    MEETING_COMPLETED: 'bg-pink-600',
    CONVERTED: 'bg-emerald-500',
    ASSIGNED: 'bg-violet-500',
  };

  return colorMap[type] || 'bg-gray-500';
}

/**
 * Format activity type for display
 */
function formatActivityType(type: ActivityType): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Activity Timeline Component
 */
export function ActivityTimeline({ leadId, readonly = false }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<ActivityType | 'ALL'>('ALL');
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // Fetch activities
  useEffect(() => {
    fetchActivities();
  }, [leadId, filter]);

  async function fetchActivities() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'ALL') {
        params.set('type', filter);
      }

      const response = await fetch(`/api/crm/activities/${leadId}?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
        setTotal(data.total);
      } else {
        logger.error('Failed to fetch activities');
      }
    } catch (error) {
      logger.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              {total} {total === 1 ? 'activity' : 'activities'} recorded
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as ActivityType | 'ALL')}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Activities</SelectItem>
                <SelectItem value="CONTACT_ATTEMPTED">Contact Attempted</SelectItem>
                <SelectItem value="CONTACT_MADE">Contact Made</SelectItem>
                <SelectItem value="EMAIL_SENT">Email Sent</SelectItem>
                <SelectItem value="NOTE_ADDED">Notes</SelectItem>
                <SelectItem value="STATUS_CHANGED">Status Changes</SelectItem>
                <SelectItem value="TASK_CREATED">Tasks</SelectItem>
                <SelectItem value="MEETING_SCHEDULED">Meetings</SelectItem>
              </SelectContent>
            </Select>

            {!readonly && <AddActivityDialog leadId={leadId} onActivityAdded={fetchActivities} />}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No activities recorded yet</p>
            {!readonly && (
              <p className="text-sm mt-2">Add your first activity to start tracking interactions</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              {/* Activities */}
              <div className="space-y-6">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="relative pl-14 pb-6">
                    {/* Icon badge */}
                    <div
                      className={`absolute left-3 top-0 w-6 h-6 rounded-full ${getActivityColor(
                        activity.activityType
                      )} flex items-center justify-center text-white ring-4 ring-background`}
                    >
                      {getActivityIcon(activity.activityType)}
                    </div>

                    {/* Activity content */}
                    <div className="bg-muted/50 rounded-lg p-4 hover:bg-muted/70 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{activity.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {formatActivityType(activity.activityType)}
                            </Badge>
                            {activity.automated && (
                              <Badge variant="secondary" className="text-xs">
                                Automated
                              </Badge>
                            )}
                          </div>

                          {activity.description && (
                            <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {activity.createdByName || 'System'}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(activity.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metadata display */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Add Activity Dialog Component
 */
function AddActivityDialog({
  leadId,
  onActivityAdded,
}: {
  leadId: string;
  onActivityAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activityType: 'NOTE_ADDED' as ActivityType,
    title: '',
    description: '',
  });

  async function handleSubmit() {
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/crm/activities/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          activityType: 'NOTE_ADDED',
          title: '',
          description: '',
        });
        onActivityAdded();
      } else {
        logger.error('Failed to add activity');
      }
    } catch (error) {
      logger.error('Error adding activity:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogDescription>
            Log a new activity or interaction with this lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activityType">Activity Type</Label>
            <Select
              value={formData.activityType}
              onValueChange={(value) =>
                setFormData({ ...formData, activityType: value as ActivityType })
              }
            >
              <SelectTrigger id="activityType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTACT_ATTEMPTED">Contact Attempted</SelectItem>
                <SelectItem value="CONTACT_MADE">Contact Made</SelectItem>
                <SelectItem value="EMAIL_SENT">Email Sent</SelectItem>
                <SelectItem value="NOTE_ADDED">Note Added</SelectItem>
                <SelectItem value="STATUS_CHANGED">Status Changed</SelectItem>
                <SelectItem value="MEETING_SCHEDULED">Meeting Scheduled</SelectItem>
                <SelectItem value="MEETING_COMPLETED">Meeting Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief summary of the activity"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add more details about this activity..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.title.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
