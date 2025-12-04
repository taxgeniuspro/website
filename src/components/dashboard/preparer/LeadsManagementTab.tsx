'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Search, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Lead {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export function LeadsManagementTab() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/preparers/leads');

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      logger.error('Error fetching leads', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (newRole !== 'client') {
      toast({
        title: 'Invalid Action',
        description: 'You can only promote leads to clients',
        variant: 'destructive',
      });
      return;
    }

    try {
      setChangingRole(userId);

      const response = await fetch('/api/preparers/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change role');
      }

      const data = await response.json();

      // Remove the lead from the list (they're now a client)
      setLeads((prev) => prev.filter((lead) => lead.id !== userId));

      toast({
        title: 'Success',
        description: `${data.user.firstName} ${data.user.lastName} is now a client`,
      });
    } catch (error) {
      logger.error('Error changing role', error, { userId });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change role',
        variant: 'destructive',
      });
    } finally {
      setChangingRole(null);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      searchQuery === '' ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Leads</CardTitle>
        <CardDescription>
          Approve leads and promote them to clients. As a tax preparer, you can only change leads to
          clients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Info Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Limited Access:</strong> Tax preparers can only promote leads to clients. To
            create affiliates or tax preparers, contact an administrator.
          </AlertDescription>
        </Alert>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* Leads Table */}
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Pending Leads</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'No leads match your search.'
                : 'All leads have been approved or there are no new signups.'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const isChanging = changingRole === lead.id;
                  const signupDate = new Date(lead.createdAt).toLocaleDateString();

                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {lead.id.substring(0, 12)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200"
                        >
                          Pending Approval
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{signupDate}</TableCell>
                      <TableCell className="text-right">
                        <Select
                          disabled={isChanging}
                          onValueChange={(value) => handleRoleChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Promote to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">✅ Promote to Client</SelectItem>
                            <SelectItem value="affiliate" disabled>
                              🚫 Affiliate (Admin Only)
                            </SelectItem>
                            <SelectItem value="tax_preparer" disabled>
                              🚫 Tax Preparer (Admin Only)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {isChanging && (
                          <Loader2 className="h-4 w-4 animate-spin inline-block ml-2" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
