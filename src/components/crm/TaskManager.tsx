/**
 * Task Manager Component
 *
 * Manages tasks for a specific lead with create, update, delete capabilities.
 * Shows task list with priority, status, and due dates.
 *
 * @module components/crm/TaskManager
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ListTodo,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { logger } from '@/lib/logger';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface LeadTask {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskManagerProps {
  leadId: string;
  readonly?: boolean;
}

/**
 * Get priority badge color
 */
function getPriorityColor(priority: TaskPriority): string {
  const colorMap: Record<TaskPriority, string> = {
    LOW: 'bg-gray-500',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
  };
  return colorMap[priority] || 'bg-gray-500';
}

/**
 * Get status icon
 */
function getStatusIcon(status: TaskStatus) {
  const iconMap: Record<TaskStatus, React.ReactNode> = {
    TODO: <Circle className="h-4 w-4 text-muted-foreground" />,
    IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
    DONE: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    CANCELLED: <Circle className="h-4 w-4 text-gray-400 line-through" />,
  };
  return iconMap[status] || <Circle className="h-4 w-4" />;
}

/**
 * Format due date for display
 */
function formatDueDate(dueDate: string | null): { text: string; isOverdue: boolean } {
  if (!dueDate) return { text: 'No due date', isOverdue: false };

  const date = new Date(dueDate);
  const isOverdue = isPast(date) && !isToday(date);

  if (isToday(date)) {
    return { text: `Today at ${format(date, 'h:mm a')}`, isOverdue: false };
  }

  if (isTomorrow(date)) {
    return { text: `Tomorrow at ${format(date, 'h:mm a')}`, isOverdue: false };
  }

  return {
    text: format(date, 'MMM d, yyyy'),
    isOverdue,
  };
}

/**
 * Task Manager Component
 */
export function TaskManager({ leadId, readonly = false }: TaskManagerProps) {
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchTasks();
  }, [leadId, filter]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'ALL') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/crm/tasks/${leadId}?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
        setStats(data.stats || {});
      } else {
        logger.error('Failed to fetch tasks');
      }
    } catch (error) {
      logger.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      const response = await fetch(`/api/crm/tasks/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchTasks();
      } else {
        logger.error('Failed to update task status');
      }
    } catch (error) {
      logger.error('Error updating task status:', error);
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/crm/tasks/task/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTasks();
      } else {
        logger.error('Failed to delete task');
      }
    } catch (error) {
      logger.error('Error deleting task:', error);
    }
  }

  const todoCount = stats['TODO'] || 0;
  const inProgressCount = stats['IN_PROGRESS'] || 0;
  const doneCount = stats['DONE'] || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Task Management
            </CardTitle>
            <CardDescription>
              {todoCount} to-do • {inProgressCount} in progress • {doneCount} completed
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as TaskStatus | 'ALL')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tasks</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="DONE">Completed</SelectItem>
              </SelectContent>
            </Select>

            {!readonly && <CreateTaskDialog leadId={leadId} onTaskCreated={fetchTasks} />}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No tasks found</p>
            {!readonly && (
              <p className="text-sm mt-2">Create your first task to get organized</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                onDelete={deleteTask}
                onEdit={fetchTasks}
                readonly={readonly}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual Task Item Component
 */
function TaskItem({
  task,
  onStatusChange,
  onDelete,
  onEdit,
  readonly,
}: {
  task: LeadTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onEdit: () => void;
  readonly: boolean;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { text: dueDateText, isOverdue } = formatDueDate(task.dueDate);
  const isDone = task.status === TaskStatus.DONE;

  function handleCheckboxChange(checked: boolean) {
    if (checked) {
      onStatusChange(task.id, TaskStatus.DONE);
    } else {
      onStatusChange(task.id, TaskStatus.TODO);
    }
  }

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        isDone ? 'bg-muted/30 opacity-60' : 'bg-background hover:bg-muted/50'
      }`}
    >
      {/* Checkbox */}
      {!readonly && (
        <Checkbox
          checked={isDone}
          onCheckedChange={handleCheckboxChange}
          className="mt-1"
        />
      )}

      {/* Status Icon */}
      <div className="mt-1">{getStatusIcon(task.status)}</div>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Actions */}
          {!readonly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2 text-xs">
          <Badge
            variant="outline"
            className={`${getPriorityColor(task.priority)} text-white border-none`}
          >
            {task.priority}
          </Badge>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className={isOverdue && !isDone ? 'text-red-500 font-medium' : ''}>
              {isOverdue && !isDone && <AlertCircle className="h-3 w-3 inline mr-1" />}
              {dueDateText}
            </span>
          </div>

          {task.assignedToName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              <span>{task.assignedToName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditTaskDialog
        task={task}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onTaskUpdated={onEdit}
      />
    </div>
  );
}

/**
 * Create Task Dialog
 */
function CreateTaskDialog({
  leadId,
  onTaskCreated,
}: {
  leadId: string;
  onTaskCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    dueDate: '',
  });

  async function handleSubmit() {
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tasks/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          title: '',
          description: '',
          priority: TaskPriority.MEDIUM,
          dueDate: '',
        });
        onTaskCreated();
      } else {
        logger.error('Failed to create task');
      }
    } catch (error) {
      logger.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task for this lead</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Task details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as TaskPriority })
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
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
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Edit Task Dialog
 */
function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}: {
  task: LeadTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
  });

  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    });
  }, [task]);

  async function handleSubmit() {
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tasks/task/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onOpenChange(false);
        onTaskUpdated();
      } else {
        logger.error('Failed to update task');
      }
    } catch (error) {
      logger.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as TaskStatus })
                }
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as TaskPriority })
                }
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dueDate">Due Date</Label>
            <Input
              id="edit-dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.title.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
