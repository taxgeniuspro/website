import ReferralSignupForm from '@/components/ReferralSignupForm';
import { CheckCircle, DollarSign, Users, TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Sign Up for Tax Genius Referral Program | Get Your Link',
  description:
    'Quick signup - get your referral link instantly. Start earning $50 per referral today!',
};

export default function ReferralSignupPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">You're Almost There!</h1>
          <p className="text-xl">
            Fill out the quick form below and you'll get your referral link in seconds!
          </p>
        </div>
      </section>

      {/* Form Section with Image */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Image Placeholder */}
            <div className="hidden lg:block sticky top-24">
              <div className="relative h-[600px] rounded-2xl overflow-hidden shadow-2xl border-4 border-green-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/5 flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="text-8xl mb-4">💸</div>
                    <p className="text-lg font-semibold text-muted-foreground">
                      [Referral Success Image]
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Person celebrating earning money
                    </p>
                    <p className="text-xs text-muted-foreground/60">Recommended size: 600x800px</p>
                  </div>
                </div>
              </div>

              {/* Quick Benefits */}
              <div className="mt-8 space-y-4">
                <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Get Paid $50+ Per Referral</p>
                    <p className="text-sm text-muted-foreground">Plus bonus for first 3!</p>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Share Everywhere</p>
                    <p className="text-sm text-muted-foreground">
                      Social media, text, email, anywhere!
                    </p>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Weekly Payouts</p>
                    <p className="text-sm text-muted-foreground">Get paid fast and reliably</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div>
              <ReferralSignupForm />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">1,200+</div>
              <div className="text-sm text-muted-foreground">Active Referrers</div>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">$500K+</div>
              <div className="text-sm text-muted-foreground">Paid Out</div>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-sm text-muted-foreground">Successful Referrals</div>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">4.8/5</div>
              <div className="text-sm text-muted-foreground">Partner Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          <p>Questions? Email us at referrals@taxgenius.com or call (555) 123-4567</p>
        </div>
      </section>
    </div>
  );
}
