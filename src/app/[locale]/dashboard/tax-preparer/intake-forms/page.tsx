'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Phone, Mail, Calendar, User, DollarSign, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { TableSkeleton, CardSkeleton } from '@/components/SkeletonPatterns';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { formatDistanceToNow } from 'date-fns';

interface IntakeForm {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  tax_year: number;
  status: string;
  created_at: string;
  convertedToClient: boolean;
  full_form_data?: any;
  referrerUsername?: string;
  referrerType?: string;
}

interface IntakeFormStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  complete: number;
  unqualified: number;
}

/**
 * Tax Preparer Intake Forms Page
 * /dashboard/tax-preparer/intake-forms
 *
 * Displays COMPLETE intake forms (with SSN, DOB, filing status)
 * These are ready-to-file clients who submitted full tax information
 */
export default function TaxPreparerIntakeFormsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';

  const [intakeForms, setIntakeForms] = useState<IntakeForm[]>([]);
  const [stats, setStats] = useState<IntakeFormStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentFilingYear, setCurrentFilingYear] = useState<number>(2024);

  useEffect(() => {
    async function fetchIntakeForms() {
      if (!isLoaded || !user) return;

      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const response = await fetch(`/api/tax-preparer/intake-forms?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setIntakeForms(data.intakeForms || []);
          setStats(data.stats || null);
          setCurrentFilingYear(data.currentFilingYear || 2024);
        } else {
          logger.error('Failed to fetch intake forms');
        }
      } catch (error) {
        logger.error('Error fetching intake forms:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIntakeForms();
  }, [user, isLoaded, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      complete: 'bg-emerald-100 text-emerald-800',
      unqualified: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-40 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-5 w-64 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tax-preparer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Intake Forms</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Complete tax intake submissions - ready for tax preparation
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Intake Forms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New (Uncontacted)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Converted to Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tax Returns Filed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.complete}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="unqualified">Unqualified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Intake Forms Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Tax Year</TableHead>
                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intakeForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No intake forms found</p>
                    <p className="text-sm mt-1">
                      Complete intake forms will appear here when clients submit them
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                intakeForms.map(intake => (
                  <TableRow key={intake.id}>
                    <TableCell>
                      <div className="font-medium">
                        {intake.first_name} {intake.middle_name} {intake.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground sm:hidden">
                        {intake.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`mailto:${intake.email}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {intake.email}
                        </a>
                        <a
                          href={`tel:${intake.phone}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {intake.phone}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {intake.city && intake.state ? (
                        <span>
                          {intake.city}, {intake.state}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(intake.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{intake.tax_year}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDistanceToNow(new Date(intake.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/tax-preparer/leads/${intake.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
