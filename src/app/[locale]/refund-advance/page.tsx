'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Shield,
  FileText,
  CreditCard,
  Zap,
  Star,
  TrendingUp,
  Award,
  Calendar,
  Phone,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';

export default function RefundAdvancePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-success/10 text-success border-success/20 text-base px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Fast Access to Your Refund
              </Badge>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl lg:text-6xl font-bold text-foreground mb-6"
              >
                Get Your Refund <span className="text-primary">Faster</span> with Tax Genius Pro
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
              >
                Don't wait weeks for your tax refund. With our Refund Advance program, you can get
                same-day access to your money with 0% interest and no fees.
              </motion.p>
            </div>

            <Alert className="max-w-4xl mx-auto mb-12 border-primary/20 bg-primary/5">
              <Calendar className="h-5 w-5 text-primary" />
              <AlertTitle className="text-primary text-lg">2025 Tax Season Program</AlertTitle>
              <AlertDescription className="text-muted-foreground text-base">
                The Refund Advance program is available at participating Tax Genius Pro locations
                from <strong>January 3 - February 28, 2025</strong>. File your taxes today and get
                every dollar you deserve, faster!
              </AlertDescription>
            </Alert>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10 max-w-5xl mx-auto"
            >
              <Image
                src="https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=1200&q=80"
                alt="Happy mother and child celebrating tax refund"
                width={1200}
                height={600}
                className="object-cover w-full h-[400px]"
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg" asChild>
                    <Link href="/start-filing/form">
                      Get Started Today
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg bg-white/90 hover:bg-white"
                    asChild
                  >
                    <Link href="/contact">
                      <Phone className="w-5 h-5 mr-2" />
                      Speak with a Tax Pro
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              How the Refund Advance Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Getting your refund faster is easy. Just follow these simple steps.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="text-center h-full hover:shadow-xl transition-all border-2 hover:border-primary/50">
                <CardHeader>
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <div className="mb-3">
                    <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">
                      Step 1
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-4">File Your Taxes with a Tax Pro</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    During your virtual or in-office appointment, your Tax Genius Pro will help you
                    file your return and apply for the Refund Advance.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span>Virtual & In-Office Available</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="text-center h-full hover:shadow-xl transition-all border-2 hover:border-primary/50">
                <CardHeader>
                  <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-10 h-10 text-success" />
                  </div>
                  <div className="mb-3">
                    <Badge className="bg-success text-success-foreground text-base px-3 py-1">
                      Step 2
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-4">Receive Your Loan Funds</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If approved, get same-day access to your loan funds via prepaid card or direct
                    transfer to your bank account.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-success">
                    <Zap className="w-4 h-4" />
                    <span>Same-Day Access</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="text-center h-full hover:shadow-xl transition-all border-2 hover:border-primary/50">
                <CardHeader>
                  <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-10 h-10 text-secondary" />
                  </div>
                  <div className="mb-3">
                    <Badge className="bg-secondary text-secondary-foreground text-base px-3 py-1">
                      Step 3
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-4">Automatic Repayment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We'll help you set up repayment so your refund automatically pays back the loan
                    once it's received from the IRS.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-secondary">
                    <Shield className="w-4 h-4" />
                    <span>Hassle-Free & Automatic</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why People Love It */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why People Love Refund Advance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Thousands of clients have trusted our Refund Advance program to get their money faster
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="text-center hover:shadow-lg transition-all">
                <CardContent className="pt-8 pb-6">
                  <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">No Credit Impact</h3>
                  <p className="text-muted-foreground">
                    Applying won't affect your credit score. Quick approval process with minimal
                    requirements.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="text-center hover:shadow-lg transition-all border-2 border-primary/20">
                <CardContent className="pt-8 pb-6">
                  <DollarSign className="w-12 h-12 text-success mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">0% Interest & No Fees</h3>
                  <p className="text-muted-foreground">
                    No loan fees, no interest charges. Get your money with zero additional costs.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="text-center hover:shadow-lg transition-all">
                <CardContent className="pt-8 pb-6">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">High Approval Rates</h3>
                  <p className="text-muted-foreground">
                    Easy application process with high approval rates. Get your answer quickly.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-4">
                    "I had the Refund Advance money loaded on my card by the time I got home. I
                    really needed the advance and Tax Genius Pro made it so easy."
                  </p>
                  <p className="font-semibold text-foreground">— Donna</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-4">
                    "I like how fast and simple Refund Advance was. And how quickly I got money on
                    my card. Couldn't be happier!"
                  </p>
                  <p className="font-semibold text-foreground">— Hollis</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-4">
                    "Refund Advance was easy. Love that there are no fees for it. Makes a huge
                    difference when money is tight."
                  </p>
                  <p className="font-semibold text-foreground">— Tax Genius Pro Client</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Testimonial 4 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-4">
                    "I like that with Refund Advance we are able to get some money now instead of
                    waiting for the IRS. Perfect solution!"
                  </p>
                  <p className="font-semibold text-foreground">— Brittany B.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Testimonial 5 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-4">
                    "Refund Advance allowed me to get a jumpstart into the new year. I was able to
                    get ahead of my bills by a couple months even."
                  </p>
                  <p className="font-semibold text-foreground">— Vernisha A.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Testimonial 6 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic mb-4">
                    "Overall, it was very quick. I would recommend a Refund Advance. Always helps in
                    any pinch."
                  </p>
                  <p className="font-semibold text-foreground">— S. Bryant</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Tax Genius Pro */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              See Why 100K+ Clients Choose Tax Genius Pro
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              For every return, we guarantee exceptional service and results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">100% Accuracy</h3>
              <p className="text-muted-foreground">
                We guarantee your return is 100% accurate or we'll pay any IRS penalties
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold mb-3">Maximum Refund</h3>
              <p className="text-muted-foreground">
                Our tax pros find every deduction and credit you deserve to maximize your refund
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3">No Surprise Pricing</h3>
              <p className="text-muted-foreground">
                Transparent pricing with no hidden fees. You know exactly what you'll pay upfront
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Expert Tax Pros</h3>
              <p className="text-muted-foreground">
                Work with certified professionals trained to get you every credit and deduction
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-8 lg:p-12">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                      Ready to File and Access Your Refund Faster?
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                      Our tax professionals are ready to help you file your return and apply for a
                      Refund Advance. Get started today!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg" asChild>
                      <Link href="/contact">
                        <Phone className="w-5 h-5 mr-2" />
                        Speak with a Tax Genius Pro
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="text-lg" asChild>
                      <Link href="/start-filing/form">
                        Start Filing Today
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground pt-6 border-t">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Licensed Tax Professionals
                    </span>
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-success" />
                      100% Secure & Private
                    </span>
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-success" />
                      Same-Day Funding Available
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
