/**
 * Create Short Link Form Component
 *
 * Allows users to create trackable short links with:
 * - Real-time availability checking
 * - Destination selection (Intake Form, Contact Form, Custom URL)
 * - Optional metadata (title, description, campaign)
 * - URL preview
 * - QR code generation
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { logger } from '@/lib/logger';
import { INPUT_DEBOUNCE_DELAY, SHORT_LINK_CODE, LINK_METADATA, QR_CODE } from '@/lib/constants';

type DestinationType = 'INTAKE_FORM' | 'CONTACT_FORM' | 'CUSTOM';

interface Destination {
  type: DestinationType;
  customUrl?: string;
}

export function CreateShortLinkForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [shortCode, setShortCode] = useState('');
  const [destinationType, setDestinationType] = useState<DestinationType>('INTAKE_FORM');
  const [customUrl, setCustomUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [campaign, setCampaign] = useState('');

  // Availability checking
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);

  // Generated link data
  const [generatedLink, setGeneratedLink] = useState<{
    code: string;
    url: string;
    fullUrl: string;
  } | null>(null);

  // Real-time availability checking
  useEffect(() => {
    if (!shortCode || shortCode.length < 3) {
      setAvailabilityStatus(null);
      return;
    }

    const checkAvailability = async () => {
      setIsCheckingAvailability(true);
      try {
        const response = await fetch('/api/links/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: shortCode.trim() }),
        });

        const data = await response.json();
        setAvailabilityStatus(data);
      } catch (error) {
        logger.error('Error checking availability:', error);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, INPUT_DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [shortCode]);

  // Build preview URL
  const getPreviewUrl = () => {
    if (!shortCode) return null;
    return `${window.location.origin}/go/${shortCode.toLowerCase()}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Build destination object
      const destination: Destination = {
        type: destinationType,
        customUrl: destinationType === 'CUSTOM' ? customUrl : undefined,
      };

      // Submit to API
      const response = await fetch('/api/links/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortCode: shortCode.trim(),
          destination,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          campaign: campaign.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create short link');
      }

      // Success! Show the generated link
      setGeneratedLink({
        code: data.data.code,
        url: data.data.shortUrl,
        fullUrl: data.data.url,
      });
      setSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to create short link');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setShortCode('');
    setDestinationType('INTAKE_FORM');
    setCustomUrl('');
    setTitle('');
    setDescription('');
    setCampaign('');
    setAvailabilityStatus(null);
    setSuccess(false);
    setGeneratedLink(null);
    setError(null);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Download QR code
  const downloadQRCode = () => {
    if (!generatedLink) return;

    const svg = document.getElementById('qr-code');
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
      downloadLink.download = `qr-${generatedLink.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // If link was successfully created, show success state
  if (success && generatedLink) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Short Link Created!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your trackable short link is ready to use
              </p>
            </div>
          </div>

          {/* Generated URL */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
              Your Short Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatedLink.url}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(generatedLink.url)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4 flex flex-col items-center">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-3">
              QR Code
            </label>
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                id="qr-code"
                value={generatedLink.url}
                size={QR_CODE.SIZE}
                level={QR_CODE.ERROR_CORRECTION}
                includeMargin={QR_CODE.INCLUDE_MARGIN}
              />
            </div>
            <button
              onClick={downloadQRCode}
              className="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Download QR Code
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Another Link
            </button>
            <button
              onClick={() => router.push('/admin/quick-share')}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-colors"
            >
              View All Links
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Short Code Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Short Code *
        </label>
        <div className="relative">
          <div className="flex items-center">
            <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-sm text-gray-500 dark:text-gray-400">
              /go/
            </span>
            <input
              type="text"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.toLowerCase())}
              placeholder="johnatlanta"
              required
              minLength={SHORT_LINK_CODE.MIN_LENGTH}
              maxLength={SHORT_LINK_CODE.MAX_LENGTH}
              pattern={SHORT_LINK_CODE.PATTERN.source}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
            />
          </div>

          {/* Availability indicator */}
          {shortCode.length >= 3 && (
            <div className="mt-2 flex items-center gap-2">
              {isCheckingAvailability ? (
                <span className="text-xs text-gray-500">Checking availability...</span>
              ) : availabilityStatus ? (
                <>
                  {availabilityStatus.available ? (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Available
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {availabilityStatus.reason}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          3-30 characters, must start with a letter, alphanumeric and hyphens only
        </p>

        {/* Preview URL */}
        {shortCode && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview:</p>
            <p className="text-sm font-mono text-primary-600 dark:text-primary-400">
              {getPreviewUrl()}
            </p>
          </div>
        )}
      </div>

      {/* Destination Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Destination *
        </label>
        <div className="space-y-3">
          {/* Intake Form */}
          <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input
              type="radio"
              name="destination"
              value="INTAKE_FORM"
              checked={destinationType === 'INTAKE_FORM'}
              onChange={(e) => setDestinationType(e.target.value as DestinationType)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">Tax Intake Form</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                For people ready to file taxes immediately
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                /start-filing/form
              </div>
            </div>
          </label>

          {/* Contact Form */}
          <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input
              type="radio"
              name="destination"
              value="CONTACT_FORM"
              checked={destinationType === 'CONTACT_FORM'}
              onChange={(e) => setDestinationType(e.target.value as DestinationType)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">Contact/Lead Form</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                For people wanting more information
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                /contact
              </div>
            </div>
          </label>

          {/* Custom URL */}
          <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input
              type="radio"
              name="destination"
              value="CUSTOM"
              checked={destinationType === 'CUSTOM'}
              onChange={(e) => setDestinationType(e.target.value as DestinationType)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">Custom URL</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Redirect to any page on TaxGeniusPro
              </div>
              {destinationType === 'CUSTOM' && (
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="/your-custom-page"
                  required
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-sm"
                />
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Optional Fields */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Optional Information
        </h3>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Instagram Profile Link"
            maxLength={LINK_METADATA.TITLE_MAX_LENGTH}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            A friendly name to help you identify this link
          </p>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Link shared on Instagram bio"
            rows={3}
            maxLength={LINK_METADATA.DESCRIPTION_MAX_LENGTH}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
          />
        </div>

        {/* Campaign */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Campaign
          </label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="e.g., Tax Season 2025"
            maxLength={LINK_METADATA.CAMPAIGN_MAX_LENGTH}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Group links by marketing campaign
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetForm}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !shortCode ||
            (availabilityStatus && !availabilityStatus.available) ||
            (destinationType === 'CUSTOM' && !customUrl)
          }
          className="flex-1 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Short Link'}
        </button>
      </div>
    </form>
  );
}
