'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, UserPlus, Mail, Phone, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface ReferralFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function ReferralSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<ReferralFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/referrals/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      setIsSuccess(true);
    } catch (error) {
      logger.error('Error submitting:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return formData.firstName && formData.lastName && formData.email && formData.phone;
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-center">
            Welcome to Tax Genius Referral Program!
          </CardTitle>
          <CardDescription className="text-center text-base">
            You're all set to start earning!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted p-6 rounded-lg space-y-3">
            <p className="font-semibold text-lg">✅ What Happens Next:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Check your email <strong>({formData.email})</strong> in the next 5 minutes
              </li>
              <li>You'll receive your unique referral link</li>
              <li>Start sharing your link everywhere!</li>
              <li>Get paid $50 for every person who files taxes using your link</li>
            </ol>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border-2 border-green-500">
            <p className="font-bold text-lg mb-2">🎉 BONUS ACTIVATED!</p>
            <p className="text-sm">
              You'll get an EXTRA $25 for your first 3 referrals! That's $75 each!
            </p>
          </div>

          <div className="text-sm text-center text-muted-foreground space-y-2">
            <p>📧 Email sent to: {formData.email}</p>
            <p>📱 Text notification sent to: {formData.phone}</p>
            <p className="pt-4">
              <strong>Didn't get the email?</strong> Check your spam folder or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="secondary"
            className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Join Referral Program
          </Badge>
          <Badge className="bg-yellow-400 text-black">🎁 Bonus Active!</Badge>
        </div>
        <CardTitle className="text-2xl">Almost Done! Enter Your Info</CardTitle>
        <CardDescription>
          Takes 30 seconds. Then you'll get your referral link instantly!
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  required
                  className="text-lg p-6 pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Smith"
                  required
                  className="text-lg p-6 pl-11"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john.smith@example.com"
                required
                className="text-lg p-6 pl-11"
              />
            </div>
            <p className="text-xs text-muted-foreground">We'll send your referral link here</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                required
                className="text-lg p-6 pl-11"
              />
            </div>
            <p className="text-xs text-muted-foreground">For payout notifications</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg text-sm">
            <p className="font-semibold mb-2">By signing up, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Receive your referral link via email</li>
              <li>Get paid $50 for each successful referral</li>
              <li>Receive payment updates via text/email</li>
            </ul>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-bold"
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Get My Referral Link Now!
              </>
            )}
          </Button>

          <div className="text-center">
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${isFormValid() ? 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isFormValid() ? '✓ Ready to submit' : 'Fill in all fields above'}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
