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
  Briefcase,
  DollarSign,
  Users,
  CheckCircle,
  Shield,
  TrendingUp,
  Award,
  Clock,
  Palette,
  BarChart3,
} from 'lucide-react';
import Image from 'next/image';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
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

// Typing animation component
function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView && !isTyping) {
      setIsTyping(true);
      let currentIndex = 0;
      const timeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (currentIndex <= text.length) {
            setDisplayText(text.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(interval);
          }
        }, 30);
        return () => clearInterval(interval);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [isInView, text, delay, isTyping]);

  return <span ref={ref}>{displayText}</span>;
}

export default function PreparerJoinPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ptin: '',
    certification: '',
    experience: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/leads/preparer', {
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Application Received!</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Thank you for your interest in joining Tax Genius Pro. We're reviewing your
              application.
            </p>
            <div className="bg-muted p-6 rounded-lg mb-6">
              <p className="font-semibold mb-2">Next Steps:</p>
              <ul className="space-y-2 text-sm text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>Our team will review your credentials (24-48 hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>You'll receive an interview invitation if qualified</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>Background check and verification process</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>Onboarding and platform training</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Check your email for confirmation and additional information
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            >
              <Briefcase className="inline h-4 w-4 mr-1" />
              Now Hiring Tax Preparers
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold mb-6"
            >
              Build Your <span className="text-blue-600">Tax Business</span> with Us
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground mb-8"
            >
              Join Tax Genius Pro and get the tools, clients, and support you need to succeed. Earn
              $75K+ annually with flexible hours.
            </motion.p>
            <div className="space-y-3">
              {[
                {
                  icon: Palette,
                  text: 'Customized marketing materials with YOUR branding',
                  delay: 0.5,
                },
                { icon: Users, text: 'We bring you qualified leads & clients', delay: 0.6 },
                {
                  icon: BarChart3,
                  text: 'Professional client portal & management tools',
                  delay: 0.7,
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: item.delay }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <item.icon className="h-5 w-5 text-blue-600" />
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
              src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80"
              alt="Professional tax preparer working with clients"
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
              value: 75,
              suffix: 'K+',
              label: 'Avg. Annual Income',
              color: 'text-green-500',
              delay: 0,
            },
            {
              icon: Users,
              value: 500,
              suffix: '+',
              label: 'Active Preparers',
              color: 'text-blue-500',
              delay: 0.1,
            },
            {
              icon: TrendingUp,
              value: 10,
              suffix: 'K+',
              label: 'Returns Filed',
              color: 'text-purple-500',
              delay: 0.2,
            },
            {
              icon: Clock,
              value: 0,
              suffix: '',
              label: 'Work Hours',
              text: 'Flexible',
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
                        $<AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-12"
          >
            What Our Tax Preparers Say
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Sarah Martinez',
                title: 'EA, 8 years experience',
                image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
                quote:
                  '"Tax Genius Pro gave me everything I needed to grow my practice. The marketing materials and client portal are top-notch!"',
                delay: 0,
              },
              {
                name: 'Michael Johnson',
                title: 'CPA, 12 years experience',
                image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
                quote:
                  '"I doubled my client base in the first season. The lead generation and support team are exceptional!"',
                delay: 200,
              },
              {
                name: 'Jennifer Lee',
                title: 'EA, 5 years experience',
                image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80',
                quote:
                  '"The flexibility to work on my own schedule while having professional tools made all the difference."',
                delay: 400,
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
              >
                <Card className="hover:shadow-xl transition-shadow h-full">
                  <CardContent className="pt-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 + 0.3, type: 'spring' }}
                      className="flex items-center gap-4 mb-4"
                    >
                      <div className="relative h-16 w-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-500">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                      </div>
                    </motion.div>
                    <p className="text-muted-foreground italic min-h-[80px]">
                      <TypingText text={testimonial.quote} delay={testimonial.delay} />
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
              <CardTitle className="text-3xl">Apply to Join Our Team</CardTitle>
              <CardDescription className="text-lg">
                Fill out the form below and we'll review your application within 48 hours
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
                  <Label htmlFor="ptin">PTIN (Preparer Tax Identification Number) *</Label>
                  <Input
                    id="ptin"
                    required
                    value={formData.ptin}
                    onChange={(e) => setFormData({ ...formData, ptin: e.target.value })}
                    placeholder="P12345678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certification">Professional Certification</Label>
                  <Select
                    value={formData.certification}
                    onValueChange={(value) => setFormData({ ...formData, certification: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your certification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpa">CPA (Certified Public Accountant)</SelectItem>
                      <SelectItem value="ea">EA (Enrolled Agent)</SelectItem>
                      <SelectItem value="attorney">Tax Attorney</SelectItem>
                      <SelectItem value="annual">Annual Filing Season Program</SelectItem>
                      <SelectItem value="none">No formal certification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Tax Preparation Experience *</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => setFormData({ ...formData, experience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-10">5-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Why do you want to join Tax Genius Pro?</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    placeholder="Tell us about your goals and what makes you a great fit..."
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Submitting Application...' : 'Submit Application'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By submitting this application, you agree to a background check and verification
                  of credentials.
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits with Images */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: Shield,
              title: 'Support & Training',
              description: 'Complete onboarding, ongoing training, and 24/7 support from our team',
              image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
              alt: 'Support and training',
            },
            {
              icon: Award,
              title: 'Professional Tools',
              description:
                'MyTaxOffice integration, client portal, e-signature, and payment processing',
              image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
              alt: 'Professional tools',
            },
            {
              icon: Palette,
              title: 'Your Brand',
              description:
                'Customized marketing materials with your name, photo, and contact information',
              image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80',
              alt: 'Your brand',
            },
          ].map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, rotateY: -10 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              whileHover={{ y: -10 }}
            >
              <Card className="text-center overflow-hidden hover:shadow-xl transition-all h-full">
                <motion.div
                  initial={{ scale: 1.2 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 + 0.3, duration: 0.6 }}
                  className="relative h-48 w-full overflow-hidden"
                >
                  <Image src={benefit.image} alt={benefit.alt} fill className="object-cover" />
                </motion.div>
                <CardHeader>
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    whileInView={{ rotate: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 + 0.5, type: 'spring', stiffness: 200 }}
                  >
                    <benefit.icon className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  </motion.div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Success Stories Section with Image */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold mb-6">Build Your Tax Business</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Join hundreds of successful tax preparers who have grown their practice with Tax
                Genius Pro. We provide everything you need to succeed.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Marketing That Works</strong>
                    <p className="text-sm text-muted-foreground">
                      Custom QR codes, social media templates, and landing pages with your branding
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Client Pipeline</strong>
                    <p className="text-sm text-muted-foreground">
                      We send qualified leads directly to you based on your location and specialties
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Flexible Schedule</strong>
                    <p className="text-sm text-muted-foreground">
                      Work when you want, from wherever you want. Full control of your schedule
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
              whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80"
                alt="Successful tax preparer building business"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
