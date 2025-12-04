'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CountdownTimer from '@/components/CountdownTimer';
import { CheckCircle, Star, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function PreparerLandingPage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 100000;
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-16 px-4 overflow-hidden">
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
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wide">
              ARE YOU TIRED OF BEING BROKE?
            </h2>

            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              DO YOU WANT TO
              <br />
              <motion.span
                className="text-white"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                MAKE
              </motion.span>
              <br />
              <span className="text-5xl md:text-7xl lg:text-8xl">up to</span>
              <br />
              <motion.span
                className="text-6xl md:text-8xl lg:text-9xl text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100, delay: 0.5 }}
              >
                ${count.toLocaleString()}+
              </motion.span>
            </motion.h1>

            <h2 className="text-3xl md:text-4xl font-bold">THIS TAX SEASON?</h2>

            <div className="bg-yellow-400 text-black inline-block px-6 py-3 rounded-lg font-bold text-xl md:text-2xl mt-4">
              FREE TRAINING AND MARKETING PRODUCTS FOR 100 PEOPLE
            </div>

            <div className="mt-8">
              <CountdownTimer />
            </div>

            <Badge className="inline-block bg-red-600 text-white px-6 py-3 text-lg hover:bg-red-700 mt-4">
              LIMITED TIME OFFER
            </Badge>

            <div className="pt-6">
              <Link href="/preparer/start">
                <Button
                  size="lg"
                  className="h-16 px-12 text-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 hover:scale-105 transition-transform"
                >
                  Get My Free Consultation - I WANT TO START TODAY!
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span>4.5 out of 2617 reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Coach Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <Image
                src="/tax-genius-logo.png"
                alt="Tax Genius Logo"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">MEET COACH OWLIVER.</h2>
            <p className="text-2xl font-semibold text-primary">
              BECOME A TAX PREPARER AND WE'LL SHOW YOU HOW TO START BUILDING YOUR CLIENT LIST
              TODAY!!
            </p>
          </div>
        </div>
      </section>

      {/* Perfect For You Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
            TAX GENIUS IS PERFECT FOR YOU, ONLY IF...
          </h2>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              {[
                "You're tired of constantly struggling financially and not having enough money to enjoy life the way you want.",
                "You're finding it difficult to make ends meet and desperately need extra income just to cover your bills.",
                "You've been searching for a job for a while, but nothing is coming through, and the frustration is building.",
                'You feel stuck in your current situation, knowing you need a change but unsure where to start in pursuing a new career.',
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <p className="text-lg">{text}</p>
                </div>
              ))}

              <div className="bg-card border-2 border-primary rounded-xl p-8 mt-8">
                <div className="text-5xl font-bold text-primary mb-2">$75,000</div>
                <div className="text-xl font-semibold">AVERAGE TAX PREPARER INCOME</div>
              </div>
            </div>

            <div className="relative h-[600px] rounded-2xl overflow-hidden border-4 border-primary/20">
              <Image
                src="/professional-tax-preparer.webp"
                alt="Professional tax preparer"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 bg-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-3xl font-bold mb-6">
            We know you've got the drive—now let us help with the marketing!
          </h3>
          <p className="text-xl mb-8">
            Want a job that finally works around your schedule? As a TAX GENIUS PRO, you'll enjoy a
            flexible work-life balance, earn extra income, and master a life skill that helps
            millions every year.
          </p>
          <p className="text-lg font-semibold mb-8">
            Sign up now and start getting your materials immediately—Start posting on your social
            media today!
          </p>
          <Link href="/preparer/start">
            <Button size="lg" className="h-16 px-12 text-xl font-bold">
              Get My Free Consultation - I WANT TO START TODAY!
            </Button>
          </Link>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="bg-card border rounded-2xl p-8 md:p-12"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">
              <motion.div
                className="relative w-full h-80 rounded-lg overflow-hidden"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Image
                  src="/erin.webp"
                  alt="Erin - Tax Genius Pro Success Story"
                  fill
                  className="object-cover"
                />
              </motion.div>

              <div className="space-y-6 text-lg leading-relaxed">
                <p className="font-semibold text-2xl">My name is Erin,</p>

                <p>
                  I used to feel and say the same things. I was just like you—Broke, Bills and No clue
                  of what to do next.
                </p>

                <p>
                  I lost my job went though all my saving during Covid and had to figure out how to
                  make some money.
                </p>

                <p>
                  That's when my friend suggested tax preparation—I knew nothing about taxes but every
                  year I needed A tax professional to prepare my taxes. That's when he said "you, me
                  and Millions of other people have to file taxes every year. How would you like to
                  make a years salary in a couple months? Just try it."
                </p>

                <p className="font-bold text-xl text-primary">
                  Anyway, after a lot of trial and error, we built a system that took me from begging
                  family and friends to do their taxes to earning $139,000 in my second season!
                </p>

                <p>
                  Now, you can do the same. Whether you're just starting or wanting to try something
                  new, The Tax Genius system will give you everything you need to succeed. Clients,
                  Growth, and Financial freedom.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="py-16 px-4 bg-red-50 dark:bg-red-950/20">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            TAX SEASON STARTS SOON. START BUILDING YOUR CLIENT LIST TODAY BEFORE IT TOO LATE.
          </h2>

          <div className="bg-yellow-400 text-black inline-block px-8 py-4 rounded-lg font-bold text-xl mb-8">
            FREE LIMITED TIME OFFER!!!
          </div>

          <p className="text-xl mb-8">
            We are so confident that we can help you become a successful Tax Genius Pro, we are
            giving our program away for absolutely free for the first 100 People.
          </p>

          <CountdownTimer className="mb-8" />

          <p className="text-lg mb-8">Signup today or speak to a Tax Genius rep</p>

          <p className="text-2xl font-bold mb-8">
            Join The FASTEST Growing Tax Preparation Company
          </p>

          <Link href="/preparer/start">
            <Button
              size="lg"
              className="h-16 px-12 text-xl font-bold bg-primary hover:bg-primary/90"
            >
              Get My Free Consultation - I WANT TO START TODAY!
            </Button>
          </Link>
        </div>
      </section>

      {/* Promotional Products Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">GET YOUR PROMOTIONAL PRODUCTS</h2>
            <p className="text-xl">
              You can't call yourself a TAX GENIUS without all the proper tools. We have all the
              promotional products you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {['Polo Shirt', 'Business Cards', 'Flyers'].map((item, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 text-center">
                <div className="h-48 bg-primary/15 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-5xl">📦</div>
                </div>
                <h3 className="font-semibold text-lg">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            NOW LET ME TELL YOU THE BENEFITS OF TAX GENIUS AND HOW WE CAN HELP
          </h2>

          <p className="text-xl text-center mb-12">
            We know it is hard to build a customer base with any business. So Tax Genius developed a
            system that makes it easier for you to go out and get more clients. We provide you with
            everything you need to be great.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Customized Promotional Materials',
                description:
                  "We've got you covered with social media posts, videos, and high-quality printed materials. You won't have to worry about spending money on hiring a designer or wasting time trying to make your own flyers.",
              },
              {
                title: 'Marketing Strategies That Work',
                description:
                  "We'll show you exactly how to get clients—not just by reaching out to friends and family, but by finding new people who need your help with their taxes.",
              },
              {
                title: 'Support & Assistant',
                description:
                  "You'll have a personal support rep who's there to answer any questions and help you solve problems. Plus, we've got two AI assistants who are available 24/7.",
              },
              {
                title: "And there's so much more!",
                description:
                  'Tax software, training videos, practice returns, lead generation forms, client intake automation, and more!',
              },
            ].map((benefit, i) => (
              <div key={i} className="bg-card border rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            WHAT TAX GENIUS PROS SAY ABOUT US
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: 'GELISA WHITE',
                role: '1st Year Tax Genius',
                followers: '15.7k followers',
                image: '/testimonials/gelsiawhite.png',
                quote:
                  'I was really getting tired of doing hair. I needed a change. I wanted to become a tax preparer but did not now how. Tax Genius give me the tools i needed to be very successful',
              },
              {
                name: 'YAUMAR WILLIAMS',
                role: '2nd Year Tax Genius',
                followers: '11.7k followers',
                image: '/testimonials/yaumarwilliams.png',
                quote:
                  'Being an entrepreneur I know that starting a business from scratch was hard however text Genius to help me find clients to make building my Client List quickly',
              },
              {
                name: 'CHELSEA MITCHELL LOWE',
                role: '2nd Year Tax Genius',
                followers: '2,492k followers',
                image: '/testimonials/chelseamichelllowe.png',
                quote:
                  'My biggest problem was keeping my client attention during the office season. But Tax Genius showed me how to Stay on my clients minds and have them looking for me in January',
              },
              {
                name: 'ANGELA RICHARDS',
                role: '2nd Year Tax Genius',
                followers: '1,826k followers',
                image: '/testimonials/angelarichards.png',
                quote:
                  'I sell real estate and with the market being up and down. I needed to figure out something i could do during the cold weather. Tax Genius help me convert my real estate client into Tax clients',
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-card border rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-primary">{testimonial.followers}</p>
                  </div>
                </div>
                <div className="flex justify-center mb-3">
                  {[...Array(5)].map((_, starIdx) => (
                    <Star key={starIdx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            READY TO CHANGE YOUR LIFE! SIGN UP TODAY
          </h2>

          <Link href="/preparer/start">
            <Button
              size="lg"
              className="h-16 px-12 text-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 mb-12"
            >
              Get My Free Consultation - I WANT TO START TODAY!
            </Button>
          </Link>

          <div className="bg-primary-foreground/10 rounded-xl p-8 mb-8">
            <h3 className="text-2xl font-bold mb-4">START BUILDING YOUR CLIENT LIST TODAY!!!</h3>
            <p className="text-xl mb-6">FREE LIMITED TIME OFFER!!!</p>
            <p className="text-lg mb-6">The Fastest Growing Tax Preparation Company</p>

            <CountdownTimer className="mb-8" />

            <p className="mb-6">
              We are so confident that we can help you become a successful Tax Genius Pro, We are
              giving our Program away for free for the first 100 People.
            </p>

            <p className="mb-8">Signup today or speak to a Tax Genius rep</p>

            <Link href="/preparer/start">
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-bold bg-yellow-400 text-black hover:bg-yellow-500"
              >
                Get My Free Consultation - I WANT TO START TODAY!
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Golden Goose Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <motion.div
              className="relative w-80 h-80 mx-auto mb-6"
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 100, duration: 1 }}
            >
              <Image
                src="/golden-eggs.png"
                alt="Golden Eggs"
                fill
                className="object-contain drop-shadow-2xl"
              />
            </motion.div>
            <motion.h2
              className="text-3xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              You just found the owl that lays the golden eggs.
            </motion.h2>
            <motion.p
              className="text-xl"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Ready to get more clients with Tax Genius Pro
            </motion.p>
          </div>

          <div className="text-2xl font-bold mb-8 text-red-600">
            HURRY! START BUILDING YOUR CLIENTS BASE TODAY.
          </div>

          <Link href="/preparer/start">
            <Button size="lg" className="h-16 px-12 text-xl font-bold">
              Get My Free Consultation - I WANT TO START TODAY!
            </Button>
          </Link>
        </div>
      </section>

      {/* Final Urgency */}
      <section className="py-12 px-4 bg-yellow-50 dark:bg-yellow-950/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">YOU STILL HERE! What the problem?</h2>
          <p className="text-2xl font-bold mb-8">
            TAX SEASON STARTS SOON. IT'S FREE WHAT ELSE DO YOU WANT! LOL. YOU STILL HAVE QUESTIONS?
            WE UNDERSTAND.
          </p>
          <Link href="/preparer/start">
            <Button
              size="lg"
              className="h-16 px-12 text-xl font-bold bg-primary hover:bg-primary/90"
            >
              Let's Do This! Start My Application
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
