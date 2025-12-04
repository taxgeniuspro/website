import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CountdownTimer from '@/components/CountdownTimer';
import { CheckCircle, Star, DollarSign, Users, Gift, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Earn Money Referring Tax Clients - Get Paid $50 Per Referral | Tax Genius',
  description:
    'Join Tax Genius Referral Program! Earn $50+ for every client you refer. No experience needed. Get paid weekly. Start earning today!',
};

export default function ReferralJoinPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        </div>

        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <div className="space-y-6">
            <Badge className="inline-block bg-yellow-400 text-black px-6 py-3 text-lg hover:bg-yellow-500">
              <Gift className="w-5 h-5 inline mr-2" />
              LIMITED TIME BONUS!
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
              EARN <span className="text-yellow-300">$50+</span>
              <br />
              FOR EVERY PERSON
              <br />
              YOU REFER!
            </h1>

            <h2 className="text-2xl md:text-3xl font-bold">
              Make Money Just By Telling People About Tax Genius!
            </h2>

            <div className="bg-white/10 backdrop-blur-sm inline-block px-8 py-4 rounded-lg font-bold text-xl md:text-2xl mt-4 border-2 border-white/30">
              NO EXPERIENCE NEEDED • GET PAID WEEKLY • 100% FREE TO JOIN
            </div>

            <div className="mt-8">
              <CountdownTimer />
              <p className="mt-4 text-lg">⚡ Bonus $25 for first 3 referrals this week!</p>
            </div>

            <div className="pt-6">
              <Link href="/referral/signup">
                <Button
                  size="lg"
                  className="h-16 px-12 text-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 hover:scale-105 transition-transform"
                >
                  YES! I Want to Start Earning Today!
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span>Over 1,200 active referral partners</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">IT'S SO EASY, ANYONE CAN DO IT!</h2>
            <p className="text-xl text-muted-foreground">3 Simple Steps to Start Making Money</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '1',
                title: 'Sign Up Free',
                description:
                  'Fill out the quick form (takes 2 minutes). Get your unique referral link instantly.',
                icon: '📝',
              },
              {
                number: '2',
                title: 'Share Your Link',
                description:
                  'Post on Facebook, Instagram, text friends, email family. Share your link anywhere!',
                icon: '📱',
              },
              {
                number: '3',
                title: 'Get Paid',
                description:
                  "When someone uses your link and files their taxes, you get paid $50+. It's that simple!",
                icon: '💰',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="bg-card border-2 border-primary/20 rounded-xl p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <div className="text-6xl mb-4">{step.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/referral/signup">
              <Button size="lg" className="h-14 px-10 text-lg font-bold">
                I'm Ready to Sign Up!
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">WHY PEOPLE LOVE OUR REFERRAL PROGRAM</h2>
            <p className="text-xl text-muted-foreground">
              Make money without doing any actual tax work!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: '$50 Per Referral',
                description:
                  'Get paid $50 for every person who files their taxes through your link. The more you share, the more you earn!',
              },
              {
                icon: Users,
                title: 'Easy to Share',
                description:
                  'Everyone needs to do their taxes! Your friends, family, coworkers - they all qualify. Share everywhere!',
              },
              {
                icon: Gift,
                title: 'Bonus Rewards',
                description:
                  'Refer 10+ people? Get BONUS $100. Refer 25+? Get BONUS $300. Top referrer each month wins $1,000!',
              },
              {
                icon: TrendingUp,
                title: 'Passive Income',
                description:
                  'Once you share your link, it works 24/7. Make money while you sleep, eat, or watch TV!',
              },
              {
                icon: CheckCircle,
                title: 'No Sales Skills Needed',
                description:
                  "You're not selling anything. Just share your link. We handle everything else. Super simple!",
              },
              {
                icon: Star,
                title: 'Weekly Payouts',
                description:
                  'Get paid every week via direct deposit, PayPal, or Cash App. Fast and reliable payments!',
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Examples */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">SEE HOW MUCH YOU CAN MAKE!</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                referrals: '5 people',
                earnings: '$250',
                example: 'Share with close family & friends',
              },
              {
                referrals: '20 people',
                earnings: '$1,100',
                example: 'Post on social media + $100 bonus',
              },
              {
                referrals: '50 people',
                earnings: '$2,800',
                example: 'Share everywhere + $300 bonus',
              },
            ].map((example, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-500 rounded-xl p-8 text-center"
              >
                <div className="text-5xl font-black text-green-600 mb-2">{example.earnings}</div>
                <div className="text-lg font-semibold mb-2">If you refer {example.referrals}</div>
                <div className="text-sm text-muted-foreground">{example.example}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 rounded-xl p-8">
            <p className="text-2xl font-bold mb-4">
              🎉 Top referrers are making $5,000+ per month!
            </p>
            <p className="text-lg">This could be you. Start today!</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">WHAT OUR REFERRAL PARTNERS SAY</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: 'Jessica M.',
                earnings: '$3,200 last month',
                quote:
                  "I just posted my link on Facebook and Instagram. I didn't even try that hard and made over $3,000! This is the easiest money I've ever made.",
              },
              {
                name: 'Marcus T.',
                earnings: '$1,850 in 2 weeks',
                quote:
                  "I told my coworkers about it and they all signed up. Then they told their friends. I'm making money from people I don't even know!",
              },
              {
                name: 'Lisa R.',
                earnings: '$5,100 this year',
                quote:
                  "I share my link once a month on my Facebook page. That's it. $5,100 for posting a link a few times. Absolutely worth it!",
              },
              {
                name: 'David K.',
                earnings: '$890 first month',
                quote:
                  "I was skeptical but figured I'd try it. Made almost $900 my first month just texting people. Now I tell everyone!",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-card border rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/20">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{testimonial.name}</p>
                    <p className="text-green-600 dark:text-green-400 font-semibold">
                      {testimonial.earnings}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="italic text-muted-foreground">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">READY TO START MAKING EASY MONEY?</h2>

          <p className="text-2xl mb-8">
            Sign up FREE right now. Get your link. Start sharing. Get paid!
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
            <CountdownTimer className="mb-6" />
            <p className="text-xl font-bold">
              ⚡ BONUS ENDS SOON! Sign up now to get $25 for your first 3 referrals!
            </p>
          </div>

          <Link href="/referral/signup">
            <Button
              size="lg"
              className="h-16 px-12 text-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 mb-8"
            >
              YES! Sign Me Up - I Want My Referral Link!
            </Button>
          </Link>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span>100% Free to Join</span>
            </div>
            <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span>No Experience Required</span>
            </div>
            <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span>Start Earning Today</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-2xl font-bold mb-4">Still Have Questions?</h3>
          <p className="text-lg mb-6">
            Don't worry! We'll answer everything after you sign up. It takes 2 minutes.
          </p>
          <Link href="/referral/signup">
            <Button size="lg" className="h-14 px-10 text-lg font-bold">
              Let's Go! Sign Me Up Now!
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
