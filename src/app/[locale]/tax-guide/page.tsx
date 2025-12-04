'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Download,
  CheckCircle,
  Calendar,
  DollarSign,
  Users,
  Home,
  Briefcase,
  TrendingUp,
  FileText,
  Clock,
  Calculator,
  Award,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function TaxGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <Badge className="bg-primary/10 text-primary px-4 py-2">
                <BookOpen className="w-4 h-4 mr-2" />
                2024 Tax Season Guide
              </Badge>

              <h1 className="text-4xl lg:text-6xl font-bold">
                Your Complete <span className="text-primary">2024 Tax Guide</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Everything you need to know about filing your 2024 taxes. Brackets, deductions,
                credits, and key dates explained in plain English.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="professional" size="lg" asChild>
                  <Link href="/start-filing">Start Your 2024 Return</Link>
                </Button>
                <Button size="lg" variant="outline">
                  <Download className="mr-2 w-5 h-5" />
                  Download PDF Guide
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 pt-4 text-sm">
                {[
                  { icon: Calendar, text: 'Updated for 2024' },
                  { icon: CheckCircle, text: 'CPA Verified' },
                  { icon: FileText, text: 'Easy to Understand' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <item.icon className="w-5 h-5 text-success" />
                    <span>{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="relative rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80"
                  alt="Person reading tax guide"
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                  className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border-2 border-background rounded-lg shadow-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">Apr 15, 2025</p>
                      <p className="text-sm text-muted-foreground">Filing Deadline</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Dates */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">Important 2024 Tax Dates</h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { date: 'Jan 31', event: 'W-2 & 1099 Deadline', icon: FileText },
              {
                date: 'Apr 15',
                event: 'Individual Tax Deadline',
                icon: AlertCircle,
                highlight: true,
              },
              { date: 'Oct 15', event: 'Extension Deadline', icon: Clock },
              { date: 'Dec 31', event: 'Year-End Tax Moves', icon: Calendar },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card
                  className={`text-center ${item.highlight ? 'border-2 border-primary shadow-lg' : ''}`}
                >
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{item.date}</div>
                    <p className="text-sm font-semibold">{item.event}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 2024 Tax Brackets */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">2024 Federal Tax Brackets</h2>
            <p className="text-lg text-muted-foreground">Income tax rates for 2024 tax year</p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Single Filers */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-6 h-6 text-primary" />
                      Single Filers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { rate: '10%', income: '$0 - $11,600' },
                      { rate: '12%', income: '$11,601 - $47,150' },
                      { rate: '22%', income: '$47,151 - $100,525' },
                      { rate: '24%', income: '$100,526 - $191,950' },
                      { rate: '32%', income: '$191,951 - $243,725' },
                      { rate: '35%', income: '$243,726 - $609,350' },
                      { rate: '37%', income: '$609,351+' },
                    ].map((bracket, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-bold text-primary">{bracket.rate}</span>
                        <span className="text-sm text-muted-foreground">{bracket.income}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Married Filing Jointly */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-6 h-6 text-primary" />
                      Married Filing Jointly
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { rate: '10%', income: '$0 - $23,200' },
                      { rate: '12%', income: '$23,201 - $94,300' },
                      { rate: '22%', income: '$94,301 - $201,050' },
                      { rate: '24%', income: '$201,051 - $383,900' },
                      { rate: '32%', income: '$383,901 - $487,450' },
                      { rate: '35%', income: '$487,451 - $731,200' },
                      { rate: '37%', income: '$731,201+' },
                    ].map((bracket, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-bold text-primary">{bracket.rate}</span>
                        <span className="text-sm text-muted-foreground">{bracket.income}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Standard Deduction & Credits */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            {/* Standard Deductions */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Calculator className="w-8 h-8 text-primary" />
                2024 Standard Deductions
              </h2>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { status: 'Single', amount: '$14,600', increase: '+$750' },
                    { status: 'Married Filing Jointly', amount: '$29,200', increase: '+$1,500' },
                    { status: 'Head of Household', amount: '$21,900', increase: '+$1,100' },
                    {
                      status: 'Additional (65+ or blind)',
                      amount: '+$1,550/$1,950',
                      increase: 'Per person',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex justify-between items-center p-4 bg-background rounded-lg border group hover:border-primary transition-colors"
                    >
                      <div>
                        <p className="font-semibold">{item.status}</p>
                        <p className="text-xs text-muted-foreground">{item.increase}</p>
                      </div>
                      <div className="text-2xl font-bold text-primary">{item.amount}</div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Popular Tax Credits */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Award className="w-8 h-8 text-primary" />
                Popular Tax Credits
              </h2>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {[
                    {
                      credit: 'Child Tax Credit',
                      amount: 'Up to $2,000',
                      desc: 'Per qualifying child under 17',
                    },
                    {
                      credit: 'Earned Income Credit',
                      amount: 'Up to $7,430',
                      desc: 'Based on income and family size',
                    },
                    {
                      credit: 'Child Care Credit',
                      amount: 'Up to $2,100',
                      desc: 'For qualifying child care expenses',
                    },
                    {
                      credit: 'American Opportunity Credit',
                      amount: 'Up to $2,500',
                      desc: 'For college education expenses',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 bg-background rounded-lg border group hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{item.credit}</h3>
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          {item.amount}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Guide Sections */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Tax Topics Explained</h2>
            <p className="text-lg text-muted-foreground">Click to explore each topic in detail</p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {[
                {
                  icon: DollarSign,
                  title: 'Common Deductions',
                  content:
                    'Mortgage interest, state & local taxes (SALT), charitable contributions, medical expenses over 7.5% of AGI, student loan interest up to $2,500, IRA contributions, and HSA contributions.',
                },
                {
                  icon: Home,
                  title: 'Homeowner Tax Benefits',
                  content:
                    'Mortgage interest deduction on loans up to $750,000, property tax deduction (SALT cap $10,000), home office deduction for self-employed, capital gains exclusion on home sale ($250K single/$500K married), and energy-efficient home improvement credits.',
                },
                {
                  icon: Briefcase,
                  title: 'Self-Employment Taxes',
                  content:
                    'Self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare). You can deduct 50% of SE tax, health insurance premiums, retirement contributions, home office, vehicle expenses, and business supplies.',
                },
                {
                  icon: TrendingUp,
                  title: 'Investment Income',
                  content:
                    'Long-term capital gains (held >1 year) taxed at 0%, 15%, or 20% depending on income. Short-term gains taxed as ordinary income. Qualified dividends get preferential rates. Report on Schedule D and Form 8949.',
                },
                {
                  icon: Users,
                  title: 'Filing Status & Dependents',
                  content:
                    'Choose Single, Married Filing Jointly, Married Filing Separately, Head of Household, or Qualifying Widow(er). Dependents must meet age, relationship, residency, and support tests. Each dependent may qualify you for credits.',
                },
                {
                  icon: FileText,
                  title: 'Required Documents',
                  content:
                    'W-2 from employer, 1099 forms (INT, DIV, NEC, MISC, etc.), mortgage interest statement (1098), property tax records, charitable donation receipts, business expense records, prior year tax return, and Form 1095-A for health insurance.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <AccordionItem
                    value={`item-${i}`}
                    className="bg-card rounded-lg px-6 border hover:border-primary transition-colors"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-left font-semibold">{item.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pl-14 pt-2 leading-relaxed">
                      {item.content}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Free Tax Resources</h2>
            <p className="text-lg text-muted-foreground">Downloadable guides and calculators</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: '2024 Tax Checklist',
                desc: 'Complete list of documents needed for filing',
                icon: CheckCircle,
                color: 'text-green-500',
              },
              {
                title: 'Deduction Finder',
                desc: 'Interactive tool to find all eligible deductions',
                icon: Calculator,
                color: 'text-blue-500',
              },
              {
                title: 'Tax Calendar',
                desc: 'All important deadlines and dates for 2024',
                icon: Calendar,
                color: 'text-purple-500',
              },
            ].map((resource, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="hover:shadow-xl transition-all cursor-pointer group h-full">
                  <CardHeader>
                    <div
                      className={`w-14 h-14 ${resource.color} bg-primary/5 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <resource.icon className="w-7 h-7" />
                    </div>
                    <CardTitle className="text-center">{resource.title}</CardTitle>
                    <CardDescription className="text-center">{resource.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full group-hover:border-primary">
                      <Download className="mr-2 w-4 h-4" />
                      Download Free
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-3xl lg:text-4xl font-bold">Need Help with Your 2024 Taxes?</h2>
            <p className="text-lg text-muted-foreground">
              Let our CPAs handle it. We'll maximize your refund and ensure accuracy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing">
                  File with a CPA <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/tax-calculator">
                  <Calculator className="mr-2 w-5 h-5" />
                  Try Tax Calculator
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
