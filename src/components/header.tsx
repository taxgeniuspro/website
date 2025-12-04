'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Menu, ArrowRight, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { CartIcon } from '@/components/CartIcon';
import { StartTaxReturnButton } from '@/components/StartTaxReturnButton';
import { LocaleSwitcher, MobileLocaleSwitcher } from '@/components/LocaleSwitcher';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const t = useTranslations('navigation');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-white/98 dark:bg-card/98 backdrop-blur-sm shadow-sm'
          : 'bg-white/95 dark:bg-card/95 backdrop-blur-sm'
      )}
    >
      <div className="container mx-auto px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo-light-theme.png"
                alt="Tax Genius Pro"
                width={180}
                height={45}
                className="h-10 w-auto dark:hidden"
                priority
                sizes="180px"
              />
              <Image
                src="/images/logo-dark-theme.png"
                alt="Tax Genius Pro"
                width={180}
                height={45}
                className="h-10 w-auto hidden dark:block"
                priority
                sizes="180px"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 text-foreground/80 hover:text-primary hover:bg-muted/50 rounded-md transition-colors font-medium text-sm flex items-center gap-1">
                  {t('services')}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/personal-tax-filing" className="cursor-pointer">
                    {t('servicesMenu.personalTaxFiling')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/business-tax" className="cursor-pointer">
                    {t('servicesMenu.businessTaxServices')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tax-planning" className="cursor-pointer">
                    {t('servicesMenu.taxPlanningAdvisory')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/audit-protection" className="cursor-pointer">
                    {t('servicesMenu.auditProtection')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/irs-resolution" className="cursor-pointer">
                    {t('servicesMenu.irsResolutionServices')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/services" className="cursor-pointer font-semibold text-primary">
                    {t('servicesMenu.viewAllServices')} →
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Resources Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 text-foreground/80 hover:text-primary hover:bg-muted/50 rounded-md transition-colors font-medium text-sm flex items-center gap-1">
                  {t('resources')}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/tax-guide" className="cursor-pointer">
                    {t('resourcesMenu.taxGuide2024')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/blog" className="cursor-pointer">
                    {t('resourcesMenu.taxBlogTips')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="cursor-pointer">
                    {t('resourcesMenu.helpCenter')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/tax-calculator" className="cursor-pointer">
                    {t('resourcesMenu.taxCalculator')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/find-a-refund" className="cursor-pointer">
                    {t('resourcesMenu.findMyRefund')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Opportunities Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 text-foreground/80 hover:text-primary hover:bg-muted/50 rounded-md transition-colors font-medium text-sm flex items-center gap-1">
                  {t('joinUs')}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/preparer/start" className="cursor-pointer">
                    {t('joinUsMenu.becomeTaxPreparer')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/affiliate/apply" className="cursor-pointer">
                    {t('joinUsMenu.joinAsAffiliate')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/referral" className="cursor-pointer">
                    {t('joinUsMenu.referralProgram')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/about"
              className="px-4 py-2 text-foreground/80 hover:text-primary hover:bg-muted/50 rounded-md transition-colors font-medium text-sm"
            >
              {t('about')}
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 text-foreground/80 hover:text-primary hover:bg-muted/50 rounded-md transition-colors font-medium text-sm"
            >
              {t('contact')}
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            <CartIcon />
            <LocaleSwitcher variant="dropdown" showLabel={false} trackingMethod="header_dropdown" />
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/signin">{t('login')}</Link>
            </Button>
            <StartTaxReturnButton size="sm" />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 space-y-1 animate-in slide-in-from-top border-t pt-4">
            {/* Services Section */}
            <div className="px-2 py-2">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('services')}
              </p>
              <Link
                href="/personal-tax-filing"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('servicesMenu.personalTaxFiling')}
              </Link>
              <Link
                href="/business-tax"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('servicesMenu.businessTaxServices')}
              </Link>
              <Link
                href="/tax-planning"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('servicesMenu.taxPlanningAdvisory')}
              </Link>
              <Link
                href="/audit-protection"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('servicesMenu.auditProtection')}
              </Link>
              <Link
                href="/irs-resolution"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('servicesMenu.irsResolutionServices')}
              </Link>
              <Link
                href="/services"
                className="block px-4 py-2 text-sm text-primary font-semibold hover:bg-muted/50 rounded-md"
              >
                {t('servicesMenu.viewAllServices')} →
              </Link>
            </div>

            {/* Resources Section */}
            <div className="px-2 py-2">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('resources')}
              </p>
              <Link
                href="/tax-guide"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('resourcesMenu.taxGuide2024')}
              </Link>
              <Link
                href="/blog"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('resourcesMenu.taxBlogTips')}
              </Link>
              <Link
                href="/help"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('resourcesMenu.helpCenter')}
              </Link>
              <Link
                href="/tax-calculator"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('resourcesMenu.taxCalculator')}
              </Link>
              <Link
                href="/find-a-refund"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('resourcesMenu.findMyRefund')}
              </Link>
            </div>

            {/* Main Links */}
            <div className="border-t pt-2">
              <Link
                href="/about"
                className="block px-4 py-2 text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('about')}
              </Link>
              <Link
                href="/contact"
                className="block px-4 py-2 text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('contact')}
              </Link>
            </div>

            {/* Join Us Mobile Section */}
            <div className="px-2 py-2 border-t">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('joinUs')}
              </p>
              <Link
                href="/preparer/start"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('joinUsMenu.becomeTaxPreparer')}
              </Link>
              <Link
                href="/affiliate/apply"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('joinUsMenu.joinAsAffiliate')}
              </Link>
              <Link
                href="/referral"
                className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 rounded-md"
              >
                {t('joinUsMenu.referralProgram')}
              </Link>
            </div>

            <div className="flex items-center justify-center gap-4 py-3 border-t">
              <CartIcon />
              <ThemeToggle />
            </div>

            {/* Mobile Language Switcher */}
            <div className="px-2 py-3 border-t">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('mobileMenu.languageIdioma')}
              </p>
              <MobileLocaleSwitcher />
            </div>

            <div className="pt-3 space-y-2">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/auth/signin">{t('login')}</Link>
              </Button>
              <div className="w-full">
                <StartTaxReturnButton size="sm" className="w-full" />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
