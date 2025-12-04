'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, User, Mail, Phone, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { ImageCropModal } from '@/components/ImageCropModal';
import { TaxPreparerCreatedSuccess } from './TaxPreparerCreatedSuccess';

interface CreateTaxPreparerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTaxPreparerModal({ isOpen, onClose, onSuccess }: CreateTaxPreparerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [customTrackingCode, setCustomTrackingCode] = useState('');

  // Photo state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedPhotoDataUrl, setCroppedPhotoDataUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<any | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Auto-generate tracking code preview
  const getAutoTrackingCode = () => {
    if (!firstName || !lastName) return '';

    const f = firstName.charAt(0).toLowerCase();
    const m = middleName ? middleName.charAt(0).toLowerCase() : '';
    const l = lastName.charAt(0).toLowerCase();

    return m ? `${f}${m}${l}` : `${f}${l}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCropModal(true);
  };

  const handlePhotoSaved = async (croppedFile: File) => {
    // Convert to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppedPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCroppedPhotoDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !firstName || !lastName) {
      toast.error('Email, first name, and last name are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          middleName,
          phone,
          customTrackingCode: customTrackingCode.trim() || undefined,
          photoDataUrl: croppedPhotoDataUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast.success('Tax preparer account created successfully!');
      setCreatedAccount(data.data);
      setShowSuccessScreen(true);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessScreen(false);
    handleReset();
    onClose();
  };

  const handleCreateAnother = () => {
    setShowSuccessScreen(false);
    handleReset();
  };

  const handleReset = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setPhone('');
    setCustomTrackingCode('');
    handleRemovePhoto();
    setCreatedAccount(null);
  };

  if (showSuccessScreen && createdAccount) {
    return (
      <TaxPreparerCreatedSuccess
        isOpen={isOpen}
        accountData={createdAccount}
        onClose={handleCloseSuccess}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Tax Preparer Account</DialogTitle>
            <DialogDescription>
              Create a new tax preparer account. They will receive an email to set their password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name (Optional)</Label>
                  <Input
                    id="middleName"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Michael"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for tracking code initials
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>
            </div>

            {/* Tracking Code */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Tracking Code
              </h3>

              <div className="space-y-2">
                <Label htmlFor="customTrackingCode">Custom Tracking Code (Optional)</Label>
                <Input
                  id="customTrackingCode"
                  value={customTrackingCode}
                  onChange={(e) => setCustomTrackingCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  placeholder="Leave blank to auto-generate"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {customTrackingCode.trim()
                    ? `Will use: "${customTrackingCode}"`
                    : getAutoTrackingCode()
                    ? `Will auto-generate: "${getAutoTrackingCode()}"`
                    : 'Enter name to see preview'}
                </p>
              </div>
            </div>

            {/* Profile Photo */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Profile Photo (Optional)</h3>

              {croppedPhotoDataUrl ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full border-2 border-primary overflow-hidden">
                    <Image
                      src={croppedPhotoDataUrl}
                      alt="Profile photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Photo Ready</p>
                    <p className="text-xs text-muted-foreground">
                      This photo will be used for their profile and QR codes
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePhoto}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload a profile photo. If skipped, they can add one later.
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Create & Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Crop Modal */}
      {showCropModal && previewUrl && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setPreviewUrl(null);
            setSelectedFile(null);
          }}
          imageUrl={previewUrl}
          onSave={handlePhotoSaved}
          title="Crop Profile Photo"
          description="Adjust the photo for the tax preparer's profile and QR codes."
        />
      )}
    </>
  );
}
