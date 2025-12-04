'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Search,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Smartphone,
  FileText,
  Calendar,
  DollarSign,
  Info,
  ExternalLink,
  Lock,
  RefreshCw,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';

export default function FindARefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with Refund Checker */}
      <section className="relative py-16 lg:py-24 overflow-hidden bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left Column - Heading & Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Search className="w-3 h-3 mr-2" />
                  Refund Status Tracker
                </Badge>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                  Where's My <span className="text-primary">Refund?</span>
                </h1>
                <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  Track your federal tax refund status in real-time. Get updates on your refund
                  processing and estimated arrival date.
                </p>
              </div>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Updated Daily</span>
                </div>
                <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">100% Secure</span>
                </div>
                <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">IRS Authorized</span>
                </div>
              </div>

              {/* When to Check Info */}
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">When Can I Check?</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground space-y-1">
                  <p>
                    • <strong>E-Filed 2024 Returns:</strong> 24 hours after filing
                  </p>
                  <p>
                    • <strong>E-Filed 2022-2023:</strong> 3-4 days after filing
                  </p>
                  <p>
                    • <strong>Paper Returns:</strong> 4 weeks after mailing
                  </p>
                </AlertDescription>
              </Alert>
            </motion.div>

            {/* Right Column - Image & Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Hero Image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10 group">
                <Image
                  src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80"
                  alt="Person checking tax refund status on computer"
                  width={800}
                  height={600}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30" />

                {/* Floating Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute bottom-6 left-6 right-6 bg-card/95 backdrop-blur-sm border-2 border-background rounded-xl shadow-xl p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-7 h-7 text-success" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">Fast Refunds</p>
                      <p className="text-sm text-muted-foreground">
                        Most e-filed returns processed in 21 days or less
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* CTA Card */}
              <Card className="border-2 border-primary/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Search className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Ready to Check Your Refund?</h3>
                      <p className="text-sm text-muted-foreground">
                        Use the official IRS tool to check your federal tax refund status
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-lg"
                      asChild
                    >
                      <a
                        href="https://sa.www4.irs.gov/wmr/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Check My Refund on IRS.gov
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Secure official IRS website
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Refund Status Timeline - Visual Process */}
      <section className="py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Understanding Your Refund Status
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your refund goes through three main stages. Here's what to expect at each step.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Stage 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="text-center h-full hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <div className="mb-2">
                    <Badge className="bg-primary text-primary-foreground">Step 1</Badge>
                  </div>
                  <CardTitle className="text-xl">Return Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    The IRS has received your tax return and is processing it. This typically
                    happens within 24 hours of e-filing.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stage 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="text-center h-full hover:shadow-lg transition-all border-primary/50">
                <CardHeader>
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                  <div className="mb-2">
                    <Badge className="bg-primary text-primary-foreground">Step 2</Badge>
                  </div>
                  <CardTitle className="text-xl">Refund Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Your refund has been approved and the IRS is preparing to send your refund. This
                    usually takes 1-2 weeks.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stage 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="text-center h-full hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-10 h-10 text-success" />
                  </div>
                  <div className="mb-2">
                    <Badge className="bg-success text-success-foreground">Step 3</Badge>
                  </div>
                  <CardTitle className="text-xl">Refund Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Your refund has been sent! Direct deposits arrive in 1-5 business days. Paper
                    checks take 2-3 weeks.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What You Need Section */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative order-2 lg:order-1"
            >
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80"
                  alt="Person checking tax refund on laptop"
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 order-1 lg:order-2"
            >
              <div>
                <Badge className="mb-4">Required Information</Badge>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">What You Need to Check</h2>
                <p className="text-lg text-muted-foreground">
                  Have these details from your tax return ready before checking your refund status.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Social Security Number</h3>
                    <p className="text-muted-foreground">
                      Your SSN or Individual Taxpayer Identification Number (ITIN)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Filing Status</h3>
                    <p className="text-muted-foreground">
                      Single, Married Filing Jointly, Head of Household, etc.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Exact Refund Amount</h3>
                    <p className="text-muted-foreground">
                      The whole dollar amount shown on your return (no cents)
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertTitle>Information Updated Daily</AlertTitle>
                <AlertDescription>
                  The IRS updates refund status information once a day, overnight. Check back every
                  24 hours for updates.
                </AlertDescription>
              </Alert>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-16 bg-muted/50 border-y">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Smartphone className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-3xl lg:text-4xl font-bold">Using a Mobile Device?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Download the official IRS2Go mobile app to check your refund status on the go.
                Available for iOS and Android.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" variant="outline" asChild>
                  <a
                    href="https://apps.apple.com/us/app/irs2go/id414113282"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Download for iOS
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a
                    href="https://play.google.com/store/apps/details?id=gov.irs"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Download for Android
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Important Information - Accordion */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Important Information</h2>
              <p className="text-lg text-muted-foreground">
                Common questions and scenarios about checking your refund status
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {/* Before You File a Second Return */}
              <AccordionItem value="item-1" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold">Before You File a Second Tax Return</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  <div className="space-y-4 pt-2">
                    <p className="font-medium text-foreground">
                      Filing the same tax return again typically won't speed up your refund, and
                      could even lead to delays.
                    </p>
                    <div>
                      <p className="font-medium text-foreground mb-2">
                        However, you should resubmit your tax return (electronically if possible) if
                        ALL of these apply:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>You are due a refund</li>
                        <li>You filed on paper more than 6 months ago</li>
                        <li>Where's My Refund does not show that we received your return</li>
                      </ul>
                    </div>
                    <Alert className="bg-destructive/10 border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-destructive">
                        Resubmit your tax return ONLY if all of the items above apply to you.
                      </AlertDescription>
                    </Alert>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* When to Call */}
              <AccordionItem value="item-2" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold">When to Call the IRS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  <div className="space-y-4 pt-2">
                    <p>
                      Call the IRS about your refund status{' '}
                      <strong className="text-foreground">only if</strong> Where's My Refund directs
                      you to contact them.
                    </p>
                    <div className="bg-muted/50 border rounded-lg p-4">
                      <p className="font-semibold text-foreground mb-2">IRS Contact Information:</p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        1-800-829-1040 (Individual Tax Returns)
                      </p>
                      <p className="text-sm mt-2">
                        Hours: Monday - Friday, 7:00 AM - 7:00 PM local time
                      </p>
                    </div>
                    <p className="text-sm">
                      Have your tax return and supporting documents ready when you call.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* If Refund Is Delayed */}
              <AccordionItem value="item-3" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold">If Your Refund Is Delayed</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  <div className="space-y-4 pt-2">
                    <p>
                      Your refund may be delayed if your return needs corrections or extra review.
                      If the IRS needs more information to process your return, they'll contact you
                      by mail.
                    </p>
                    <div>
                      <p className="font-semibold text-foreground mb-2">
                        Common reasons for delays:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Your return contains errors or is incomplete</li>
                        <li>Your return is flagged for identity theft or fraud prevention</li>
                        <li>
                          You claimed the Earned Income Tax Credit (EITC) or Additional Child Tax
                          Credit
                        </li>
                        <li>Your return needs further review in general</li>
                        <li>You filed a paper return during peak tax season</li>
                      </ul>
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        The IRS processes most refunds within 21 days of acceptance. Some returns
                        require additional review and may take longer.
                      </AlertDescription>
                    </Alert>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Paper vs E-File Timeline */}
              <AccordionItem value="item-4" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold">Paper Returns vs. E-Filing Timeline</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  <div className="space-y-4 pt-2">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          E-Filing
                        </h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Check status in 24 hours</li>
                          <li>• Refund in 21 days or less</li>
                          <li>• Immediate confirmation</li>
                          <li>• Faster processing</li>
                        </ul>
                      </div>
                      <div className="bg-muted/50 border rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Paper Filing
                        </h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Wait 4 weeks to check</li>
                          <li>• Refund in 6-8 weeks</li>
                          <li>• No instant confirmation</li>
                          <li>• Slower processing</li>
                        </ul>
                      </div>
                    </div>
                    <Alert className="bg-primary/5 border-primary/20">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-foreground">
                        <strong>Recommendation:</strong> E-file your returns for faster processing
                        and refunds. We offer professional e-filing services with expert CPA review.
                      </AlertDescription>
                    </Alert>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Help Section - CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-2 shadow-xl">
                <CardContent className="p-8 lg:p-12">
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <HelpCircle className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-3xl lg:text-4xl font-bold">Need Help With Your Taxes?</h2>
                      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Let our certified CPAs handle your tax preparation. We'll maximize your
                        refund and ensure everything is filed correctly.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                      <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                        <Link href="/start-filing">
                          <FileText className="w-5 h-5 mr-2" />
                          Start Your Return
                        </Link>
                      </Button>
                      <Button size="lg" variant="outline" asChild>
                        <Link href="/contact">
                          <Phone className="w-5 h-5 mr-2" />
                          Talk to a CPA
                        </Link>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground pt-4">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Licensed CPAs
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-4 h-4 text-success" />
                        100% Secure
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-success" />
                        Maximum Refund Guaranteed
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
