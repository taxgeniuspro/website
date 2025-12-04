'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  FileSearch,
  TrendingUp,
  Users,
  Shield,
  Clock,
  DollarSign,
  Building,
} from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    icon: Calculator,
    title: 'Individual Tax Returns',
    description: 'Personal tax preparation with maximum deduction optimization',
    price: 'Starting at $150',
    features: ['W-2 & 1099 Forms', 'Standard Deductions', 'E-filing Included'],
    link: '/services/individual',
  },
  {
    icon: Building,
    title: 'Business Tax Services',
    description: 'Comprehensive business tax preparation and planning',
    price: 'Starting at $350',
    features: ['LLC & Corporation', 'Quarterly Estimates', 'Tax Planning'],
    link: '/services/business',
  },
  {
    icon: FileSearch,
    title: 'Tax Audit Support',
    description: 'Professional representation during IRS audits',
    price: 'Consultation Required',
    features: ['IRS Representation', 'Document Preparation', 'Resolution Support'],
    link: '/services/audit',
  },
  {
    icon: TrendingUp,
    title: 'Tax Planning',
    description: 'Strategic planning to minimize your tax liability',
    price: 'Starting at $250',
    features: ['Year-round Planning', 'Investment Strategy', 'Retirement Planning'],
    link: '/services/planning',
  },
  {
    icon: Users,
    title: 'Family Tax Services',
    description: 'Complete tax services for families with dependents',
    price: 'Starting at $200',
    features: ['Child Tax Credits', 'Education Credits', 'Family Deductions'],
    link: '/services/family',
  },
  {
    icon: Clock,
    title: 'Express Filing',
    description: 'Fast-track tax filing for simple returns',
    price: 'Starting at $99',
    features: ['24-hour Turnaround', 'Simple Returns', 'Direct Deposit'],
    link: '/services/express',
  },
];

export function ServiceGrid() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Tax Services</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional tax preparation and planning services tailored to your needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card
                key={index}
                className="relative overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    <Badge variant="secondary">{service.price}</Badge>
                  </div>
                  <CardTitle className="mt-4">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <DollarSign className="h-3 w-3 mr-2 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href={service.link}>Learn More</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Card className="inline-block p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-4">
              <Shield className="h-12 w-12 text-primary" />
              <div className="text-left">
                <h3 className="font-bold text-lg">100% Satisfaction Guarantee</h3>
                <p className="text-sm text-muted-foreground">
                  We stand behind our work with a complete satisfaction guarantee
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
