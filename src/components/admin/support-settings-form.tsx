'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface SupportSettingsFormProps {
  section: 'general' | 'features' | 'ai' | 'notifications' | 'email' | 'integrations';
}

export function SupportSettingsForm({ section }: SupportSettingsFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSettings();
  }, [section]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support/settings?section=${section}`);
      const data = await response.json();

      if (data.success) {
        setSettings(data.data.settings || getDefaultSettings());
      }
    } catch (error) {
      logger.error('Error fetching settings:', error);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = () => {
    switch (section) {
      case 'general':
        return {
          enableTicketSystem: true,
          autoAssignTickets: true,
          requireTicketApproval: false,
          allowClientClose: false,
          defaultPriority: 'NORMAL',
        };
      case 'features':
        return {
          enableSavedReplies: true,
          enableWorkflows: true,
          enableTimeTracking: true,
          enableInternalNotes: true,
          enableAttachments: true,
        };
      case 'ai':
        return {
          enableAI: false,
          openaiApiKey: '',
          openaiModel: 'gpt-4o-mini',
          enableResponseSuggestions: true,
          enableSentimentAnalysis: true,
          enableSummarization: true,
          enableAutoCategorization: true,
        };
      case 'notifications':
        return {
          enableEmailNotifications: true,
          enableInAppNotifications: true,
          enableSlackNotifications: false,
          enableSMSNotifications: false,
          notifyOnNewTicket: true,
          notifyOnNewMessage: true,
          notifyOnStatusChange: true,
        };
      case 'email':
        return {
          senderName: 'Tax Genius Pro Support',
          senderEmail: 'support@taxgeniuspro.tax',
          replyToEmail: 'support@taxgeniuspro.tax',
          includeTicketLink: true,
          includeUnsubscribeLink: true,
        };
      case 'integrations':
        return {
          slackWebhookUrl: '',
          slackChannel: '#support',
          twilioAccountSid: '',
          twilioAuthToken: '',
          twilioPhoneNumber: '',
          discordWebhookUrl: '',
          telegramBotToken: '',
          telegramChatId: '',
        };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/support/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, settings }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Settings saved successfully.',
        });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      logger.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {section === 'general' && (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Support Ticket System</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to create and manage support tickets
              </p>
            </div>
            <Switch
              checked={settings.enableTicketSystem}
              onCheckedChange={(checked) => updateSetting('enableTicketSystem', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Assign Tickets</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign new tickets to client's tax preparer
              </p>
            </div>
            <Switch
              checked={settings.autoAssignTickets}
              onCheckedChange={(checked) => updateSetting('autoAssignTickets', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Clients to Close Tickets</Label>
              <p className="text-sm text-muted-foreground">
                Let clients mark their tickets as closed
              </p>
            </div>
            <Switch
              checked={settings.allowClientClose}
              onCheckedChange={(checked) => updateSetting('allowClientClose', checked)}
            />
          </div>
        </>
      )}

      {section === 'features' && (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Saved Replies</Label>
              <p className="text-sm text-muted-foreground">
                Allow preparers to use saved reply templates
              </p>
            </div>
            <Switch
              checked={settings.enableSavedReplies}
              onCheckedChange={(checked) => updateSetting('enableSavedReplies', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Workflows</Label>
              <p className="text-sm text-muted-foreground">Allow automated workflows and actions</p>
            </div>
            <Switch
              checked={settings.enableWorkflows}
              onCheckedChange={(checked) => updateSetting('enableWorkflows', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Time Tracking</Label>
              <p className="text-sm text-muted-foreground">Track time spent on tickets</p>
            </div>
            <Switch
              checked={settings.enableTimeTracking}
              onCheckedChange={(checked) => updateSetting('enableTimeTracking', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Internal Notes</Label>
              <p className="text-sm text-muted-foreground">
                Allow preparers to add private notes to tickets
              </p>
            </div>
            <Switch
              checked={settings.enableInternalNotes}
              onCheckedChange={(checked) => updateSetting('enableInternalNotes', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable File Attachments</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to attach files to tickets
              </p>
            </div>
            <Switch
              checked={settings.enableAttachments}
              onCheckedChange={(checked) => updateSetting('enableAttachments', checked)}
            />
          </div>
        </>
      )}

      {section === 'ai' && (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AI Features</Label>
              <p className="text-sm text-muted-foreground">Turn on AI-powered support features</p>
            </div>
            <Switch
              checked={settings.enableAI}
              onCheckedChange={(checked) => updateSetting('enableAI', checked)}
            />
          </div>

          {settings.enableAI && (
            <>
              <div className="space-y-2">
                <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  placeholder="sk-..."
                  value={settings.openaiApiKey}
                  onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your OpenAI API key will be encrypted and stored securely
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openaiModel">OpenAI Model</Label>
                <Input
                  id="openaiModel"
                  value={settings.openaiModel}
                  onChange={(e) => updateSetting('openaiModel', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: gpt-4o-mini for cost-effective results
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Response Suggestions</Label>
                  <p className="text-sm text-muted-foreground">AI generates response suggestions</p>
                </div>
                <Switch
                  checked={settings.enableResponseSuggestions}
                  onCheckedChange={(checked) => updateSetting('enableResponseSuggestions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sentiment Analysis</Label>
                  <p className="text-sm text-muted-foreground">
                    Analyze client sentiment automatically
                  </p>
                </div>
                <Switch
                  checked={settings.enableSentimentAnalysis}
                  onCheckedChange={(checked) => updateSetting('enableSentimentAnalysis', checked)}
                />
              </div>
            </>
          )}
        </>
      )}

      {section === 'notifications' && (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send notifications via email</p>
            </div>
            <Switch
              checked={settings.enableEmailNotifications}
              onCheckedChange={(checked) => updateSetting('enableEmailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">Show notifications in the dashboard</p>
            </div>
            <Switch
              checked={settings.enableInAppNotifications}
              onCheckedChange={(checked) => updateSetting('enableInAppNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notify on New Ticket</Label>
              <p className="text-sm text-muted-foreground">
                Send notification when tickets are created
              </p>
            </div>
            <Switch
              checked={settings.notifyOnNewTicket}
              onCheckedChange={(checked) => updateSetting('notifyOnNewTicket', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notify on New Message</Label>
              <p className="text-sm text-muted-foreground">Send notification for new messages</p>
            </div>
            <Switch
              checked={settings.notifyOnNewMessage}
              onCheckedChange={(checked) => updateSetting('notifyOnNewMessage', checked)}
            />
          </div>
        </>
      )}

      {section === 'email' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="senderName">Sender Name</Label>
            <Input
              id="senderName"
              value={settings.senderName}
              onChange={(e) => updateSetting('senderName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senderEmail">Sender Email</Label>
            <Input
              id="senderEmail"
              type="email"
              value={settings.senderEmail}
              onChange={(e) => updateSetting('senderEmail', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replyToEmail">Reply-To Email</Label>
            <Input
              id="replyToEmail"
              type="email"
              value={settings.replyToEmail}
              onChange={(e) => updateSetting('replyToEmail', e.target.value)}
            />
          </div>
        </>
      )}

      {section === 'integrations' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
            <Input
              id="slackWebhookUrl"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.slackWebhookUrl}
              onChange={(e) => updateSetting('slackWebhookUrl', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slackChannel">Slack Channel</Label>
            <Input
              id="slackChannel"
              placeholder="#support"
              value={settings.slackChannel}
              onChange={(e) => updateSetting('slackChannel', e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
