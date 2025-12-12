'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Award,
  Phone,
  Clock,
  Globe,
  ChevronUp,
  ChevronDown,
  MapPin,
  Mail,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

// Default Tax Genius Pro contact info
const DEFAULT_CONTACT = {
  phone: '+14046271015',
  phoneDisplay: '+1 404-627-1015',
  address: '1632 Jonesboro Rd SE, Atlanta, GA 30315',
  addressMapUrl: 'https://maps.google.com/?q=1632+Jonesboro+Rd+SE+Atlanta+GA+30315',
  facebookUrl: 'https://www.facebook.com/Taxgeniusfb/',
  instagramUrl: 'https://www.instagram.com/taxgeniusig/',
  linkedinUrl: 'https://www.linkedin.com/company/mytaxgenius',
};

// Preparer info interface for dynamic footer
export interface FooterPreparerInfo {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  publicAddress?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
}

interface FooterProps {
  preparer?: FooterPreparerInfo | null;
}

export function Footer({ preparer }: FooterProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Use preparer data if available, otherwise fall back to defaults
  const phone = preparer?.phone || DEFAULT_CONTACT.phone;
  const phoneDisplay = preparer?.phone || DEFAULT_CONTACT.phoneDisplay;
  const email = preparer?.email;
  const address = preparer?.publicAddress || DEFAULT_CONTACT.address;
  const addressMapUrl = preparer?.publicAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(preparer.publicAddress)}`
    : DEFAULT_CONTACT.addressMapUrl;
  const facebookUrl = preparer?.facebookUrl || DEFAULT_CONTACT.facebookUrl;
  const instagramUrl = preparer?.instagramUrl || DEFAULT_CONTACT.instagramUrl;
  const linkedinUrl = preparer?.linkedinUrl || DEFAULT_CONTACT.linkedinUrl;
  const twitterUrl = preparer?.twitterUrl;
  const youtubeUrl = preparer?.youtubeUrl;
  const tiktokUrl = preparer?.tiktokUrl;

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
    <footer className="bg-card border-t pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Collapsed View - Icon Buttons Only (Mobile & Desktop) */}
      <div className={`${isCollapsed ? 'block' : 'hidden'}`}>
        <div className="container mx-auto px-4 py-3">
          {/* Expandability hint */}
          <p className="text-[10px] text-muted-foreground text-center mb-2 opacity-60">
            Tap expand for more options
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {/* Phone Icon */}
            <Link
              href={`tel:${phone}`}
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="Call Us"
            >
              <Phone className="w-5 h-5" />
            </Link>

            {/* Email Icon - Only show if preparer has email */}
            {email && (
              <Link
                href={`mailto:${email}`}
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="Email Us"
              >
                <Mail className="w-5 h-5" />
              </Link>
            )}

            {/* Location Icon */}
            <Link
              href={addressMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
              title="Location"
            >
              <MapPin className="w-5 h-5" />
            </Link>

            {/* Facebook Icon */}
            {facebookUrl && (
              <Link
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </Link>
            )}

            {/* Instagram Icon */}
            {instagramUrl && (
              <Link
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </Link>
            )}

            {/* LinkedIn Icon */}
            {linkedinUrl && (
              <Link
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Link>
            )}

            {/* Twitter/X Icon - Only show if preparer has it */}
            {twitterUrl && (
              <Link
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="Twitter/X"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
            )}

            {/* YouTube Icon - Only show if preparer has it */}
            {youtubeUrl && (
              <Link
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </Link>
            )}

            {/* TikTok Icon - Only show if preparer has it */}
            {tiktokUrl && (
              <Link
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-muted hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center"
                title="TikTok"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </Link>
            )}

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
          <div className="py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
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

            {/* Column 5 - Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Contact Us</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <Link
                      href={`tel:${phone}`}
                      className="hover:text-primary transition-colors font-medium"
                    >
                      {phoneDisplay}
                    </Link>
                  </div>
                </li>
                {email && (
                  <li className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <Link
                        href={`mailto:${email}`}
                        className="hover:text-primary transition-colors font-medium"
                      >
                        {email}
                      </Link>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="leading-relaxed">{address}</p>
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
