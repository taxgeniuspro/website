'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon, Check, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { ImageCropModal } from '@/components/ImageCropModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SetupMarketingProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoChoice, setLogoChoice] = useState<'taxgenius' | 'custom' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Fetch current profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session?.user?.id,
  });

  // Check if they already have a logo set
  useEffect(() => {
    if (profile?.qrCodeLogoUrl) {
      setSetupComplete(true);
    }
  }, [profile]);

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/profile/qr-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Logo saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSetupComplete(true);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save logo');
    },
  });

  // Use TaxGenius logo mutation
  const useTaxGeniusLogoMutation = useMutation({
    mutationFn: async () => {
      // Just delete any custom logo - this will make the system use the default
      const response = await fetch('/api/profile/qr-logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to update logo setting');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('TaxGenius logo will be used for your marketing materials');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSetupComplete(true);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update logo setting');
    },
  });

  const handleLogoChoice = (choice: 'taxgenius' | 'custom') => {
    setLogoChoice(choice);

    if (choice === 'taxgenius') {
      // Use TaxGenius logo
      useTaxGeniusLogoMutation.mutate();
    } else {
      // Open file picker for custom upload
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCropModal(true);
  };

  const handleSaveCroppedImage = async (croppedFile: File) => {
    await uploadLogoMutation.mutateAsync(croppedFile);
  };

  const handleUpdateLogo = () => {
    setSetupComplete(false);
    setLogoChoice(null);
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Profile Setup</h1>
        <p className="text-muted-foreground">
          Set up your profile photo for lead generation pages and marketing materials
        </p>
      </div>

      {/* Main Setup Card */}
      {!setupComplete ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Logo</CardTitle>
            <CardDescription>
              Select which logo to use for your lead gen pages, intake forms, and marketing materials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* TaxGenius Logo Option */}
              <button
                onClick={() => handleLogoChoice('taxgenius')}
                disabled={useTaxGeniusLogoMutation.isPending}
                className={`
                  p-6 border-2 rounded-lg transition-all hover:border-primary hover:shadow-md
                  ${logoChoice === 'taxgenius' ? 'border-primary bg-primary/5' : 'border-border'}
                  ${useTaxGeniusLogoMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="space-y-4">
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    <span className="ml-2 text-sm font-medium">TaxGenius Logo</span>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold">Use TaxGenius Logo</h3>
                    <p className="text-sm text-muted-foreground">
                      Professional branding with the TaxGenius logo
                    </p>
                  </div>
                </div>
              </button>

              {/* Custom Photo Option */}
              <button
                onClick={() => handleLogoChoice('custom')}
                disabled={uploadLogoMutation.isPending}
                className={`
                  p-6 border-2 rounded-lg transition-all hover:border-primary hover:shadow-md
                  ${logoChoice === 'custom' ? 'border-primary bg-primary/5' : 'border-border'}
                  ${uploadLogoMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="space-y-4">
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <Upload className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold">Upload Your Photo</h3>
                    <p className="text-sm text-muted-foreground">
                      Personalize with your own photo or logo
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Loading states */}
            {(useTaxGeniusLogoMutation.isPending || uploadLogoMutation.isPending) && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Setting up your profile...</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Setup Complete Card */
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Check className="w-5 h-5" />
              Setup Complete!
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-500">
              Your marketing profile is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.qrCodeLogoUrl && (
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-full border-2 border-green-200 overflow-hidden bg-white">
                  <Image
                    src={profile.qrCodeLogoUrl}
                    alt="Your logo"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Your Logo</p>
                  <p className="text-xs text-muted-foreground">
                    This will appear on your lead gen pages, intake forms, and marketing materials
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleUpdateLogo} variant="outline">
                Update Logo
              </Button>
              <Button onClick={() => router.push('/dashboard/tax-preparer')} variant="default">
                Continue to Dashboard
              </Button>
              <Button
                onClick={() => router.push('/dashboard/tax-preparer/marketing-products')}
                variant="default"
                className="ml-auto"
              >
                <QrCode className="w-4 h-4 mr-2" />
                View Marketing Products
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p>Your logo will be automatically used on all lead generation and intake pages</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p>Your tracking QR codes will feature this logo for brand consistency</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p>
              Order marketing materials (business cards, postcards, door hangers, posters) with your
              logo and QR codes
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <p>You can update your logo anytime from your profile settings</p>
          </div>
        </CardContent>
      </Card>

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
          onSave={handleSaveCroppedImage}
          title="Crop Your Logo"
          description="Adjust your image to use in your marketing materials and QR codes. The image will be cropped to a square."
        />
      )}
    </div>
  );
}
