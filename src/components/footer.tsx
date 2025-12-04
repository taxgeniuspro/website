'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Award,
  Phone,
  Clock,
  Globe,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export function Footer() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('footer-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Toggle and save to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('footer-collapsed', String(newState));
  };

  return (
    <footer className="bg-card border-t">
      {/* Collapsed View - Icon Buttons Only (Mobile & Desktop) */}
      <div className={`${isCollapsed ? 'block' : 'hidden'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Phone Icon */}
            <Link
              href="tel:+14046271015"
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="Call Us"
            >
              <Phone className="w-5 h-5" />
            </Link>

            {/* Location Icon */}
            <Link
              href="https://maps.google.com/?q=1632+Jonesboro+Rd+SE+Atlanta+GA+30315"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="Location"
            >
              <MapPin className="w-5 h-5" />
            </Link>

            {/* Facebook Icon */}
            <Link
              href="https://www.facebook.com/Taxgeniusfb/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="Facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </Link>

            {/* Instagram Icon */}
            <Link
              href="https://www.instagram.com/taxgeniusig/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
              </svg>
            </Link>

            {/* LinkedIn Icon */}
            <Link
              href="https://www.linkedin.com/company/mytaxgenius"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </Link>

            {/* Expand Button */}
            <button
              onClick={toggleCollapsed}
              className="w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-full flex items-center justify-center"
              aria-label="Expand footer"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Footer Content - Visible When Expanded */}
      <div className={`${isCollapsed ? 'hidden' : 'block'}`}>
        <div className="container mx-auto px-4 lg:px-8">
          {/* Top Section - 5 Columns */}
          <div className="py-12 grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Column 1 - About */}
            <div className="space-y-4">
              <Image
                src="/images/wordpress-assets/taxgenius-logo.png"
                alt="Tax Genius Pro"
                width={160}
                height={40}
                className="h-10 w-auto"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professional tax preparation services with licensed CPAs. Serving individuals and
                businesses since 1999.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  IRS Authorized
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  BBB A+
                </Badge>
              </div>
            </div>

            {/* Column 2 - Services */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Services</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/services/personal"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Personal Tax Filing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/business"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Business Tax Services
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/planning"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Tax Planning & Advisory
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/audit"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Audit Protection
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/resolution"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    IRS Resolution Services
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3 - Resources */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/calculator"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Tax Calculator
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guide"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    2024 Tax Guide
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Tax Blog & Tips
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4 - Join Us */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Join Our Team</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/preparer/start"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Become a Tax Preparer
                  </Link>
                </li>
                <li>
                  <Link
                    href="/affiliate/apply"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Affiliate Program
                  </Link>
                </li>
                <li>
                  <Link
                    href="/referral"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Referral Program
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4 - Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Contact Us</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <Link
                      href="tel:+14046271015"
                      className="hover:text-primary transition-colors font-medium"
                    >
                      +1 404-627-1015
                    </Link>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="leading-relaxed">
                      1632 Jonesboro Rd SE
                      <br />
                      Atlanta, GA 30315
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>Mon-Fri: 9AM-7PM</p>
                    <p>Sat: 10AM-5PM</p>
                    <p>Sun: Closed</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section - Legal & Compliance */}
          <div className="border-t py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link href="/security" className="hover:text-primary transition-colors">
                  Security
                </Link>
                <Link href="/accessibility" className="hover:text-primary transition-colors">
                  Accessibility
                </Link>
                <div className="flex items-center gap-2">
                  <span>Theme:</span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center gap-2">
                  <span>Language:</span>
                  <LocaleSwitcher variant="compact" trackingMethod="footer_compact" />
                </div>
              </div>
              <div className="text-center md:text-right">
                <p>EFIN: 12-3456789 | IRS Registered</p>
                <p className="mt-1">© 2024 TaxGeniusPro. All rights reserved.</p>
              </div>
            </div>
          </div>

          {/* Collapse Button - When Expanded */}
          <div className="border-t py-4">
            <div className="flex justify-center">
              <button
                onClick={toggleCollapsed}
                className="flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 transition-colors rounded-full text-sm font-medium"
                aria-label="Collapse footer"
              >
                <span>Collapse Footer</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
