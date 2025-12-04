/**
 * Admin CRM Permissions Management Page
 *
 * Allows admins to control which tax preparers have access to which CRM features.
 * Supports individual and bulk permission updates.
 *
 * @module app/admin/crm/permissions
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Workflow,
  ListTodo,
  BarChart3,
  TrendingUp,
  Zap,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface TaxPreparer {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  crmEmailAutomation: boolean;
  crmWorkflowAutomation: boolean;
  crmActivityTracking: boolean;
  crmAdvancedAnalytics: boolean;
  crmTaskManagement: boolean;
  crmLeadScoring: boolean;
  crmBulkActions: boolean;
}

export default function AdminCRMPermissionsPage() {
  const [preparers, setPreparers] = useState<TaxPreparer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPreset, setFilterPreset] = useState('all');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPreparers();
  }, []);

  const fetchPreparers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/tax-preparers');

      if (!response.ok) {
        throw new Error('Failed to fetch tax preparers');
      }

      const data = await response.json();
      setPreparers(data.preparers || []);
    } catch (error) {
      logger.error('Error fetching tax preparers:', error);
      toast.error('Failed to load tax preparers');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (
    preparerId: string,
    permission: keyof Omit<TaxPreparer, 'id' | 'userId' | 'firstName' | 'lastName' | 'email'>
  ) => {
    try {
      setSaving(preparerId);

      const preparer = preparers.find((p) => p.id === preparerId);
      if (!preparer) return;

      const newValue = !preparer[permission];

      const response = await fetch(`/api/admin/crm/permissions/${preparerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [permission]: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update permission');
      }

      // Update local state
      setPreparers((prev) =>
        prev.map((p) =>
          p.id === preparerId
            ? {
                ...p,
                [permission]: newValue,
              }
            : p
        )
      );

      toast.success(`Permission ${newValue ? 'granted' : 'revoked'} successfully`);
    } catch (error) {
      logger.error('Error toggling permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const applyPreset = async (preparerId: string, preset: string) => {
    try {
      setSaving(preparerId);

      const presets: Record<string, Partial<TaxPreparer>> = {
        none: {
          crmEmailAutomation: false,
          crmWorkflowAutomation: false,
          crmActivityTracking: false,
          crmAdvancedAnalytics: false,
          crmTaskManagement: false,
          crmLeadScoring: false,
          crmBulkActions: false,
        },
        basic: {
          crmEmailAutomation: false,
          crmWorkflowAutomation: false,
          crmActivityTracking: true,
          crmAdvancedAnalytics: false,
          crmTaskManagement: true,
          crmLeadScoring: false,
          crmBulkActions: false,
        },
        professional: {
          crmEmailAutomation: true,
          crmWorkflowAutomation: false,
          crmActivityTracking: true,
          crmAdvancedAnalytics: true,
          crmTaskManagement: true,
          crmLeadScoring: true,
          crmBulkActions: false,
        },
        enterprise: {
          crmEmailAutomation: true,
          crmWorkflowAutomation: true,
          crmActivityTracking: true,
          crmAdvancedAnalytics: true,
          crmTaskManagement: true,
          crmLeadScoring: true,
          crmBulkActions: true,
        },
      };

      const permissions = presets[preset];

      const response = await fetch(`/api/admin/crm/permissions/${preparerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });

      if (!response.ok) {
        throw new Error('Failed to apply preset');
      }

      // Update local state
      setPreparers((prev) =>
        prev.map((p) =>
          p.id === preparerId
            ? {
                ...p,
                ...permissions,
              }
            : p
        )
      );

      toast.success(`${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied`);
    } catch (error) {
      logger.error('Error applying preset:', error);
      toast.error('Failed to apply preset');
    } finally {
      setSaving(null);
    }
  };

  const filteredPreparers = preparers.filter((preparer) => {
    const name = `${preparer.firstName || ''} ${preparer.lastName || ''}`.toLowerCase();
    const email = preparer.email.toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = name.includes(search) || email.includes(search);

    if (!matchesSearch) return false;

    if (filterPreset === 'all') return true;

    if (filterPreset === 'none') {
      return (
        !preparer.crmEmailAutomation &&
        !preparer.crmWorkflowAutomation &&
        !preparer.crmActivityTracking &&
        !preparer.crmAdvancedAnalytics &&
        !preparer.crmTaskManagement &&
        !preparer.crmLeadScoring &&
        !preparer.crmBulkActions
      );
    }

    return true;
  });

  const getEnabledCount = (preparer: TaxPreparer) => {
    return [
      preparer.crmEmailAutomation,
      preparer.crmWorkflowAutomation,
      preparer.crmActivityTracking,
      preparer.crmAdvancedAnalytics,
      preparer.crmTaskManagement,
      preparer.crmLeadScoring,
      preparer.crmBulkActions,
    ].filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          CRM Permissions Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Control which CRM features each tax preparer can access
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Tax Preparers</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterPreset} onValueChange={setFilterPreset}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Preparers</SelectItem>
              <SelectItem value="none">No Permissions</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Preparers ({filteredPreparers.length})</CardTitle>
          <CardDescription>
            Toggle individual permissions or apply presets for quick setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Tax Preparer</TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs">Email</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <Workflow className="h-4 w-4" />
                      <span className="text-xs">Workflow</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <ListTodo className="h-4 w-4" />
                      <span className="text-xs">Activity</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-xs">Analytics</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <ListTodo className="h-4 w-4" />
                      <span className="text-xs">Tasks</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Scoring</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs">Bulk</span>
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[150px]">Quick Preset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPreparers.map((preparer) => (
                  <TableRow key={preparer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {preparer.firstName || ''} {preparer.lastName || ''}
                        </p>
                        <p className="text-sm text-muted-foreground">{preparer.email}</p>
                        <Badge variant="secondary" className="mt-1">
                          {getEnabledCount(preparer)} / 7 features
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmEmailAutomation}
                        onCheckedChange={() =>
                          togglePermission(preparer.id, 'crmEmailAutomation')
                        }
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmWorkflowAutomation}
                        onCheckedChange={() =>
                          togglePermission(preparer.id, 'crmWorkflowAutomation')
                        }
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmActivityTracking}
                        onCheckedChange={() =>
                          togglePermission(preparer.id, 'crmActivityTracking')
                        }
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmAdvancedAnalytics}
                        onCheckedChange={() =>
                          togglePermission(preparer.id, 'crmAdvancedAnalytics')
                        }
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmTaskManagement}
                        onCheckedChange={() =>
                          togglePermission(preparer.id, 'crmTaskManagement')
                        }
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmLeadScoring}
                        onCheckedChange={() => togglePermission(preparer.id, 'crmLeadScoring')}
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={preparer.crmBulkActions}
                        onCheckedChange={() => togglePermission(preparer.id, 'crmBulkActions')}
                        disabled={saving === preparer.id}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) => applyPreset(preparer.id, value)}
                        disabled={saving === preparer.id}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Apply preset..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (0/7)</SelectItem>
                          <SelectItem value="basic">Basic (2/7)</SelectItem>
                          <SelectItem value="professional">Professional (5/7)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (7/7)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPreparers.length === 0 && (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No tax preparers found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Presets</CardTitle>
          <CardDescription>Quick permission templates for common scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                None
              </h4>
              <p className="text-sm text-muted-foreground">No CRM features enabled</p>
              <Badge variant="secondary">0 / 7 features</Badge>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Basic
              </h4>
              <p className="text-sm text-muted-foreground">Essential CRM tools</p>
              <ul className="text-xs space-y-1">
                <li>• Activity Timeline</li>
                <li>• Task Management</li>
              </ul>
              <Badge>2 / 7 features</Badge>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Professional
              </h4>
              <p className="text-sm text-muted-foreground">Advanced features without automation</p>
              <ul className="text-xs space-y-1">
                <li>• Email Automation</li>
                <li>• Activity Timeline</li>
                <li>• Advanced Analytics</li>
                <li>• Task Management</li>
                <li>• Lead Scoring</li>
              </ul>
              <Badge>5 / 7 features</Badge>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                Enterprise
              </h4>
              <p className="text-sm text-muted-foreground">All CRM features unlocked</p>
              <Badge variant="default">7 / 7 features</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
