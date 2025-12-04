/**
 * Short Link Card Component
 *
 * Displays a single short link with:
 * - Link information and analytics
 * - Quick actions (copy, QR code, edit, delete)
 * - Toggle active/inactive status
 * - Destination type badge
 */

'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { logger } from '@/lib/logger';
import { TOAST_DISMISS_DELAY, QR_CODE } from '@/lib/constants';
import {
  Link2,
  Copy,
  QrCode,
  Edit,
  Trash2,
  ExternalLink,
  MousePointerClick,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  Check,
  X,
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

interface ShortLinkCardProps {
  link: ShortLink;
  onUpdate: () => void;
  onDelete: () => void;
}

export function ShortLinkCard({ link, onUpdate, onDelete }: ShortLinkCardProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState(link.title || '');
  const [editDescription, setEditDescription] = useState(link.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), TOAST_DISMISS_DELAY);
  };

  // Download QR code
  const downloadQRCode = () => {
    const svg = document.getElementById(`qr-code-${link.code}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${link.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Toggle active status
  const toggleActive = async () => {
    try {
      const response = await fetch(`/api/links/${link.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      onUpdate();
    } catch (error) {
      logger.error('Error toggling link status:', error);
      alert('Failed to update link status');
    }
  };

  // Save edits
  const handleSaveEdit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/links/${link.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          description: editDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      logger.error('Error updating link:', error);
      alert('Failed to update link');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete link
  const handleDelete = async () => {
    if (
      !confirm(`Are you sure you want to delete the link "${link.code}"? This cannot be undone.`)
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/links/${link.code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      onDelete();
    } catch (error) {
      logger.error('Error deleting link:', error);
      alert('Failed to delete link');
      setIsDeleting(false);
    }
  };

  // Get destination badge
  const getDestinationBadge = () => {
    const badges = {
      INTAKE_FORM: {
        label: 'Tax Intake',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
      CONTACT_FORM: {
        label: 'Contact Form',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
      CUSTOM: {
        label: 'Custom URL',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      },
    };

    const badge = badges[link.destination.type as keyof typeof badges] || {
      label: link.destination.type,
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 border rounded-lg overflow-hidden transition-all ${
        link.isActive
          ? 'border-gray-200 dark:border-gray-800'
          : 'border-gray-300 dark:border-gray-700 opacity-60'
      } ${isDeleting ? 'animate-pulse' : ''}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link2
                className={`w-5 h-5 ${link.isActive ? 'text-primary-600' : 'text-gray-400'}`}
              />
              <span className="font-mono font-semibold text-lg">/{link.code}</span>
              {getDestinationBadge()}
              <button
                onClick={toggleActive}
                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                  link.isActive ? 'text-green-600' : 'text-gray-400'
                }`}
                title={
                  link.isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'
                }
              >
                {link.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Title and Description */}
            {isEditing ? (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Add a title..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditTitle(link.title || '');
                      setEditDescription(link.description || '');
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {link.title && (
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {link.title}
                  </p>
                )}
                {link.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {link.description}
                  </p>
                )}
                {link.campaign && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Campaign: {link.campaign}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(link.shortUrl)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Show QR code"
              >
                <QrCode className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => window.open(link.shortUrl, '_blank')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Open link"
              >
                <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Edit link"
              >
                <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete link"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          )}
        </div>

        {/* Short URL */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-primary-600 dark:text-primary-400">
              {link.shortUrl}
            </span>
            <button
              onClick={() => copyToClipboard(link.shortUrl)}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRCode && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg mb-3">
              <QRCodeSVG
                id={`qr-code-${link.code}`}
                value={link.shortUrl}
                size={QR_CODE.SIZE}
                level={QR_CODE.ERROR_CORRECTION}
                includeMargin={QR_CODE.INCLUDE_MARGIN}
              />
            </div>
            <button
              onClick={downloadQRCode}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Download QR Code
            </button>
          </div>
        )}

        {/* Analytics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MousePointerClick className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold">{link.clicks.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-lg font-bold">{link.uniqueClicks.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Unique</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold">{link.leads.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Leads</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-lg font-bold">{link.conversions.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
          {link.clicks > 0 && (
            <span>{((link.conversions / link.clicks) * 100).toFixed(1)}% conversion rate</span>
          )}
        </div>
      </div>
    </div>
  );
}
