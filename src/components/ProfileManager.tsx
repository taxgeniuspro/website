import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/core/hooks/useProfile';
import { User, Settings, ExternalLink } from 'lucide-react';
import { logger } from '@/lib/logger';

export const ProfileManager: React.FC = () => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user;
  const { profile, isLoading, updateProfile, updateProfileLoading, setVanitySlug } = useProfile();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [vanitySlugInput, setVanitySlugInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await updateProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
      });
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
      logger.error('Profile update error:', err);
    }
  };

  const handleSetVanitySlug = async () => {
    setError('');
    setMessage('');

    if (!vanitySlugInput.trim()) {
      setError('Please enter a vanity URL');
      return;
    }

    const result = await setVanitySlug(vanitySlugInput.trim());
    if (result.success) {
      setMessage('Vanity URL set successfully!');
      setVanitySlugInput('');
    } else {
      setError(result.error || 'Failed to set vanity URL');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Alert>
        <AlertDescription>Please log in to view your profile.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display current profile status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Badge variant={profile?.role ? 'default' : 'secondary'}>
              {profile?.role || 'Not set'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="text-sm">{user.email}</span>
          </div>

          {profile?.vanity_slug && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vanity URL:</span>
              <a
                href={`/r/${profile.vanity_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                TaxGenius.com/{profile.vanity_slug}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Messages */}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Update Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  disabled={updateProfileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  disabled={updateProfileLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                disabled={updateProfileLoading}
              />
            </div>

            <Button type="submit" disabled={updateProfileLoading}>
              <Settings className="h-4 w-4 mr-2" />
              {updateProfileLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Vanity URL Card (for clients and affiliates who can refer) */}
      {(profile?.role === 'client' || profile?.role === 'affiliate') && !profile?.vanity_slug && (
        <Card>
          <CardHeader>
            <CardTitle>Set Your Vanity URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a custom URL for your referral link (e.g., TaxGenius.com/YourName)
            </p>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-border rounded-l-md">
                    TaxGenius.com/
                  </span>
                  <Input
                    value={vanitySlugInput}
                    onChange={(e) => setVanitySlugInput(e.target.value)}
                    placeholder="YourName"
                    className="rounded-l-none"
                    disabled={updateProfileLoading}
                  />
                </div>
              </div>
              <Button onClick={handleSetVanitySlug} disabled={updateProfileLoading}>
                Set URL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
