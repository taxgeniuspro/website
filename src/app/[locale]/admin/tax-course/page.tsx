'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, BookOpen, Award, Clock, DollarSign, Users, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function TaxCoursePage() {
  const [selectedPlan, setSelectedPlan] = useState<'full' | 'installment'>('full');

  const courseUnits = [
    { number: 1, title: 'General Principles' },
    { number: 2, title: 'Dependents – Filing Status – Exemptions' },
    { number: 3, title: 'The Tax Computation' },
    { number: 4, title: 'Gross Income Exclusions and Inclusions' },
    { number: 5, title: 'Gross Income Exclusions (Cont\'d)' },
    { number: 6, title: 'Sale Or Exchange of Property' },
    { number: 7, title: 'Basis' },
    { number: 8, title: 'Capital Gains and Losses' },
    { number: 9, title: 'Business Deductions' },
    { number: 10, title: 'Other Allowable Tax Deductions' },
    { number: 11, title: 'Depreciation Depletion and Amortization' },
    { number: 12, title: 'Business and Casualty Losses' },
    { number: 13, title: 'Bad Debts' },
    { number: 14, title: 'Self Employment Tax FICA FUTA' },
    { number: 15, title: 'Estimated Tax 1040-ES' },
    { number: 16, title: 'Income Tax Withholding' },
    { number: 17, title: 'FICA FUTA Payroll Taxes' },
    { number: 18, title: 'Tax Credits' },
    { number: 19, title: 'Gain On The Sale of Taxpayer\'s Residence' },
    { number: 20, title: 'Other Special Tax Provisions' },
  ];

  const inclusions = [
    'Online training with user portal accessible via computer, tablet, cellphone',
    'Hard copy lesson text materials provided',
    'Hundreds of practical problems with solutions',
    'Real-life case studies for tax return preparation practice',
    'Personal instructor assignment for guidance and remediation',
    'Online interactive examinations with automatic grading',
    'One year postgraduate consultation service',
    'Building and Operating a Successful Tax Practice Book (250 pages)',
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
      <section className="bg-gradient-to-br from-[#4054b2] to-[#2a3a7a] text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                Start Your Journey Today
              </h1>
              <p className="text-xl lg:text-2xl mb-8">
                The Class Course overview, Details and Syllabus are listed below.
              </p>
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl mb-6">
                <p className="text-lg font-medium mb-4">
                  Our nationally accredited course has taught over <strong>40,000 people</strong> how to prepare individual and small-to-medium business tax returns.
                </p>
                <p className="text-lg">
                  The 2024 Federal Income Tax Course now available
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Badge className="bg-white text-[#4054b2] px-6 py-3 text-lg font-bold hover:bg-white">
                  20 Easy-to-Master Units
                </Badge>
                <Badge className="bg-white text-[#4054b2] px-6 py-3 text-lg font-bold hover:bg-white">
                  Cutting-Edge Interface
                </Badge>
              </div>
            </div>
            <div className="relative h-[500px]">
              <Image
                src="/wordpress-assets/polo-shirt-mockup-of-a-woman-talking-on-the-phone-at-an-outdoor-restaurant-33544a-683x1024.webp"
                alt="Tax Professional"
                fill
                className="object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold text-center mb-4">Course Tuition</h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Choose the payment plan that works best for you
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Full Payment Option */}
            <Card
              className={`border-2 cursor-pointer transition-all ${
                selectedPlan === 'full'
                  ? 'border-[#4054b2] shadow-xl scale-105'
                  : 'border-border hover:border-[#4054b2]/50'
              }`}
              onClick={() => setSelectedPlan('full')}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-[#4054b2]" />
                </div>
                <CardTitle className="text-3xl mb-2">Full Tuition</CardTitle>
                <CardDescription className="text-lg">Pay in full</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="text-6xl font-bold text-[#4054b2] mb-2">$695</div>
                  <p className="text-muted-foreground">One-time payment</p>
                  <p className="text-sm text-muted-foreground mt-2">Includes $125 Registration Fee</p>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Immediate full course access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>All course materials included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Certificate upon completion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>One year postgraduate consultation</span>
                  </li>
                </ul>
                {selectedPlan === 'full' && (
                  <Badge className="bg-green-600 text-white hover:bg-green-600">
                    Selected Plan
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* 3-Payment Plan Option */}
            <Card
              className={`border-2 cursor-pointer transition-all ${
                selectedPlan === 'installment'
                  ? 'border-[#4054b2] shadow-xl scale-105'
                  : 'border-border hover:border-[#4054b2]/50'
              }`}
              onClick={() => setSelectedPlan('installment')}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[#4054b2]" />
                </div>
                <CardTitle className="text-3xl mb-2">3-Payment Plan</CardTitle>
                <CardDescription className="text-lg">Flexible installments</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="text-6xl font-bold text-[#4054b2] mb-2">$240</div>
                  <p className="text-muted-foreground">Per payment x 3</p>
                  <p className="text-sm text-muted-foreground mt-2">Total: $720 (Includes $125 Registration Fee)</p>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Immediate course access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>All course materials included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Certificate upon completion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Flexible monthly payments</span>
                  </li>
                </ul>
                {selectedPlan === 'installment' && (
                  <Badge className="bg-green-600 text-white hover:bg-green-600">
                    Selected Plan
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white text-2xl px-16 py-8 h-auto font-black rounded-full shadow-2xl"
            >
              REGISTER FOR THIS COURSE
            </Button>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            8 weeks or 12 months—your choice
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Each of the 20 units takes about <strong>eight hours</strong> to complete
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2">
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-[#4054b2] mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-3">Accelerated Track</h3>
                <p className="text-lg text-muted-foreground">
                  Complete the course in as little as <strong>eight weeks</strong>
                </p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-16 h-16 text-[#4054b2] mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-3">Extended Track</h3>
                <p className="text-lg text-muted-foreground">
                  Take up to a <strong>full year</strong> to complete at your own pace
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Course Curriculum */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-center mb-12">
            <div className="relative w-32 h-32">
              <Image
                src="/wordpress-assets/Software_Box-Pro-green-300x300.webp"
                alt="Tax Software"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-center mb-4">Complete 20-Unit Curriculum</h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Clear and accessible modules covering all aspects of federal tax preparation
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {courseUnits.map((unit) => (
              <Card key={unit.number} className="border-2 hover:border-[#4054b2] transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#4054b2] text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-lg">
                      {unit.number}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{unit.title}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold text-center mb-4">Course Inclusions</h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Everything you need to become a successful tax professional
          </p>

          <Card className="border-2 border-[#4054b2]">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {inclusions.map((inclusion, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <p className="text-lg">{inclusion}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-12 bg-blue-50 dark:bg-blue-950/20 p-8 rounded-xl border-2 border-[#4054b2]">
            <h3 className="text-2xl font-bold mb-4 text-center">Personal Instructor Assignment</h3>
            <p className="text-lg text-center text-muted-foreground">
              You'll be assigned a skilled instructor who will serve as your personal guide throughout the course (and beyond!)
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#4054b2]" />
                </div>
                <div className="text-5xl font-bold text-[#4054b2] mb-2">40,000+</div>
                <p className="text-lg text-muted-foreground">Students Trained</p>
              </CardContent>
            </Card>

            <Card className="border-2 text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-[#4054b2]" />
                </div>
                <div className="text-5xl font-bold text-[#4054b2] mb-2">20</div>
                <p className="text-lg text-muted-foreground">Comprehensive Units</p>
              </CardContent>
            </Card>

            <Card className="border-2 text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#4054b2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-[#4054b2]" />
                </div>
                <div className="text-5xl font-bold text-[#4054b2] mb-2">Nationally</div>
                <p className="text-lg text-muted-foreground">Accredited</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#4054b2] to-[#2a3a7a] text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Start Your Tax Career?
          </h2>
          <p className="text-xl mb-8">
            Join 40,000+ successful tax professionals who started with Tax Genius Pro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white text-2xl px-16 py-8 h-auto font-black rounded-full shadow-2xl"
            >
              REGISTER FOR THIS COURSE
            </Button>
            <Link href="/admin/preparer-job-form">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-[#4054b2] hover:bg-gray-100 text-xl px-12 py-6 h-auto font-bold border-2"
              >
                APPLY FOR JOB
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 px-4 bg-background border-t">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-muted-foreground">
            This is an administrative preview page. Course pricing and content subject to change. © Tax Genius Pro. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
