'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Briefcase, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export function MarketingContactForm() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    professionalTitle: '',
    website: '',
    publicAddress: '',
    phone: '',
    companyName: '',
  });

  // Fetch current profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const profile = await response.json();
          setFormData({
            professionalTitle: profile.professionalTitle || '',
            website: profile.website || '',
            publicAddress: profile.publicAddress || '',
            phone: profile.phone || '',
            companyName: profile.companyName || '',
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

  const handleChange = (field: string, value: string) => {
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

      toast.success('Marketing contact information saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save marketing contact information');
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
          <Briefcase className="w-5 h-5" />
          <CardTitle>Marketing Contact Information</CardTitle>
        </div>
        <CardDescription>
          This information will appear on your marketing materials (business cards, postcards, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Business/Company Name</Label>
            <Input
              id="companyName"
              placeholder="Smith Tax Services"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="professionalTitle">Professional Title</Label>
            <Input
              id="professionalTitle"
              placeholder="Licensed Tax Preparer, CPA, EA"
              value={formData.professionalTitle}
              onChange={(e) => handleChange('professionalTitle', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="marketingPhone">Phone Number</Label>
            <Input
              id="marketingPhone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.yourwebsite.com"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="publicAddress">Business Address</Label>
          <Input
            id="publicAddress"
            placeholder="123 Main St, City, State ZIP"
            value={formData.publicAddress}
            onChange={(e) => handleChange('publicAddress', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This address will be printed on your marketing materials
          </p>
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
                Save Contact Information
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
