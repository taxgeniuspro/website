'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Users, MessageCircle, Award } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PreparerLandingPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const testimonials = [
    {
      name: 'Gelisa White',
      title: '1st Year Tax Genius',
      followers: '15.7k',
      image: '/wordpress-assets/gelisa.png',
      quote: 'I was really getting tired of doing hair...Tax Genius give me the tools i needed to be very successful',
    },
    {
      name: 'Yaumar Williams',
      title: '2nd Year Tax Genius',
      followers: '11.7k',
      image: '/wordpress-assets/angela-r.png',
      quote: 'The support and training from Tax Genius has been incredible. I doubled my income in my second year!',
    },
    {
      name: 'Chelsea Mitchell Lowe',
      title: '2nd Year Tax Genius',
      followers: '2,492k',
      image: '/wordpress-assets/chels.png',
      quote: 'Best decision I ever made. The marketing materials and lead generation tools work perfectly.',
    },
    {
      name: 'Angela Richards',
      title: '2nd Year Tax Genius',
      followers: '1,826k',
      image: '/wordpress-assets/dude.png',
      quote: 'From zero experience to earning six figures in tax preparation. The comprehensive training made all the difference!',
    },
  ];

  const features = [
    {
      title: 'Customized Promotional Materials',
      description: 'Social media posts, videos, printed materials',
      image: '/wordpress-assets/request-social-media-300x94.png',
    },
    {
      title: 'Marketing Strategies That Work',
      description: 'Client acquisition methods, tested approaches',
      image: '/wordpress-assets/polo-shirt-mockup-featuring-a-smiling-woman-28875-1-768x572.webp',
    },
    {
      title: 'Support & Assistance',
      description: 'Personal support rep + 24/7 AI assistants',
      image: '/wordpress-assets/happy-customer-showing-off-his-new-tshirt-mockup-a15666.webp',
    },
  ];

  const comparisonFeatures = [
    'Best Support Team Ever',
    'Easy To Use Professional Tax Software',
    '24/7 Support',
    'One Step Client Onboarding',
    'Discord & Facebook Support Group',
    'Easy To Follow Trainer Videos',
    'Unlimited Practice Test Returns',
    'Lead Generation Forms',
    'Promotional Materials',
    'Tax Return Double Checks',
    'Automated Client Intake Forms',
    'And MUCH MUCH MORE..',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Logo Header */}
      <section className="bg-white py-6 px-4 border-b">
        <div className="container mx-auto max-w-6xl">
          <Image
            src="/wordpress-assets/BLACK-TAX-LOGO-W.TAX_-2-1024x147.png"
            alt="Tax Genius Pro Logo"
            width={300}
            height={43}
            className="mx-auto"
          />
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#4054b2] to-[#2a3a7a] text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="mb-8">
            <h1 className="text-4xl lg:text-6xl font-black mb-6 leading-tight">
              Join, Fastest Growing Tax Preparation Company
            </h1>
            <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-tight text-yellow-400">
              ARE YOU TIRED OF<br />BEING BROKE?
            </h2>
            <div className="inline-block bg-[#F12727] text-white px-8 py-6 rounded-lg mb-6">
              <p className="text-3xl font-bold">DO YOU WANT TO MAKE up to $100,000+</p>
              <p className="text-2xl font-bold">THIS TAX SEASON?</p>
            </div>
          </div>

          <div className="bg-yellow-400 text-black px-8 py-6 rounded-lg mb-10 max-w-4xl mx-auto">
            <p className="text-2xl font-black mb-2">
              FREE TRAINING AND MARKETING PRODUCTS
            </p>
            <p className="text-xl font-bold">
              FOR 100 PEOPLE LIMITED TIME OFFER
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="mb-10">
            <div className="flex justify-center gap-4 flex-wrap">
              {[
                { label: 'DAYS', value: timeLeft.days },
                { label: 'HOURS', value: timeLeft.hours },
                { label: 'MINUTES', value: timeLeft.minutes },
                { label: 'SECONDS', value: timeLeft.seconds },
              ].map((unit) => (
                <div key={unit.label} className="bg-[#F12727] rounded-xl p-4 min-w-[100px]">
                  <div className="text-4xl font-bold">{unit.value.toString().padStart(2, '0')}</div>
                  <div className="text-sm font-medium mt-1">{unit.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <Badge className="bg-white text-[#4054b2] mb-4 px-6 py-2 text-lg font-bold hover:bg-white">
              ⭐ 4.5 out of 2617 reviews
            </Badge>
          </div>

          <Link href="/admin/preparer-job-form">
            <Button size="lg" className="bg-[#F12727] hover:bg-[#d41f1f] text-white text-2xl px-16 py-8 h-auto font-black rounded-full shadow-2xl">
              Get My Free Consultation - I WANT TO START TODAY!
            </Button>
          </Link>
        </div>
      </section>

      {/* Coach Owliver Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="relative w-64 h-64 mx-auto mb-8">
            <Image
              src="/icon-512x512.png"
              alt="Coach Owliver"
              fill
              className="object-contain"
            />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-6 text-[#4054b2]">
            BECOME A TAX PREPARER AND WE'LL SHOW YOU HOW TO START BUILDING YOUR CLIENT LIST TODAY!!
          </h2>
        </div>
      </section>

      {/* Problem/Pain Points Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-12 text-[#4054b2]">
            Are You...
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              "You're tired of constantly struggling financially",
              "Finding it difficult to make ends meet",
              "Been searching for a job for a while",
              "Feel stuck in your current situation",
            ].map((pain, index) => (
              <Card key={index} className="border-2 border-[#F12727]">
                <CardContent className="p-6">
                  <p className="text-xl font-medium text-center">{pain}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Erin's Success Story Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="relative h-96 w-full rounded-xl overflow-hidden">
                <Image
                  src="/wordpress-assets/polo-shirt-mockup-of-a-woman-talking-on-the-phone-at-an-outdoor-restaurant-33544a-683x1024.webp"
                  alt="Success Story"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-black mb-6 text-[#4054b2]">
                I was just like you—Broke, Bills and No clue
              </h2>
              <p className="text-xl mb-6 leading-relaxed">
                After trying tax prep, I earned <span className="font-black text-[#F12727]">$139,000</span> in my second season!
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Tax Genius provided me with everything I needed to succeed - from training to marketing materials to ongoing support. Now I help others achieve the same financial freedom I found.
              </p>
              <Link href="/admin/preparer-job-form">
                <Button size="lg" className="bg-[#F12727] hover:bg-[#d41f1f] text-white text-xl px-12 py-6 h-auto font-bold">
                  START YOUR JOURNEY TODAY
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-center mb-4 text-[#4054b2]">
            NOW LET ME TELL YOU THE BENEFITS OF TAX GENIUS AND HOW WE CAN HELP
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Everything you need to succeed in your tax preparation business
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-[#4054b2] transition-all hover:shadow-xl overflow-hidden">
                <div className="relative h-64 w-full">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-3 text-[#4054b2]">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-[#F12727]">And there's so much more!</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-center mb-4 text-[#4054b2]">
            WHAT TAX GENIUS PROS SAY ABOUT US
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Real success stories from real tax professionals
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 hover:shadow-2xl transition-all">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-[#4054b2] shadow-xl">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg mb-6 italic text-gray-700">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="border-t pt-4">
                    <p className="font-bold text-xl">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    <Badge className="bg-[#4054b2] text-white mt-2 hover:bg-[#4054b2]">
                      {testimonial.followers} followers
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Products Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#4054b2] to-[#2a3a7a] text-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-center mb-6">
            GET YOUR PROMOTIONAL PRODUCTS
          </h2>
          <p className="text-xl text-center mb-12">
            Professional branded merchandise to help you stand out
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="relative h-96 rounded-xl overflow-hidden">
              <Image
                src="/wordpress-assets/21t-shirt-mockup-of-a-man-drinking-coffee-in-his-living-room-m17355-r-el2.png"
                alt="T-Shirt Merchandise"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-3xl font-bold mb-6">SIGNUP AND START POSTING TODAY!!</h3>
              <p className="text-xl mb-8">
                Get access to professional marketing materials, social media content, and branded merchandise that will help you attract and retain clients.
              </p>
              <Link href="/admin/preparer-job-form">
                <Button size="lg" className="bg-[#F12727] hover:bg-[#d41f1f] text-white text-xl px-12 py-6 h-auto font-bold">
                  GET STARTED NOW
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-center mb-4 text-[#4054b2]">
            THE DIFFERENCE BETWEEN US AND OTHER TAX PREPARATIONS COMPANIES
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            See why Tax Genius Pro stands out from the competition
          </p>

          <Card className="border-2 border-[#4054b2] bg-white">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-4">
                {comparisonFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <p className="text-lg font-medium">{feature}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Golden Goose Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="relative w-64 h-64 mx-auto mb-8">
            <Image
              src="/wordpress-assets/golden-goose-2023-removebg-preview.png"
              alt="Golden Goose Award"
              fill
              className="object-contain"
            />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-6 text-[#4054b2]">
            You just found the owl that lays the golden eggs
          </h2>
          <h3 className="text-3xl font-bold mb-6">
            Ready to get more clients with Tax Genius Pro
          </h3>
          <p className="text-2xl font-bold text-[#F12727] mb-8">
            HURRY! START BUILDING YOUR CLIENTS BASE TODAY
          </p>
          <Link href="/admin/preparer-job-form">
            <Button size="lg" className="bg-[#F12727] hover:bg-[#d41f1f] text-white text-2xl px-16 py-8 h-auto font-black rounded-full shadow-2xl">
              GET STARTED NOW
            </Button>
          </Link>
        </div>
      </section>

      {/* Objection Handler Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-black mb-6 text-[#4054b2]">
            YOU STILL HERE! What the problem?
          </h2>
          <p className="text-2xl mb-8">
            Have questions? We're here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center gap-2 text-xl">
              <MessageCircle className="w-8 h-8 text-[#4054b2]" />
              <p>CLICK ON THE CHAT BUTTON AND INSTANTLY TALK TO A TAX GENIUS SUPPORT REP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#4054b2] to-[#2a3a7a] text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Financial Future?
          </h2>
          <p className="text-xl mb-4">
            Don't miss this limited-time opportunity to join the Tax Genius Pro team
          </p>
          <p className="text-2xl font-bold mb-8">
            FREE TRAINING AND MARKETING PRODUCTS FOR THE FIRST 100 APPLICANTS
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/admin/preparer-job-form">
              <Button size="lg" className="bg-[#F12727] hover:bg-[#d41f1f] text-white text-2xl px-16 py-8 h-auto font-black rounded-full shadow-2xl">
                Get My Free Consultation
              </Button>
            </Link>
            <Link href="/admin/tax-course">
              <Button size="lg" variant="outline" className="bg-white text-[#4054b2] hover:bg-gray-100 text-xl px-12 py-6 h-auto font-bold border-2">
                VIEW TRAINING COURSE
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Notice */}
      <section className="py-8 px-4 bg-background border-t">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-muted-foreground">
            This is an administrative preview page. Results may vary. Income potential based on historical data from top performers. © Tax Genius Pro. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
