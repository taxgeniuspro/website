'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Share2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface SocialMediaData {
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
}

export function SocialMediaLinksForm() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<SocialMediaData>({
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    tiktokUrl: '',
  });

  // Fetch current profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const profile = await response.json();
          setFormData({
            facebookUrl: profile.facebookUrl || '',
            instagramUrl: profile.instagramUrl || '',
            linkedinUrl: profile.linkedinUrl || '',
            twitterUrl: profile.twitterUrl || '',
            youtubeUrl: profile.youtubeUrl || '',
            tiktokUrl: profile.tiktokUrl || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const handleChange = (field: keyof SocialMediaData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast.success('Social media links saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save social media links');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          <CardTitle>Social Media Links</CardTitle>
        </div>
        <CardDescription>
          Add your social media profiles. These will appear in the footer when clients view your
          pages. If not provided, Tax Genius Pro&apos;s social links will be shown instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook</Label>
            <Input
              id="facebookUrl"
              type="url"
              placeholder="https://facebook.com/yourpage"
              value={formData.facebookUrl}
              onChange={(e) => handleChange('facebookUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input
              id="instagramUrl"
              type="url"
              placeholder="https://instagram.com/yourprofile"
              value={formData.instagramUrl}
              onChange={(e) => handleChange('instagramUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn</Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={formData.linkedinUrl}
              onChange={(e) => handleChange('linkedinUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitterUrl">Twitter / X</Label>
            <Input
              id="twitterUrl"
              type="url"
              placeholder="https://twitter.com/yourhandle"
              value={formData.twitterUrl}
              onChange={(e) => handleChange('twitterUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube</Label>
            <Input
              id="youtubeUrl"
              type="url"
              placeholder="https://youtube.com/@yourchannel"
              value={formData.youtubeUrl}
              onChange={(e) => handleChange('youtubeUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktokUrl">TikTok</Label>
            <Input
              id="tiktokUrl"
              type="url"
              placeholder="https://tiktok.com/@yourprofile"
              value={formData.tiktokUrl}
              onChange={(e) => handleChange('tiktokUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Social Media Links
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
