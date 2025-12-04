/**
 * Quick Share Dashboard Component
 *
 * Main dashboard for managing short links with:
 * - Link creation
 * - Link management
 * - Analytics display
 * - QR code generation
 */

'use client';

import { useState, useEffect } from 'react';
import { CreateShortLinkForm } from './CreateShortLinkForm';
import { ShortLinkCard } from './ShortLinkCard';
import {
  Link2,
  Plus,
  MousePointerClick,
  Users,
  TrendingUp,
  Eye,
  Filter,
  Search,
} from 'lucide-react';

interface ShortLink {
  id: string;
  code: string;
  url: string;
  shortUrl: string;
  destination: {
    type: string;
    customUrl?: string;
  };
  title?: string;
  description?: string;
  campaign?: string;
  isActive: boolean;
  clicks: number;
  uniqueClicks: number;
  leads: number;
  conversions: number;
  createdAt: string;
}

type ViewMode = 'list' | 'create';
type FilterType = 'all' | 'active' | 'inactive' | 'intake' | 'contact' | 'custom';

export function QuickShareDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Fetch links
  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/links');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch links');
      }

      setLinks(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch links');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLinks();
  }, []);

  // Handle link creation success
  const handleLinkCreated = () => {
    fetchLinks();
    setViewMode('list');
  };

  // Filter and search links
  useEffect(() => {
    let filtered = links;

    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter((link) => {
        if (filterType === 'active') return link.isActive;
        if (filterType === 'inactive') return !link.isActive;
        if (filterType === 'intake') return link.destination.type === 'INTAKE_FORM';
        if (filterType === 'contact') return link.destination.type === 'CONTACT_FORM';
        if (filterType === 'custom') return link.destination.type === 'CUSTOM';
        return true;
      });
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (link) =>
          link.code.toLowerCase().includes(query) ||
          link.title?.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query) ||
          link.campaign?.toLowerCase().includes(query)
      );
    }

    setFilteredLinks(filtered);
  }, [links, filterType, searchQuery]);

  // Calculate totals
  const totals = {
    totalClicks: links.reduce((sum, link) => sum + link.clicks, 0),
    totalLeads: links.reduce((sum, link) => sum + link.leads, 0),
    totalConversions: links.reduce((sum, link) => sum + link.conversions, 0),
    activeLinks: links.filter((link) => link.isActive).length,
    conversionRate:
      links.reduce((sum, link) => sum + link.clicks, 0) > 0
        ? (
            (links.reduce((sum, link) => sum + link.conversions, 0) /
              links.reduce((sum, link) => sum + link.clicks, 0)) *
            100
          ).toFixed(1)
        : '0.0',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Link2 className="w-8 h-8" />
                Quick Share Links
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage trackable short links for marketing and lead generation
              </p>
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'create' ? 'list' : 'create')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'create'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {viewMode === 'create' ? (
                <>
                  <Eye className="w-5 h-5" />
                  View All Links
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create New Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <MousePointerClick className="w-8 h-8 text-blue-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">TOTAL</span>
              </div>
              <p className="text-3xl font-bold">{totals.totalClicks.toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Clicks</p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-green-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">LEADS</span>
              </div>
              <p className="text-3xl font-bold">{totals.totalLeads.toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">RATE</span>
              </div>
              <p className="text-3xl font-bold">{totals.conversionRate}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <Link2 className="w-8 h-8 text-orange-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ACTIVE</span>
              </div>
              <p className="text-3xl font-bold">{totals.activeLinks}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Links</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {viewMode === 'create' ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Create New Short Link</h2>
            <CreateShortLinkForm />
          </div>
        ) : (
          <>
            {/* Search and Filter */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search links by code, title, or campaign..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
                  >
                    <option value="all">All Links</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="intake">Intake Forms</option>
                    <option value="contact">Contact Forms</option>
                    <option value="custom">Custom URLs</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Links List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <button
                  onClick={fetchLinks}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
                <Link2 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery || filterType !== 'all' ? 'No links found' : 'No short links yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchQuery || filterType !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Create your first trackable short link to get started'}
                </p>
                {!searchQuery && filterType === 'all' && (
                  <button
                    onClick={() => setViewMode('create')}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Link
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredLinks.map((link) => (
                  <ShortLinkCard
                    key={link.id}
                    link={link}
                    onUpdate={fetchLinks}
                    onDelete={fetchLinks}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
