'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Upload,
  FileText,
  DollarSign,
  MapPin,
  Star,
  Shield,
  Clock,
  Calendar,
  Calculator,
  Languages,
  TrendingUp,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePreviewPage() {
  const services = [
    {
      icon: Upload,
      title: 'Easy Document Upload',
      description: 'Upload your tax documents securely from any device. We handle W-2s, 1099s, receipts, and more.',
      image: '/wordpress-assets/download-40.webp',
    },
    {
      icon: FileText,
      title: 'Dependent Forms',
      description: 'Claim all your dependents quickly and easily. Maximize your credits and deductions.',
      image: '/wordpress-assets/download-36.webp',
    },
    {
      icon: DollarSign,
      title: 'Income Statements',
      description: 'We process all types of income - wages, self-employment, investments, and rental property.',
      image: '/wordpress-assets/download-39.webp',
    },
  ];

  const features = [
    'Maximum refund guaranteed',
    'IRS audit protection included',
    'Licensed CPAs and tax professionals',
    'Same-day e-filing available',
    'Free prior year review',
    'Multi-language support',
  ];

  const testimonials = [
    {
      name: 'Maria Rodriguez',
      location: 'Los Angeles, CA',
      content: 'Tax Genius helped me get $3,200 more than I expected! The service was fast and professional.',
      rating: 5,
      refund: '$4,850',
    },
    {
      name: 'James Wilson',
      location: 'Houston, TX',
      content: 'I got my refund in 8 days! The tax preparer was knowledgeable and found deductions I missed before.',
      rating: 5,
      refund: '$2,975',
    },
    {
      name: 'Lisa Chen',
      location: 'New York, NY',
      content: 'Professional service at an affordable price. They explained everything clearly and got me a great refund.',
      rating: 5,
      refund: '$5,120',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Logo Header */}
      <section className="bg-white py-8 px-4 border-b border-gray-200">
        <div className="container mx-auto max-w-6xl">
          <Image
            src="/wordpress-assets/Logo-without-tag-white.png"
            alt="Tax Genius Logo"
            width={200}
            height={50}
            className="mx-auto"
          />
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-white text-[#4054b2] border-2 border-[#4054b2] mb-6 px-4 py-2 text-sm font-bold hover:bg-white" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                America's Trusted Tax Service
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight text-black">
                CONNECT WITH A<br />TAX GENIUS
              </h1>
              <p className="text-xl lg:text-2xl mb-4 text-black">
                With thousands of tax experts nationwide, tax help is always around the corner
              </p>
              <p className="text-lg mb-8 text-gray-700">
                File your taxes with confidence. Maximum refund guaranteed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/start-filing/form">
                  <Button
                    size="lg"
                    className="bg-[#32373c] hover:bg-[#1a1d20] text-white text-lg px-10 py-6 h-auto font-semibold rounded-full"
                    style={{
                      padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
                      boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'
                    }}
                  >
                    CONTACT A GENIUS
                  </Button>
                </Link>
                <Link href="/book-appointment">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white text-[#4054b2] hover:bg-gray-50 border-2 border-[#4054b2] text-lg px-10 py-6 h-auto font-semibold rounded-full"
                    style={{
                      padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
                      boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'
                    }}
                  >
                    START A RETURN
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-black font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>IRS Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span>100% Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span>Fast Refunds</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative w-96 h-96">
                <Image
                  src="/icon-512x512.png"
                  alt="Tax Genius Pro - Oliver the Owl"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-[#4054b2]">
            Your Trusted Tax Experts for Life
          </h2>
          <p className="text-xl text-gray-700 mb-12 max-w-4xl mx-auto">
            We combine cutting-edge technology with personalized service to ensure accuracy, efficiency, and maximum refunds. Our tech-savvy approach means you get the benefits of modern tax software with the personal touch of experienced professionals.
          </p>
        </div>
      </section>

      {/* Refund Advance Section */}
      <section className="py-16 px-4 bg-[#F12727]">
        <div className="container mx-auto max-w-6xl text-center text-white">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6">
            GET UP TO $7,000 REFUND ADVANCE
          </h2>
          <p className="text-xl lg:text-2xl mb-8">
            Don't wait for your refund. Get your money in as little as 24 hours!
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-5xl font-black mb-2">$7,000</div>
              <p className="text-lg">Maximum Advance</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black mb-2">24hrs</div>
              <p className="text-lg">Get Money Fast</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black mb-2">0%</div>
              <p className="text-lg">Interest Rate</p>
            </div>
          </div>
          <Link href="/start-filing/form">
            <Button
              size="lg"
              className="bg-white text-[#F12727] hover:bg-gray-100 text-xl px-12 py-6 h-auto font-bold rounded-full"
              style={{
                padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
                boxShadow: '6px 6px 9px rgba(0,0,0,0.4)'
              }}
            >
              APPLY FOR ADVANCE NOW
            </Button>
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-[#4054b2]">
            Our Tax Services
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            Everything you need for a stress-free tax filing experience
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="border-2 border-gray-200 hover:border-[#4054b2] transition-all rounded-lg overflow-hidden bg-white" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <div className="relative h-64 w-full">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-4 text-[#4054b2]">{service.title}</h3>
                  <p className="text-gray-600 text-lg">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Offerings Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 border-gray-200 bg-white rounded-lg p-8 text-center hover:border-[#4054b2] transition-all" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-[#4054b2]" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#4054b2]">Tax Refund Advance Loan</h3>
              <p className="text-gray-600">
                Get up to $7,000 in as little as 24 hours. No waiting for your refund.
              </p>
            </div>

            <div className="border-2 border-gray-200 bg-white rounded-lg p-8 text-center hover:border-[#4054b2] transition-all" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#4054b2]" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#4054b2]">Tax Prep Checklist</h3>
              <p className="text-gray-600">
                Complete checklist to ensure you have all documents ready for filing.
              </p>
            </div>

            <div className="border-2 border-gray-200 bg-white rounded-lg p-8 text-center hover:border-[#4054b2] transition-all" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#4054b2]" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#4054b2]">Appointment Scheduling</h3>
              <p className="text-gray-600">
                Book a consultation with our tax experts at your convenience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-[#4054b2]">
            Why Choose Tax Genius?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4 bg-white border-2 border-gray-200 p-6 rounded-lg" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <p className="text-lg font-medium text-black">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Stats Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#4054b2]">
            Trusted Since 1983
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 border-gray-200 bg-white rounded-lg text-center p-8" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <div className="text-4xl font-bold text-[#4054b2] mb-2">1983</div>
              <p className="text-lg text-gray-600">Founded</p>
            </div>

            <div className="border-2 border-gray-200 bg-white rounded-lg text-center p-8" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <div className="text-4xl font-bold text-[#4054b2] mb-2">2,000+</div>
              <p className="text-lg text-gray-600">Locations</p>
            </div>

            <div className="border-2 border-gray-200 bg-white rounded-lg text-center p-8" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <div className="text-4xl font-bold text-[#4054b2] mb-2">100%</div>
              <p className="text-lg text-gray-600">Satisfaction Guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#4054b2]/10 rounded-full flex items-center justify-center" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
              <MapPin className="w-10 h-10 text-[#4054b2]" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-[#4054b2]">
            2,000+ Locations Nationwide
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Find a Tax Genius Pro near you or file online from anywhere
          </p>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { state: 'California', locations: '450+' },
              { state: 'Texas', locations: '380+' },
              { state: 'Florida', locations: '320+' },
              { state: 'New York', locations: '280+' },
            ].map((location, index) => (
              <div key={index} className="border-2 border-gray-200 bg-white rounded-lg p-6 text-center" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <div className="text-3xl font-bold text-[#4054b2] mb-2">{location.locations}</div>
                <p className="text-lg font-medium text-black">{location.state}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-[#4054b2]">
            What Our Clients Say
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            Join thousands of satisfied customers who trust Tax Genius
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="border-2 border-gray-200 bg-white rounded-lg p-8" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-lg mb-6 italic text-gray-700">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="border-t pt-4">
                  <p className="font-bold text-lg text-black">{testimonial.name}</p>
                  <p className="text-sm text-gray-600 mb-3">{testimonial.location}</p>
                  <Badge className="bg-green-600 text-white hover:bg-green-600">
                    Refund: {testimonial.refund}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bilingual Services Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-20 h-20 bg-[#4054b2]/10 rounded-full flex items-center justify-center mb-6" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <Languages className="w-10 h-10 text-[#4054b2]" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#4054b2]">
                Servicios en Español
              </h2>
              <p className="text-xl text-gray-700 mb-8">
                We offer bilingual services with 300+ offices staffed with Spanish-speaking preparers. Get expert tax help in your preferred language.
              </p>
              <Link href="/start-filing/form">
                <Button size="lg" className="bg-[#32373c] hover:bg-[#1a1d20] text-white text-lg px-10 py-6 h-auto font-semibold rounded-full" style={{
                  padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
                  boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'
                }}>
                  EMPEZAR AHORA
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-gray-200 bg-white rounded-lg p-6 text-center" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <div className="text-3xl font-bold text-[#4054b2] mb-2">300+</div>
                <p className="text-sm text-black">Bilingual Offices</p>
              </div>
              <div className="border-2 border-gray-200 bg-white rounded-lg p-6 text-center" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <div className="text-3xl font-bold text-[#4054b2] mb-2">100%</div>
                <p className="text-sm text-black">Spanish Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools & Resources Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#4054b2]">
            Tax Tools & Resources
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Calculator, title: 'Tax Calculators', description: 'Estimate your refund' },
              { icon: FileText, title: 'Tax Blog', description: 'Tips and advice' },
              { icon: TrendingUp, title: 'Refund Status', description: 'Track your return' },
              { icon: Users, title: '$50 Referral', description: 'Refer a friend' },
            ].map((tool, index) => (
              <div key={index} className="border-2 border-gray-200 bg-white hover:border-[#4054b2] transition-all rounded-lg p-6 text-center" style={{boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'}}>
                <div className="w-12 h-12 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <tool.icon className="w-6 h-6 text-[#4054b2]" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-[#4054b2]">{tool.title}</h3>
                <p className="text-sm text-gray-600">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-[#4054b2]">
            Ready to Get Your Maximum Refund?
          </h2>
          <p className="text-xl mb-8 text-black">
            Join thousands of satisfied customers. File with confidence today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/start-filing/form">
              <Button
                size="lg"
                className="bg-[#32373c] hover:bg-[#1a1d20] text-white text-xl px-12 py-6 h-auto font-bold rounded-full"
                style={{
                  padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
                  boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'
                }}
              >
                START YOUR TAX RETURN
              </Button>
            </Link>
            <Link href="/book-appointment">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-[#4054b2] hover:bg-gray-50 border-2 border-[#4054b2] text-xl px-12 py-6 h-auto font-semibold rounded-full"
                style={{
                  padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
                  boxShadow: '6px 6px 9px rgba(0,0,0,0.2)'
                }}
              >
                BOOK FREE CONSULTATION
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Notice */}
      <section className="py-8 px-4 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-gray-600">
            Refund amounts and statistics are based on historical data. © Tax Genius Pro. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
