'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';

interface AffiliateLead {
  id: string;
  first_name: string;
  last_name: string;
  fullName: string;
  status: string;
  referrerUsername: string;
  attributionMethod: string;
  convertedToClient: boolean;
  created_at: string;
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
  conversionRate: number;
}

export default function AffiliateLeadsPage() {
  const [leads, setLeads] = useState<AffiliateLead[]>([]);
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    new: 0,
    contacted: 0,
    converted: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/affiliate/leads?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLeads(data.leads || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'contacted':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'new':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'converted':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'contacted':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'new':
        return <UserPlus className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const filteredLeads = leads.filter((lead) =>
    searchTerm === '' ||
    lead.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground mt-1">Track your referred leads</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">Successful conversions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Lead to customer rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
            <p className="text-xs text-muted-foreground">Awaiting contact</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lead List</CardTitle>
              <CardDescription>All your referred leads (names only for privacy)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No leads found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Share your tracking link to start referring clients
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-lg">{lead.fullName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(lead.status)}
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </div>
                        {lead.convertedToClient && (
                          <Badge className="mt-2 bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Converted
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Sources & Conversion Funnel */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Current status of your leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New Leads</span>
                  <span className="font-medium">
                    {stats.new} ({stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-yellow-600 flex items-center px-2 text-white text-xs font-medium"
                    style={{
                      width: `${stats.total > 0 ? (stats.new / stats.total) * 100 : 0}%`,
                    }}
                  >
                    {stats.new}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contacted</span>
                  <span className="font-medium">
                    {stats.contacted} ({stats.total > 0 ? Math.round((stats.contacted / stats.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-600 flex items-center px-2 text-white text-xs font-medium"
                    style={{
                      width: `${stats.total > 0 ? (stats.contacted / stats.total) * 100 : 0}%`,
                    }}
                  >
                    {stats.contacted}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Converted</span>
                  <span className="font-medium">
                    {stats.converted} ({stats.conversionRate}%)
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-green-600 flex items-center px-2 text-white text-xs font-medium"
                    style={{ width: `${stats.conversionRate}%` }}
                  >
                    {stats.converted}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Your referral success</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Total Referrals</span>
                </div>
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Successful</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{stats.converted}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">In Progress</span>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{stats.new + stats.contacted}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
