'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle,
  Zap,
  Target,
  BarChart3,
  Package,
} from 'lucide-react';
import Image from 'next/image';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { logger } from '@/lib/logger';

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 2000 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    springValue.on('change', (latest) => {
      setDisplayValue(Math.floor(latest));
    });
  }, [springValue]);

  return (
    <span ref={ref}>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function AffiliateJoinPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    experience: '',
    audience: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/leads/affiliate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (error) {
      logger.error('Error submitting form:', error);
      alert('An error occurred while submitting your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
              <CheckCircle className="h-10 w-10 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Welcome to the Team!</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Your affiliate application has been received. We're excited to partner with you!
            </p>
            <div className="bg-muted p-6 rounded-lg mb-6">
              <p className="font-semibold mb-2">What's Next:</p>
              <ul className="space-y-2 text-sm text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                  <span>Check your email for affiliate dashboard login</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                  <span>Get your unique tracking links and codes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                  <span>Access marketing materials and resources</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                  <span>Start promoting and earning commissions!</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Our affiliate team will contact you within 24 hours with onboarding details
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-purple-50">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            >
              <Sparkles className="inline h-4 w-4 mr-1" />
              Affiliate Program
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold mb-6"
            >
              Earn <span className="text-purple-600">$50-$150</span> Per Tax Client
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground mb-8"
            >
              Join our affiliate program and earn generous commissions promoting professional tax
              services. No experience required - we provide everything you need!
            </motion.p>
            <div className="space-y-3">
              {[
                { icon: DollarSign, text: 'Earn up to $150 per completed tax return', delay: 0.5 },
                { icon: Package, text: 'Free marketing materials & tracking tools', delay: 0.6 },
                { icon: Zap, text: 'Fast payouts (24-48 hours)', delay: 0.7 },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: item.delay }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <item.icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-semibold">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl"
          >
            <Image
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
              alt="Affiliate marketing success"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: DollarSign,
              value: 50,
              text: '$50-150',
              label: 'Per Client',
              color: 'text-green-500',
              delay: 0,
            },
            {
              icon: Users,
              value: 1000,
              suffix: '+',
              label: 'Active Affiliates',
              color: 'text-blue-500',
              delay: 0.1,
            },
            {
              icon: TrendingUp,
              value: 2.5,
              text: '$2.5M+',
              label: 'Paid Out',
              color: 'text-purple-500',
              delay: 0.2,
            },
            {
              icon: Zap,
              value: 0,
              text: '24-48hr',
              label: 'Fast Payouts',
              color: 'text-orange-500',
              delay: 0.3,
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: stat.delay, duration: 0.5 }}
            >
              <Card className="hover:shadow-xl transition-shadow">
                <CardContent className="pt-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: stat.delay + 0.2, type: 'spring' }}
                  >
                    <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                  </motion.div>
                  <div className="text-3xl font-bold">
                    {stat.text ? (
                      stat.text
                    ) : (
                      <>
                        <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Application Form */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="border-2 border-primary/20 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Join Our Affiliate Program</CardTitle>
              <CardDescription className="text-lg">
                Sign up in 2 minutes and start earning today - completely free!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (USA) *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Marketing Experience</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => setFormData({ ...formData, experience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Just getting started</SelectItem>
                      <SelectItem value="intermediate">Some experience</SelectItem>
                      <SelectItem value="advanced">Experienced marketer</SelectItem>
                      <SelectItem value="professional">Full-time affiliate marketer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Where will you promote? *</Label>
                  <Select
                    value={formData.audience}
                    onValueChange={(value) => setFormData({ ...formData, audience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your primary channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="blog">Blog/Website</SelectItem>
                      <SelectItem value="email">Email Marketing</SelectItem>
                      <SelectItem value="youtube">YouTube/Video</SelectItem>
                      <SelectItem value="paid">Paid Advertising</SelectItem>
                      <SelectItem value="community">Community/Groups</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Tell us about your audience (optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    placeholder="Who are you reaching? How many followers/subscribers do you have?"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Join Free - Start Earning'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  100% free to join • No monthly fees • Get paid per referral
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Commission Structure */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-8"
          >
            Commission Structure
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: 'Basic Returns',
                desc: 'Simple 1040, W-2 only',
                amount: '$50',
                color: 'text-green-500',
                amountColor: 'text-green-600',
                delay: 0,
              },
              {
                icon: Target,
                title: 'Standard Returns',
                desc: 'Itemized, multiple income',
                amount: '$100',
                color: 'text-blue-500',
                amountColor: 'text-blue-600',
                highlighted: true,
                delay: 0.2,
              },
              {
                icon: Target,
                title: 'Business Returns',
                desc: 'Schedule C, Corporate',
                amount: '$150',
                color: 'text-purple-500',
                amountColor: 'text-purple-600',
                delay: 0.4,
              },
            ].map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: tier.delay, duration: 0.5 }}
                whileHover={{ y: -10 }}
              >
                <Card
                  className={`border-2 ${tier.highlighted ? 'border-primary shadow-lg' : 'hover:border-primary'} transition-all`}
                >
                  <CardHeader className="text-center">
                    <motion.div
                      initial={{ rotate: -180, scale: 0 }}
                      whileInView={{ rotate: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: tier.delay + 0.2, type: 'spring' }}
                    >
                      <tier.icon className={`h-12 w-12 mx-auto mb-4 ${tier.color}`} />
                    </motion.div>
                    <CardTitle>{tier.title}</CardTitle>
                    <CardDescription>{tier.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className={`text-4xl font-bold ${tier.amountColor} mb-2`}>
                      {tier.amount}
                    </div>
                    <p className="text-sm text-muted-foreground">Per completed return</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Benefits with Images */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: Package,
              title: 'Marketing Tools',
              desc: 'Pre-made landing pages, QR codes, social media graphics, and email templates',
              image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80',
              alt: 'Marketing tools',
              delay: 0,
            },
            {
              icon: BarChart3,
              title: 'Real-Time Tracking',
              desc: 'Track clicks, signups, and conversions with detailed analytics dashboard',
              image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
              alt: 'Real-time tracking',
              delay: 0.2,
            },
            {
              icon: Zap,
              title: 'Fast Payments',
              desc: 'Get paid 24-48 hours after your referral completes their tax return',
              image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80',
              alt: 'Fast payments',
              delay: 0.4,
            },
          ].map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, rotateY: -10 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ delay: benefit.delay, duration: 0.6 }}
              whileHover={{ y: -10 }}
            >
              <Card className="text-center overflow-hidden hover:shadow-xl transition-all h-full">
                <motion.div
                  initial={{ scale: 1.2 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: benefit.delay + 0.3, duration: 0.6 }}
                  className="relative h-48 w-full overflow-hidden"
                >
                  <Image src={benefit.image} alt={benefit.alt} fill className="object-cover" />
                </motion.div>
                <CardHeader>
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    whileInView={{ rotate: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: benefit.delay + 0.5, type: 'spring', stiffness: 200 }}
                  >
                    <benefit.icon className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  </motion.div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Affiliate Success Section with Image */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
              whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <Image
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80"
                alt="Successful affiliates"
                fill
                className="object-cover"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold mb-6">Start Earning Today</h2>
              <p className="text-lg text-muted-foreground mb-6">
                No experience needed. We provide everything you need to succeed as an affiliate
                marketer. Join over 1,000 active affiliates earning consistent income.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Simple & Easy</strong>
                    <p className="text-sm text-muted-foreground">
                      Share your unique link on social media, your blog, or directly with friends
                      and family
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <strong>High Conversion Rates</strong>
                    <p className="text-sm text-muted-foreground">
                      Our professional service and proven marketing materials convert visitors into
                      customers
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Passive Income</strong>
                    <p className="text-sm text-muted-foreground">
                      Earn recurring commissions as your referrals continue to use our services year
                      after year
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Theme Toggle at Bottom */}
        <div className="mt-16 pb-8 flex items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground">Theme:</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
