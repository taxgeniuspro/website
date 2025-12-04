/**
 * Email Campaigns Component
 *
 * Manages email campaigns with create, send, and track capabilities.
 *
 * @module components/crm/EmailCampaigns
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Plus,
  Send,
  Trash2,
  BarChart3,
  Loader2,
  Calendar,
  Users,
  Eye,
  MousePointer,
  AlertCircle,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Email Campaigns Component
 */
export function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const response = await fetch('/api/crm/email/campaigns');

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      } else {
        logger.error('Failed to fetch campaigns');
      }
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCampaign(campaignId: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const response = await fetch(`/api/crm/email/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCampaigns();
      } else {
        logger.error('Failed to delete campaign');
      }
    } catch (error) {
      logger.error('Error deleting campaign:', error);
    }
  }

  async function sendCampaign(campaignId: string) {
    if (!confirm('Are you sure you want to send this campaign to all recipients?')) {
      return;
    }

    try {
      const response = await fetch(`/api/crm/email/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Campaign sent! ${data.sent} emails sent, ${data.failed} failed.`);
        fetchCampaigns();
      } else {
        logger.error('Failed to send campaign');
      }
    } catch (error) {
      logger.error('Error sending campaign:', error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Campaigns
            </CardTitle>
            <CardDescription>
              Create and manage automated email campaigns
            </CardDescription>
          </div>
          <CreateCampaignDialog onCampaignCreated={fetchCampaigns} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No campaigns created yet</p>
            <p className="text-sm mt-2">Create your first email campaign to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{campaign.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        campaign.status === 'SENT'
                          ? 'default'
                          : campaign.status === 'DRAFT'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{campaign.recipientCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.sentCount > 0 ? (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>
                            {campaign.openedCount} ({((campaign.openedCount / campaign.sentCount) * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          <span>
                            {campaign.clickedCount} ({((campaign.clickedCount / campaign.sentCount) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No data</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {campaign.sentAt
                      ? `Sent ${format(new Date(campaign.sentAt), 'MMM d, yyyy')}`
                      : campaign.scheduledAt
                      ? `Scheduled ${format(new Date(campaign.scheduledAt), 'MMM d, yyyy')}`
                      : `Created ${format(new Date(campaign.createdAt), 'MMM d, yyyy')}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {campaign.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => sendCampaign(campaign.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Create Campaign Dialog
 */
function CreateCampaignDialog({ onCampaignCreated }: { onCampaignCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlBody: '',
    plainTextBody: '',
    fromName: 'Tax Genius Pro',
    fromEmail: 'noreply@taxgeniuspro.tax',
    replyTo: '',
    scheduledAt: '',
  });

  async function handleSubmit() {
    if (!formData.name || !formData.subject || !formData.htmlBody) {
      alert('Name, subject, and email body are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/crm/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          name: '',
          subject: '',
          htmlBody: '',
          plainTextBody: '',
          fromName: 'Tax Genius Pro',
          fromEmail: 'noreply@taxgeniuspro.tax',
          replyTo: '',
          scheduledAt: '',
        });
        onCampaignCreated();
      } else {
        const data = await response.json();
        alert(`Failed to create campaign: ${data.error}`);
      }
    } catch (error) {
      logger.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Email Campaign</DialogTitle>
          <DialogDescription>
            Create a new email campaign to send to your leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              placeholder="Welcome Campaign"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              placeholder="Welcome to Tax Genius Pro"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="replyTo">Reply To (optional)</Label>
            <Input
              id="replyTo"
              type="email"
              placeholder="support@taxgeniuspro.tax"
              value={formData.replyTo}
              onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="htmlBody">Email Content (HTML) *</Label>
            <Textarea
              id="htmlBody"
              placeholder="<p>Welcome to Tax Genius Pro!</p>"
              value={formData.htmlBody}
              onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use variables like {'{'}firstName{'}'}, {'{'}lastName{'}'} for personalization
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plainTextBody">Plain Text Version (optional)</Label>
            <Textarea
              id="plainTextBody"
              placeholder="Welcome to Tax Genius Pro!"
              value={formData.plainTextBody}
              onChange={(e) => setFormData({ ...formData, plainTextBody: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule for Later (optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Campaign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
