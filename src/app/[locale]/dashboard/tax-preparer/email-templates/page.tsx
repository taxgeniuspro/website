'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  Plus,
  Mail,
  Edit,
  Trash2,
  Copy,
  Check,
  Star,
  FileText,
  Users,
  Loader2,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { EmptyState } from '@/components/EmptyState';
import { EmailTemplateSkeleton } from '@/components/SkeletonPatterns';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toasts, showErrorToast } from '@/lib/toast-helpers';
import { addRecentItem } from '@/lib/recent-items';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  isShared: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Email Templates Management Page
 * /dashboard/tax-preparer/email-templates
 *
 * Allows tax preparers to manage their email templates
 */
export default function EmailTemplatesPage() {
  const { data: session } = useSession(); const user = session?.user;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState('LEAD');
  const [saving, setSaving] = useState(false);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const response = await fetch('/api/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        logger.error('Failed to load email templates');
      }
    } catch (error) {
      logger.error('Error loading email templates', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setDialogMode('create');
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setFormCategory('LEAD');
    setEditingTemplate(null);
    setDialogOpen(true);
  }

  function openEditDialog(template: EmailTemplate) {
    if (template.isDefault) {
      showErrorToast('Cannot edit default template', 'Create a copy to customize this template');
      return;
    }

    setDialogMode('edit');
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormCategory(template.category);
    setEditingTemplate(template);
    setDialogOpen(true);

    // Track recently accessed template
    addRecentItem({
      id: template.id,
      type: 'template',
      title: template.name,
      subtitle: template.subject,
      href: '/dashboard/tax-preparer/email-templates',
      metadata: { category: template.category },
    });
  }

  async function handleSave() {
    if (!formName || !formSubject || !formBody) {
      Toasts.requiredFields();
      return;
    }

    setSaving(true);

    try {
      const url =
        dialogMode === 'create'
          ? '/api/email-templates'
          : `/api/email-templates/${editingTemplate?.id}`;

      const response = await fetch(url, {
        method: dialogMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          subject: formSubject,
          body: formBody,
          category: formCategory,
        }),
      });

      if (response.ok) {
        await loadTemplates();
        setDialogOpen(false);
        Toasts.saved();
      } else {
        const data = await response.json();
        showErrorToast('Failed to save template', data.error || 'Please try again');
      }
    } catch (error) {
      logger.error('Error saving template', error);
      Toasts.saveError();
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(templateId: string) {
    setTemplateToDelete(templateId);
    setConfirmDialogOpen(true);
  }

  async function handleDelete() {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/email-templates/${templateToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTemplates();
        setConfirmDialogOpen(false);
        setTemplateToDelete(null);
        Toasts.deleted('Template');
      } else {
        const data = await response.json();
        showErrorToast('Failed to delete template', data.error || 'Please try again');
      }
    } catch (error) {
      logger.error('Error deleting template', error);
      Toasts.deleteError();
    }
  }

  async function handleCopy(template: EmailTemplate) {
    setDialogMode('create');
    setFormName(`${template.name} (Copy)`);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormCategory(template.category);
    setEditingTemplate(null);
    setDialogOpen(true);
  }

  const filteredTemplates = templates.filter(
    (t) => selectedCategory === 'ALL' || t.category === selectedCategory
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="w-8 h-8" />
            Email Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create reusable email templates for quick responses to leads and clients
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6 px-6">
          <div className="flex items-center gap-4">
            <Label className="font-medium">Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="LEAD">Leads</SelectItem>
                <SelectItem value="CLIENT">Clients</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Variable Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Variables</CardTitle>
          <CardDescription>
            Use these variables in your subject and body. They'll be automatically replaced when
            sending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {'{{firstName}}'}
              </code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {'{{lastName}}'}
              </code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {'{{fullName}}'}
              </code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">{'{{email}}'}</code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {'{{preparerName}}'}
              </code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {'{{professionalEmail}}'}
              </code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">{'{{year}}'}</code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">{'{{date}}'}</code>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {'{{calendarLink}}'}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="space-y-4">
          <EmailTemplateSkeleton />
          <EmailTemplateSkeleton />
          <EmailTemplateSkeleton />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={selectedCategory === 'ALL' ? 'No email templates' : `No ${selectedCategory.toLowerCase()} templates`}
          description={
            selectedCategory === 'ALL'
              ? 'Create email templates to save time when communicating with clients and leads. Templates can include variables that automatically personalize each message.'
              : `You don't have any ${selectedCategory.toLowerCase()} templates yet. Create one to streamline your communication.`
          }
          primaryAction={{
            label: 'Create Template',
            onClick: openCreateDialog,
            icon: Plus,
          }}
          helpLink={{
            label: 'Learn about email templates',
            href: '/help/email-templates',
          }}
        />
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {template.isShared && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <CardDescription>
                      <strong>Subject:</strong> {template.subject}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(template)}
                      title="Copy template"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {!template.isDefault && !template.isShared && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                          title="Edit template"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(template.id)}
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                    {template.body.substring(0, 200)}
                    {template.body.length > 200 && '...'}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Used {template.usageCount} times</span>
                    {template.lastUsedAt && (
                      <span>Last used {new Date(template.lastUsedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create Email Template' : 'Edit Email Template'}
            </DialogTitle>
            <DialogDescription>
              Use variables like {'{{firstName}}'} to personalize your emails
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Template Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Initial Lead Contact"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD">Leads</SelectItem>
                  <SelectItem value="CLIENT">Clients</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Email Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="e.g., Hi {{firstName}}! Let's get started"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">
                Email Body <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="body"
                placeholder="Hi {{firstName}},&#10;&#10;Thank you for your interest..."
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <LoadingButton
              onClick={handleSave}
              loading={saving}
              loadingText="Saving..."
            >
              <Check className="w-4 h-4 mr-2" />
              {dialogMode === 'create' ? 'Create Template' : 'Save Changes'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleDelete}
        title="Delete Email Template"
        description="Are you sure you want to delete this template? This action cannot be undone and the template will be permanently removed."
        confirmText="Delete Template"
        variant="destructive"
      />
    </div>
  );
}
