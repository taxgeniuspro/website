'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getUserPermissions, UserRole, type UserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  User,
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  Calendar,
  Clock,
  ChevronRight,
  Download,
  Upload,
  FileText,
  Tag,
  AlertCircle,
} from 'lucide-react';

// Contact types
type ContactType = 'lead' | 'new_client' | 'old_client' | 'referral';
type ContactSource = 'website' | 'qr_code' | 'referral_link' | 'walk_in' | 'phone' | 'other';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  type: ContactType;
  source?: ContactSource;
  tags: string[];
  dateAdded: Date;
  lastContact?: Date;
  taxIntakeCompleted?: boolean;
  referredBy?: string;
  yearStarted?: number;
  totalReturns?: number;
  status: 'active' | 'inactive' | 'pending';
}

// Generate mock contacts with varied types
const generateMockContacts = (): Contact[] => {
  const contacts: Contact[] = [];
  const firstNames = [
    'John',
    'Jane',
    'Michael',
    'Sarah',
    'David',
    'Emily',
    'Robert',
    'Lisa',
    'James',
    'Maria',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
  ];

  // Generate varied contact types
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    // Determine contact type based on distribution
    let type: ContactType;
    let tags: string[] = [];
    let source: ContactSource | undefined;
    let taxIntakeCompleted = false;
    let yearStarted: number | undefined;
    let totalReturns: number | undefined;
    let referredBy: string | undefined;

    if (i < 10) {
      // Leads
      type = 'lead';
      tags = ['Potential', '2025 Tax Season'];
      source = ['website', 'qr_code', 'walk_in', 'phone'][
        Math.floor(Math.random() * 4)
      ] as ContactSource;
    } else if (i < 20) {
      // Referrals
      type = 'referral';
      tags = ['Referred', 'Pending Intake'];
      source = 'referral_link';
      referredBy = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    } else if (i < 35) {
      // New Clients
      type = 'new_client';
      tags = ['Active', '2025 Client', 'First Year'];
      taxIntakeCompleted = true;
      yearStarted = 2025;
      totalReturns = 1;
    } else {
      // Old Clients
      type = 'old_client';
      tags = ['Returning', 'VIP'];
      taxIntakeCompleted = true;
      yearStarted = 2020 + Math.floor(Math.random() * 4);
      totalReturns = 2025 - yearStarted!;
    }

    contacts.push({
      id: `contact-${i + 1}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `(404) 555-${String(1000 + i).padStart(4, '0')}`,
      address: 'Atlanta, GA',
      type,
      source,
      tags,
      dateAdded: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      lastContact:
        Math.random() > 0.3
          ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          : undefined,
      taxIntakeCompleted,
      referredBy,
      yearStarted,
      totalReturns,
      status: Math.random() > 0.1 ? 'active' : 'pending',
    });
  }

  return contacts;
};

export default function AddressBookPage() {
  const { data: session } = useSession(); const user = session?.user;
  const [contacts] = useState<Contact[]>(generateMockContacts());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  if (!user) {
    redirect('/auth/signin');
  }

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as
    | Partial<UserPermissions>
    | undefined;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  if (!permissions.addressBook) {
    redirect('/forbidden');
  }

  // Filter contacts based on selected tab
  const filteredContacts = contacts.filter((contact) => {
    // Apply search filter
    const matchesSearch =
      searchTerm === '' ||
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm);

    // Apply tab filter
    let matchesTab = true;
    switch (selectedTab) {
      case 'leads':
        matchesTab = contact.type === 'lead';
        break;
      case 'new_clients':
        matchesTab = contact.type === 'new_client';
        break;
      case 'old_clients':
        matchesTab = contact.type === 'old_client';
        break;
      case 'referrals':
        matchesTab = contact.type === 'referral';
        break;
      case 'all':
      default:
        matchesTab = true;
    }

    return matchesSearch && matchesTab;
  });

  // Calculate counts for each type
  const counts = {
    all: contacts.length,
    leads: contacts.filter((c) => c.type === 'lead').length,
    new_clients: contacts.filter((c) => c.type === 'new_client').length,
    old_clients: contacts.filter((c) => c.type === 'old_client').length,
    referrals: contacts.filter((c) => c.type === 'referral').length,
  };

  // Today's and this week's leads
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todaysLeads = contacts.filter((c) => c.type === 'lead' && c.dateAdded >= today).length;

  const weeksLeads = contacts.filter((c) => c.type === 'lead' && c.dateAdded >= weekAgo).length;

  // Get badge variant based on contact type
  const getBadgeVariant = (type: ContactType) => {
    switch (type) {
      case 'lead':
        return 'secondary';
      case 'new_client':
        return 'default';
      case 'old_client':
        return 'outline';
      case 'referral':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Get badge color classes
  const getBadgeColor = (type: ContactType) => {
    switch (type) {
      case 'lead':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'new_client':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'old_client':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'referral':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return '';
    }
  };

  // Get icon for contact type
  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case 'lead':
        return UserPlus;
      case 'new_client':
        return UserCheck;
      case 'old_client':
        return Users;
      case 'referral':
        return TrendingUp;
      default:
        return User;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Unified Address Book
              </h1>
              <p className="text-muted-foreground mt-2">
                All contacts, clients, leads, and referrals in one place
              </p>
            </div>
            <div className="space-x-2">
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-blue-50 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {counts.old_clients}
                  </p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Old Clients
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {counts.new_clients}
                  </p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    New Clients
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {counts.referrals}
                  </p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Referrals
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                    {counts.leads}
                  </p>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Total Leads
                  </p>
                </div>
                <UserPlus className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    Today&apos;s Leads
                  </p>
                  <span className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {todaysLeads}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    This Week
                  </p>
                  <span className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {weeksLeads}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Contact Management</CardTitle>
                <CardDescription>Filter and manage all your contacts</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  All ({counts.all})
                </TabsTrigger>
                <TabsTrigger value="leads" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Leads ({counts.leads})
                </TabsTrigger>
                <TabsTrigger value="new_clients" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  New Clients ({counts.new_clients})
                </TabsTrigger>
                <TabsTrigger value="old_clients" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Old Clients ({counts.old_clients})
                </TabsTrigger>
                <TabsTrigger value="referrals" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Referrals ({counts.referrals})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-0">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">No contacts found</p>
                    <p className="text-muted-foreground">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredContacts.map((contact) => {
                      const Icon = getContactIcon(contact.type);
                      const badgeColor = getBadgeColor(contact.type);

                      return (
                        <div
                          key={contact.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-all hover:border-primary/50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className={cn(
                                'w-12 h-12 rounded-full flex items-center justify-center',
                                contact.type === 'lead' && 'bg-yellow-100 dark:bg-yellow-900',
                                contact.type === 'new_client' && 'bg-green-100 dark:bg-green-900',
                                contact.type === 'old_client' && 'bg-blue-100 dark:bg-blue-900',
                                contact.type === 'referral' && 'bg-purple-100 dark:bg-purple-900'
                              )}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge className={badgeColor}>
                                {contact.type
                                  .replace('_', ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Badge>
                              {contact.status === 'pending' && (
                                <Badge variant="outline" className="text-xs">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>

                          <h3 className="font-medium mb-1">
                            {contact.firstName} {contact.lastName}
                          </h3>

                          {/* Contact Tags */}
                          {contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {contact.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {contact.address}
                            </div>

                            {/* Additional Info based on type */}
                            {contact.type === 'referral' && contact.referredBy && (
                              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <ChevronRight className="w-3 h-3" />
                                Referred by {contact.referredBy}
                              </div>
                            )}

                            {(contact.type === 'new_client' || contact.type === 'old_client') && (
                              <>
                                {contact.taxIntakeCompleted && (
                                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <FileText className="w-3 h-3" />
                                    Tax Intake Complete
                                  </div>
                                )}
                                {contact.yearStarted && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Client since {contact.yearStarted}
                                  </div>
                                )}
                                {contact.totalReturns && contact.totalReturns > 1 && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {contact.totalReturns} returns filed
                                  </div>
                                )}
                              </>
                            )}

                            {contact.source && (
                              <div className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                Source: {contact.source.replace('_', ' ')}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" className="flex-1">
                              View
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              Edit
                            </Button>
                            {contact.type === 'lead' && (
                              <Button size="sm" className="flex-1">
                                Convert
                              </Button>
                            )}
                            {contact.type === 'referral' && !contact.taxIntakeCompleted && (
                              <Button size="sm" className="flex-1">
                                Send Intake
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
